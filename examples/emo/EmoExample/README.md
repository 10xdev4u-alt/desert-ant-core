# Emo Swift Example

A tiny SwiftUI app for trying Emo on Apple platforms (`EmoExample/`
holds the integration: `import Emo`, `Emo()`, live suggestions as you type).

## Run

This example ships no Xcode project. Open the `EmoExample` folder in Xcode
to browse it; to run it, create a new iOS app target (iOS 18+) and add the
`EmoExample` sources, with the `Emo` product from this repo as a dependency.
For a one-click runnable equivalent, see `TongueExample`, which ships a
`.xcodeproj`.

The first suggestion downloads the pinned Core ML model to the app cache. Later runs use the cached model offline.
