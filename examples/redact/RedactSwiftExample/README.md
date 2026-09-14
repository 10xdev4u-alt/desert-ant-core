# Redact Swift Example

A tiny SwiftUI app for trying Redact on Apple platforms (`RedactExample/`
holds the integration: `import Redact`, `Redact()`, `redaction(of:)`).

## Run

This example ships no Xcode project. Open the `RedactSwiftExample` folder in
Xcode to browse it; to run it, create a new iOS app target (iOS 18+) and add
the `RedactExample` sources, with the `Redact` product from this repo as a
dependency. For a one-click runnable equivalent, see `TongueExample`, which
ships a `.xcodeproj`.

The first redaction downloads the pinned Core ML model to the app cache. Later runs use the cached model offline.
