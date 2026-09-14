import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Tongue } from "../dist/index.js";
import { Weights } from "../dist/model.js";
import { UsageTurnstile } from "../dist/usage.js";

// Repeat-answer cache: identical inputs must skip the pipeline but never skip
// billing. Each test counts rank runs by wrapping the prototype, so a memo
// placed above usage.record() — or a key missing topK — fails loudly here.
const here = dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(await readFile(join(here, "..", "dist", "tongue_meta.json"), "utf8"));
const weightBytes = async () =>
  new Uint8Array(await readFile(join(here, "..", "dist", "tongue_int8.bin")));

async function rankRuns(fn) {
  const orig = Weights.prototype.rank;
  let n = 0;
  Weights.prototype.rank = function (...args) {
    n++;
    return orig.apply(this, args);
  };
  try {
    await fn();
    return n;
  } finally {
    Weights.prototype.rank = orig;
  }
}

test("repeat detects skip the pipeline", async () => {
  const tongue = Tongue.fromBytes(meta, await weightBytes());
  const n = await rankRuns(async () => {
    const a = tongue.detect("kann ich das haben");
    const b = tongue.detect("kann ich das haben");
    const c = tongue.detect("kann ich das haben");
    assert.deepEqual(b, a);
    assert.deepEqual(c, a);
  });
  assert.equal(n, 1, `rank ran ${n}x for 3 identical detects`);
});

test("usage.record fires on cache hits", async () => {
  // A fake turnstile: no network, no store. Proves detect() invokes record()
  // per call even when the answer comes from cache — moving record() below
  // the lookup would silently under-report monthly active usage.
  let records = 0;
  const origCreate = UsageTurnstile.create;
  UsageTurnstile.create = () => ({
    record() {
      records++;
    },
  });
  try {
    const tongue = Tongue.fromBytes(meta, await weightBytes());
    tongue.detect("kann ich das haben");
    tongue.detect("kann ich das haben");
    tongue.detect("anderer text hier");
    assert.equal(records, 3, `record fired ${records}x, expected 3`);
  } finally {
    UsageTurnstile.create = origCreate;
  }
});

test("topK rides the cache key", async () => {
  const tongue = Tongue.fromBytes(meta, await weightBytes());
  const k1 = tongue.detect("kann ich das haben", 1);
  const k3 = tongue.detect("kann ich das haben", 3);
  assert.equal(k1.candidates.length, 1);
  assert.ok(k3.candidates.length >= 1 && k3.candidates.length <= 3);
  assert.equal(k1.language, k3.language);
});

test("eviction is FIFO at the cap", async () => {
  const tongue = Tongue.fromBytes(meta, await weightBytes(), 2);
  const n = await rankRuns(async () => {
    tongue.detect("kann ich das haben");
    tongue.detect("muchas gracias por la ayuda");
    tongue.detect("je voudrais un café au lait");
    tongue.detect("kann ich das haben");
  });
  assert.equal(n, 4, `rank ran ${n}x, expected 4 (first entry evicted)`);
});

test("cache:false disables the cache", async () => {
  const tongue = Tongue.fromBytes(meta, await weightBytes(), false);
  const n = await rankRuns(async () => {
    tongue.detect("kann ich das haben");
    tongue.detect("kann ich das haben");
  });
  assert.equal(n, 2);
});

test("caller mutation cannot poison the cache", async () => {
  const tongue = Tongue.fromBytes(meta, await weightBytes());
  const a = tongue.detect("kann ich das haben");
  a.candidates.push({ language: "xx", probability: 1 });
  const b = tongue.detect("kann ich das haben");
  assert.ok(!b.candidates.some((c) => c.language === "xx"));
});
