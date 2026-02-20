/**
 * Toolbar UI — renders a vanilla HTML toolbar with SVG icons
 */
import { ICONS } from './icons.js';
import { EditorMode, RpEditorTheme, CropAspectRatio } from '../types/index.js';

export interface ToolbarCallbacks {
  onModeChange: (mode: EditorMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onColorChange: (color: string) => void;
  onBrushWidthChange: (width: number) => void;
  onCropRatioChange: (ratio: number | null) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
}

export class Toolbar {
  private container: HTMLElement;
  private theme: RpEditorTheme;
  private colorPalette: string[];
  private cropRatios: CropAspectRatio[];
  private callbacks: ToolbarCallbacks;
  private activeMode: EditorMode = 'move';
  private toolbarEl: HTMLElement | null = null;
  private subPanelEl: HTMLElement | null = null;
  private canUndoState = false;
  private canRedoState = false;

  constructor(
    container: HTMLElement,
    theme: RpEditorTheme,
    colorPalette: string[],
    cropRatios: CropAspectRatio[],
    callbacks: ToolbarCallbacks
  ) {
    this.container = container;
    this.theme = theme;
    this.colorPalette = colorPalette;
    this.cropRatios = cropRatios;
    this.callbacks = callbacks;
  }

  /**
   * Render the toolbar into the container
   */
  render(): void {
    this.toolbarEl = document.createElement('div');
    this.toolbarEl.className = 'rp-editor-toolbar';
    this.toolbarEl.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 10px 8px;
      background: ${this.theme.toolbarBackground || '#2d2d2d'};
      flex-wrap: wrap;
    `;

    // Sub-panel for contextual controls (colors, crop ratios, brush width)
    this.subPanelEl = document.createElement('div');
    this.subPanelEl.className = 'rp-editor-subpanel';
    this.subPanelEl.style.cssText = `
      display: none;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      background: ${this.theme.toolbarBackground || '#2d2d2d'};
      flex-wrap: wrap;
      border-top: 1px solid rgba(255,255,255,0.1);
    `;

    const buttons: { icon: string; mode?: EditorMode; action?: string; title: string }[] = [
      { icon: 'move', mode: 'move', title: 'Move / Pan' },
      { icon: 'crop', mode: 'crop', title: 'Crop' },
      { icon: 'zoomIn', action: 'zoomIn', title: 'Zoom In' },
      { icon: 'zoomOut', action: 'zoomOut', title: 'Zoom Out' },
      { icon: 'rotateLeft', action: 'rotateLeft', title: 'Rotate Left' },
      { icon: 'rotateRight', action: 'rotateRight', title: 'Rotate Right' },
      { icon: 'draw', mode: 'draw', title: 'Draw' },
      { icon: 'text', mode: 'text', title: 'Add Text' },
      { icon: 'eraser', mode: 'eraser', title: 'Eraser' },
      { icon: 'undo', action: 'undo', title: 'Undo' },
      { icon: 'redo', action: 'redo', title: 'Redo' },
      { icon: 'reset', action: 'reset', title: 'Reset' },
    ];

    buttons.forEach((btn) => {
      const el = this.createToolButton(btn.icon, btn.title, btn.mode, btn.action);
      this.toolbarEl!.appendChild(el);
    });

    this.container.appendChild(this.subPanelEl);
    this.container.appendChild(this.toolbarEl);
    this.updateActiveButton();
  }

  /**
   * Update the undo/redo button states
   */
  updateHistoryState(canUndo: boolean, canRedo: boolean): void {
    this.canUndoState = canUndo;
    this.canRedoState = canRedo;

    const undoBtn = this.toolbarEl?.querySelector('[data-action="undo"]') as HTMLElement;
    const redoBtn = this.toolbarEl?.querySelector('[data-action="redo"]') as HTMLElement;

    if (undoBtn) {
      undoBtn.style.opacity = canUndo ? '1' : '0.3';
      undoBtn.style.pointerEvents = canUndo ? 'auto' : 'none';
    }
    if (redoBtn) {
      redoBtn.style.opacity = canRedo ? '1' : '0.3';
      redoBtn.style.pointerEvents = canRedo ? 'auto' : 'none';
    }
  }

  /**
   * Set the active mode (highlights the button)
   */
  setActiveMode(mode: EditorMode): void {
    this.activeMode = mode;
    this.updateActiveButton();
    this.updateSubPanel();
  }

  /**
   * Clean up DOM
   */
  destroy(): void {
    if (this.toolbarEl) {
      this.toolbarEl.remove();
      this.toolbarEl = null;
    }
    if (this.subPanelEl) {
      this.subPanelEl.remove();
      this.subPanelEl = null;
    }
  }

  private createToolButton(
    iconKey: string,
    title: string,
    mode?: EditorMode,
    action?: string
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'rp-editor-tool-btn';
    btn.title = title;
    btn.innerHTML = (ICONS as any)[iconKey] || '';

    if (mode) {
      btn.dataset.mode = mode;
    }
    if (action) {
      btn.dataset.action = action;
    }

    btn.style.cssText = `
      width: 40px;
      height: 40px;
      padding: 8px;
      border: none;
      background: transparent;
      color: ${this.theme.toolbarIconColor || '#ffffff'};
      cursor: pointer;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, color 0.2s;
      -webkit-tap-highlight-color: transparent;
    `;

    btn.querySelector('svg')?.setAttribute('width', '22');
    btn.querySelector('svg')?.setAttribute('height', '22');

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleButtonClick(mode, action);
    });

    // Hover effect
    btn.addEventListener('mouseenter', () => {
      if (!(mode && this.activeMode === mode)) {
        btn.style.background = 'rgba(255,255,255,0.1)';
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (!(mode && this.activeMode === mode)) {
        btn.style.background = 'transparent';
      }
    });

    return btn;
  }

  private handleButtonClick(mode?: EditorMode, action?: string): void {
    if (mode) {
      this.activeMode = mode;
      this.callbacks.onModeChange(mode);
      this.updateActiveButton();
      this.updateSubPanel();
    } else if (action) {
      switch (action) {
        case 'zoomIn': this.callbacks.onZoomIn(); break;
        case 'zoomOut': this.callbacks.onZoomOut(); break;
        case 'rotateLeft': this.callbacks.onRotateLeft(); break;
        case 'rotateRight': this.callbacks.onRotateRight(); break;
        case 'undo': this.callbacks.onUndo(); break;
        case 'redo': this.callbacks.onRedo(); break;
        case 'reset': this.callbacks.onReset(); break;
      }
    }
  }

  private updateActiveButton(): void {
    if (!this.toolbarEl) return;

    const buttons = this.toolbarEl.querySelectorAll('.rp-editor-tool-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      const isActive = el.dataset.mode === this.activeMode;
      el.style.background = isActive
        ? (this.theme.toolbarActiveIconColor || '#4a90d9')
        : 'transparent';
      el.style.color = isActive
        ? '#ffffff'
        : (this.theme.toolbarIconColor || '#ffffff');
    });
  }

  private updateSubPanel(): void {
    if (!this.subPanelEl) return;

    this.subPanelEl.innerHTML = '';
    this.subPanelEl.style.display = 'none';

    if (this.activeMode === 'draw' || this.activeMode === 'text') {
      this.showColorPicker();
    } else if (this.activeMode === 'crop') {
      this.showCropRatioSelector();
    }
  }

  private showColorPicker(): void {
    if (!this.subPanelEl) return;
    this.subPanelEl.style.display = 'flex';

    // Color swatches
    this.colorPalette.forEach((color) => {
      const swatch = document.createElement('button');
      swatch.className = 'rp-color-swatch';
      swatch.style.cssText = `
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.3);
        background: ${color};
        cursor: pointer;
        padding: 0;
        -webkit-tap-highlight-color: transparent;
        transition: transform 0.15s, border-color 0.15s;
      `;

      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        this.callbacks.onColorChange(color);

        // Update selection visual
        this.subPanelEl!.querySelectorAll('.rp-color-swatch').forEach((s) => {
          (s as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
          (s as HTMLElement).style.transform = 'scale(1)';
        });
        swatch.style.borderColor = '#ffffff';
        swatch.style.transform = 'scale(1.2)';
      });

      this.subPanelEl!.appendChild(swatch);
    });

    // Brush width slider (only for draw mode)
    if (this.activeMode === 'draw') {
      const separator = document.createElement('div');
      separator.style.cssText = 'width: 1px; height: 24px; background: rgba(255,255,255,0.2); margin: 0 8px;';
      this.subPanelEl.appendChild(separator);

      const label = document.createElement('span');
      label.textContent = 'Size:';
      label.style.cssText = `color: ${this.theme.toolbarIconColor || '#fff'}; font-size: 12px;`;
      this.subPanelEl.appendChild(label);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '20';
      slider.value = '3';
      slider.style.cssText = 'width: 80px; cursor: pointer;';
      slider.addEventListener('input', () => {
        this.callbacks.onBrushWidthChange(parseInt(slider.value, 10));
      });
      this.subPanelEl.appendChild(slider);
    }
  }

  private showCropRatioSelector(): void {
    if (!this.subPanelEl) return;
    this.subPanelEl.style.display = 'flex';

    this.cropRatios.forEach((ratio, idx) => {
      const btn = document.createElement('button');
      btn.textContent = ratio.label;
      btn.style.cssText = `
        padding: 6px 12px;
        border: 1px solid rgba(255,255,255,0.3);
        background: ${idx === 0 ? (this.theme.toolbarActiveIconColor || '#4a90d9') : 'transparent'};
        color: ${this.theme.toolbarIconColor || '#ffffff'};
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        -webkit-tap-highlight-color: transparent;
      `;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.callbacks.onCropRatioChange(ratio.value);

        // Update active state
        this.subPanelEl!.querySelectorAll('button').forEach((b) => {
          if (!b.classList.contains('rp-crop-action-btn')) {
            (b as HTMLElement).style.background = 'transparent';
          }
        });
        btn.style.background = this.theme.toolbarActiveIconColor || '#4a90d9';
      });

      this.subPanelEl!.appendChild(btn);
    });

    // Apply Crop button
    const applyCropBtn = document.createElement('button');
    applyCropBtn.textContent = '✓ Apply Crop';
    applyCropBtn.className = 'rp-crop-action-btn';
    applyCropBtn.style.cssText = `
      padding: 6px 14px;
      border: none;
      background: ${this.theme.applyButtonBackground || '#4a90d9'};
      color: ${this.theme.applyButtonTextColor || '#ffffff'};
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    `;
    applyCropBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.callbacks.onApplyCrop();
    });
    this.subPanelEl!.appendChild(applyCropBtn);

    // Cancel Crop button
    const cancelCropBtn = document.createElement('button');
    cancelCropBtn.textContent = '✕ Cancel';
    cancelCropBtn.className = 'rp-crop-action-btn';
    cancelCropBtn.style.cssText = `
      padding: 6px 14px;
      border: 1px solid rgba(255,255,255,0.3);
      background: transparent;
      color: ${this.theme.toolbarIconColor || '#ffffff'};
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    cancelCropBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.callbacks.onCancelCrop();
    });
    this.subPanelEl!.appendChild(cancelCropBtn);
  }
}
