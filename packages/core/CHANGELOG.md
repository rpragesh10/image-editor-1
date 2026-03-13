# Changelog

All notable changes to `@rageshpikalmunde/rp-image-editor` will be documented in this file.

## [1.0.5] — 2026-03-13

### Added
- **Callout improvements** — complete overhaul of the callout annotation module:
  - Callout ID tracking — each callout's 5 Fabric objects tagged with unique `calloutId` and `calloutRole`
  - Text constraints — max 40 characters with ellipsis, auto word-wrap at ~15 characters
  - Min-resize clamping — box cannot shrink below the label's natural size + minimum padding
  - Mobile double-tap editing — 350ms threshold for entering inline text edit on touch devices
  - Desktop double-click editing on the background rect focuses the label for inline editing
  - Cached intrinsic label dimensions to prevent floating-point drift during repeated scaling
  - Centered label inside box during scaling (uniform scale, never shrinks below 1×)
  - Visual improvements: rounded corners (rx/ry 8), drop shadow, `#0ea5e9` accent color
  - Tail gap fix: 25px base overlap eliminates the visual gap between tail and box edge
  - Smooth tail rendering: `lineJoin: round`, `lineCap: round`, improved base proportions
- **Delete annotation** — new `deleteSelected()` API on `CalloutModule`, plus a trash button in the toolbar sub-panel when callout mode is active
- **Export cleanup** — `getResult()` now hides all callout borders/anchors before rendering, restores after
- **History fix** — `object:added` listener now checks `_rpType?.startsWith('callout')` instead of `=== 'callout'`, so callout additions properly trigger undo history saves
- **History serialization** — `calloutId` and `calloutRole` are now included in `toJSON()` for proper undo/redo

### Changed
- **Rotation** — now rotates in 45° steps (changed from 90°)
- **Lossless cumulative rotation** — rotation always operates from the original image with cumulative angle, eliminating progressive quality/size loss on repeated rotations
- **Rotation bounding box** — proper trigonometric bounding box calculation for any rotation angle (not just 90°/270°)
- **Toolbar** — `ToolbarCallbacks` interface now includes optional `onDeleteAnnotation` callback
- **CalloutOptions** — extended with optional `maxChars` and `lineBreakAt` fields

### Fixed
- Repeated rotation causing image to shrink and eventually disappear
- Tail visual gap between the triangle base and the callout box edge
- Callout additions not triggering undo history saves

## [1.0.4] — 2026-03-10

### Added
- Initial callout annotation module with draggable tail pointer
- Callout icon in the Annotate toolbar flyout
- Color picker sub-panel for callout mode

## [1.0.3] — 2026-03-08

### Added
- Grouped toolbar with flyout menus (Zoom, Transform, Annotate)
- `disabledFeatures` config to hide tools or groups

## [1.0.2] — 2026-03-05

### Added
- Text annotation module with inline editing
- Eraser tool

## [1.0.1] — 2026-03-02

### Fixed
- HEIC conversion improvements
- EXIF orientation detection

## [1.0.0] — 2026-02-28

### Added
- Initial release
- Crop, zoom, rotate, freehand draw, undo/redo, reset
- HEIC support, EXIF correction, smart resolution
- Touch gestures, theming, modal UI
- Angular, React wrappers
