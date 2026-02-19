/**
 * Build script to copy/generate CSS file
 */
const fs = require('fs');
const path = require('path');

const css = `
/* rp-image-editor styles */

.rp-editor-modal-backdrop {
  position: fixed; top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.6);
  z-index: 99998;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box;
}

.rp-editor-modal {
  width: 100%; max-width: 960px;
  height: 90vh; max-height: 700px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.rp-editor-canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.rp-editor-canvas-wrapper canvas {
  display: block;
}

.rp-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 8px;
  flex-wrap: wrap;
}

.rp-editor-tool-btn {
  width: 40px; height: 40px;
  padding: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.rp-editor-tool-btn:hover {
  background: rgba(255,255,255,0.1);
}

.rp-editor-tool-btn svg {
  width: 22px; height: 22px;
}

.rp-color-swatch {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.rp-color-swatch:hover {
  transform: scale(1.15);
}

/* Mobile responsive */
@media (max-width: 600px) {
  .rp-editor-modal {
    max-width: 100%;
    max-height: 100%;
    height: 100vh;
    border-radius: 0 !important;
  }

  .rp-editor-modal-backdrop {
    padding: 0;
  }

  .rp-editor-tool-btn {
    width: 36px; height: 36px;
    padding: 6px;
  }

  .rp-editor-tool-btn svg {
    width: 18px; height: 18px;
  }
}

/* Prevent rubber-banding on iOS */
.rp-editor-modal-body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}
`;

const distDir = path.join(__dirname, '..', 'dist', 'styles');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'rp-image-editor.css'), css.trim());
console.log('CSS built: dist/styles/rp-image-editor.css');
