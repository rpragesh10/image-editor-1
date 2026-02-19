# @rageshpikalmunde/rp-image-editor

[![npm version](https://img.shields.io/npm/v/@rageshpikalmunde/rp-image-editor.svg)](https://www.npmjs.com/package/@rageshpikalmunde/rp-image-editor)
[![npm downloads](https://img.shields.io/npm/dm/@rageshpikalmunde/rp-image-editor.svg)](https://www.npmjs.com/package/@rageshpikalmunde/rp-image-editor)
[![license](https://img.shields.io/npm/l/@rageshpikalmunde/rp-image-editor.svg)](https://github.com/rpragesh/rp-image-editor/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@rageshpikalmunde/rp-image-editor)](https://bundlephobia.com/package/@rageshpikalmunde/rp-image-editor)

> A lightweight, framework-agnostic **JavaScript image editor** built on [Fabric.js](http://fabricjs.com/). Crop, zoom, rotate, draw, add text, erase annotations, undo/redo — all in a beautiful modal UI. Works with **Angular**, **React**, **Vue**, **Ionic**, **Capacitor**, and plain JavaScript.

![rp-image-editor demo](https://raw.githubusercontent.com/rpragesh/rp-image-editor/main/demo/screenshot.png)

## Features

| Feature | Description |
|---|---|
| ✂️ **Crop** | Free crop and aspect-ratio locked crop |
| 🔍 **Zoom** | Zoom in/out with pinch-to-zoom gesture support |
| 🖐️ **Pan/Drag** | Drag image inside the viewport |
| 🔄 **Rotate** | Rotate left (−90°) and right (+90°) |
| ✏️ **Freehand Draw** | Configurable brush color & width |
| 🔤 **Add Text** | Inline editing with color and font size |
| 🧹 **Eraser** | Remove annotations without affecting the image |
| ↩️ **Undo/Redo** | Configurable stack depth (default: 20) |
| 🔁 **Reset** | Reset to original image |
| 📱 **HEIC Support** | Auto-converts iPhone HEIC photos to JPEG |
| 📐 **EXIF Orientation** | Auto-corrects rotated photos |
| ⚡ **Smart Resolution** | Auto-downscales on iOS to stay within Safari canvas limits |
| 👆 **Touch Gestures** | Pinch zoom, drag, tap on mobile |
| 🎨 **Theming** | Fully customizable colors for header, footer, buttons, toolbar |
| 📦 **Output** | Base64, Blob, and File object |

## Installation

```bash
npm install @rageshpikalmunde/rp-image-editor
```

## Quick Start

### Vanilla JavaScript / TypeScript

```typescript
import { openEditorModal } from '@rageshpikalmunde/rp-image-editor';

const fileInput = document.querySelector<HTMLInputElement>('#fileInput');

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const result = await openEditorModal({
    image: file,
    config: {
      exportFormat: 'jpeg',
      exportQuality: 0.92,
      theme: {
        headerTitle: 'Edit Photo',
        applyButtonBackground: '#4a90d9',
      },
    },
  });

  if (result) {
    console.log(result.file);   // File object — upload via FormData
    console.log(result.base64); // data:image/jpeg;base64,...
    console.log(result.blob);   // Blob
  }
});
```

### Angular / Ionic

```typescript
import { openEditorModal } from '@rageshpikalmunde/rp-image-editor';

// Or use the ImageEditorService wrapper for centralized config:
// import { ImageEditorService } from './services/image-editor.service';

async onFileSelected(file: File) {
  const result = await openEditorModal({
    image: file,
    config: { exportFormat: 'jpeg', exportQuality: 0.92 },
  });

  if (result) {
    // Upload result.file to your backend
  }
}
```

### React

```tsx
import { openEditorModal } from '@rageshpikalmunde/rp-image-editor';

function ImageUploader() {
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await openEditorModal({
      image: file,
      config: { exportFormat: 'jpeg' },
    });

    if (result) {
      // Use result.file, result.base64, or result.blob
    }
  };

  return <input type="file" accept="image/*" onChange={handleFile} />;
}
```

## Programmatic API (Advanced)

```typescript
import { RpImageEditor } from '@rageshpikalmunde/rp-image-editor';

const container = document.getElementById('editor-container');
const editor = new RpImageEditor(container, {
  exportFormat: 'png',
  maxUndoSteps: 30,
  defaultBrushColor: '#ff0000',
  showToolbar: true,
});

await editor.loadImage(file);

// Control the editor programmatically
editor.setMode('draw');
editor.zoomIn();
editor.rotate(90);

// Export
const result = await editor.getResult();
console.log(result.file);

// Clean up
editor.destroy();
```

## Configuration

```typescript
interface RpEditorConfig {
  maxResolution?: number | null;    // Max image resolution (auto-detect per platform)
  cropAspectRatios?: CropAspectRatio[];
  exportFormat?: 'png' | 'jpeg';   // Default: 'jpeg'
  exportQuality?: number;          // 0.0–1.0, Default: 0.92
  exportPixelRatio?: number;       // 1 = standard, 2 = retina. Default: 1
  maxUndoSteps?: number;           // Default: 20
  defaultBrushColor?: string;      // Default: '#ff0000'
  defaultBrushWidth?: number;      // Default: 3
  defaultTextColor?: string;       // Default: '#ff0000'
  defaultTextFontSize?: number;    // Default: 24
  colorPalette?: string[];
  showToolbar?: boolean;           // Default: true
  theme?: RpEditorTheme;
  locale?: string;
}
```

## Theming

```typescript
const result = await openEditorModal({
  image: file,
  config: {
    theme: {
      headerBackground: '#1a1a2e',
      headerTextColor: '#ffffff',
      headerTitle: 'Edit Image',
      editorBackground: '#000000',
      toolbarBackground: '#1a1a2e',
      toolbarIconColor: '#cccccc',
      toolbarActiveIconColor: '#4a90d9',
      footerBackground: '#1a1a2e',
      applyButtonBackground: '#4a90d9',
      applyButtonTextColor: '#ffffff',
      cancelButtonBackground: 'transparent',
      cancelButtonTextColor: '#ffffff',
      modalBorderRadius: '12px',
      buttonBorderRadius: '6px',
    },
  },
});
```

## Browser Support

| Browser | Version |
|---|---|
| Chrome | 60+ |
| Firefox | 60+ |
| Safari | 12+ |
| Edge | 79+ |
| iOS Safari | 12+ |
| Android Chrome | 60+ |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on [GitHub](https://github.com/rpragesh/rp-image-editor).

## License

[MIT](./LICENSE) © [Ragesh Pikalmunde](https://github.com/rpragesh)
