# @rageshpikalmunde/rp-image-editor

A lightweight, framework-agnostic image editor plugin built with Fabric.js.

## Features

- **Free crop** and aspect-ratio locked crop
- **Zoom in/out** with pinch-to-zoom gesture support
- **Drag/pan** image inside the viewport
- **Rotate** left (−90°) and right (+90°)
- **Freehand draw** with configurable brush color & width
- **Add text** with inline editing, color, and font size
- **Eraser** tool for removing annotations
- **Undo/Redo** with configurable stack depth
- **Reset** to original image
- **HEIC support** — auto-converts iPhone HEIC to JPEG
- **EXIF orientation** — auto-corrects rotated photos
- **Smart resolution** — auto-downscales on iOS to stay within Safari canvas limits
- **Touch gestures** — pinch zoom, drag, tap on mobile
- **Theming** — fully customizable colors for header, footer, buttons, toolbar
- **Output** — Base64, Blob, and File object

## Packages

| Package | Description |
|---|---|
| `@rageshpikalmunde/rp-image-editor` | Core engine (vanilla TS + Fabric.js) |
| `@rageshpikalmunde/rp-image-editor-angular` | Angular wrapper (Ionic modal) |
| `@rageshpikalmunde/rp-image-editor-react` | React wrapper (Ionic modal) |

## Quick Start (Angular)

```bash
npm install @rageshpikalmunde/rp-image-editor @rageshpikalmunde/rp-image-editor-angular
```

```typescript
// app.module.ts
import { RpImageEditorModule } from '@rageshpikalmunde/rp-image-editor-angular';

@NgModule({
  imports: [RpImageEditorModule]
})
export class AppModule {}
```

```typescript
// your-component.ts
import { RpImageEditorService } from '@rageshpikalmunde/rp-image-editor-angular';

constructor(private rpEditor: RpImageEditorService) {}

async editImage(file: File) {
  const result = await this.rpEditor.openEditor(file, {
    theme: {
      applyButtonBackground: '#4a90d9',
      headerTitle: 'Edit Photo'
    }
  });
  if (result) {
    console.log(result.file);   // File object — upload to server
    console.log(result.base64); // data:image/png;base64,...
  }
}
```

## License

MIT
