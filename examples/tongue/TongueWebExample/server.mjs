// Minimal dev server for the browser example: serves this directory, and maps
// /tongue/* onto the built package so the page loads the real dist output.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "..", "packages", "tongue-node", "dist");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json",
                ".bin": "application/octet-stream" };

createServer(async (request, response) => {
  const raw = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    response.writeHead(400).end("bad request path\n");
    return;
  }
  const root = decoded.startsWith("/tongue/") ? dist : here;
  const rel = decoded.startsWith("/tongue/") ? decoded.slice(8) : decoded.slice(1);
  const file = join(root, rel);
  // Contain every request inside its root: join() normalizes `..`, so an
  // escape attempt lands outside and is refused instead of served.
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end("forbidden: outside the served directory\n");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end(`not found: ${path}\n(did you run \`npm run build\` in packages/tongue-node?)`);
  }
}).listen(8710, () => console.log("browser example: http://localhost:8710"));
