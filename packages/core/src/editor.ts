/**
 * RpImageEditor — Main editor class
 * Orchestrates the Fabric.js canvas with all editing modules
 */
import { fabric } from 'fabric';
import {
  RpEditorConfig,
  RpEditorResult,
  RpEditorEvents,
  EditorMode,
  LoadedImageInfo,
  RpEditorTheme,
} from './types';
import { mergeConfig } from './utils/defaults';
import { EventEmitter } from './utils/event-emitter';
import { processImage } from './utils/image-processing';
import { isTouchDevice } from './utils/platform';
import { CropModule } from './modules/crop';
import { DrawModule } from './modules/draw';
import { TextModule } from './modules/text';
import { EraserModule } from './modules/eraser';
import { HistoryModule } from './modules/history';
import { Toolbar, ToolbarCallbacks } from './ui/toolbar';

export class RpImageEditor extends EventEmitter<RpEditorEvents> {
  private config: ReturnType<typeof mergeConfig>;
  private container: HTMLElement;
  private wrapperEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private fabricCanvas: fabric.Canvas | null = null;
  private baseImage: fabric.Image | null = null;
  private originalImageBlob: Blob | null = null;
  private imageInfo: LoadedImageInfo | null = null;

  // Modules
  private cropModule: CropModule | null = null;
  private drawModule: DrawModule | null = null;
  private textModule: TextModule | null = null;
  private eraserModule: EraserModule | null = null;
  private historyModule: HistoryModule | null = null;
  private toolbar: Toolbar | null = null;

  // State
  private currentMode: EditorMode = 'move';
  private zoomLevel = 1;
  private isPanning = false;
  private lastPanX = 0;
  private lastPanY = 0;
  private isDestroyed = false;

  // Touch gesture state
  private lastPinchDistance = 0;

  constructor(container: HTMLElement, config?: Partial<RpEditorConfig>) {
    super();
    this.container = container;
    this.config = mergeConfig(config);
  }

  /**
   * Load an image into the editor
   */
  async loadImage(source: File | Blob | string): Promise<void> {
    try {
      // Store original blob for reset
      if (source instanceof Blob) {
        this.originalImageBlob = source;
      } else if (typeof source === 'string') {
        const resp = await fetch(source);
        this.originalImageBlob = await resp.blob();
      }

      // Process image (HEIC, EXIF, downscale)
      const { dataUrl, info } = await processImage(source, this.config.maxResolution);
      this.imageInfo = info;

      // Initialize canvas
      this.initializeCanvas();

      // Load image into Fabric.js
      await this.loadImageOntoCanvas(dataUrl);

      // Initialize modules
      this.initializeModules();

      // Render toolbar
      if (this.config.showToolbar) {
        this.renderToolbar();
      }

      // Save initial state for undo
      this.historyModule?.initialize();

      // Emit loaded event
      this.emit('image:loaded', {
        width: info.processedWidth,
        height: info.processedHeight,
        downscaled: info.wasDownscaled,
      });
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  /**
   * Set the editor mode
   */
  setMode(mode: EditorMode): void {
    // Deactivate current mode
    this.deactivateCurrentMode();

    this.currentMode = mode;

    // Activate new mode
    switch (mode) {
      case 'move':
        this.activateMoveMode();
        break;
      case 'crop':
        this.activateCropMode();
        break;
      case 'draw':
        this.drawModule?.activate();
        break;
      case 'text':
        this.textModule?.activate();
        break;
      case 'eraser':
        this.eraserModule?.activate();
        break;
    }

    this.toolbar?.setActiveMode(mode);
    this.emit('mode:changed', mode);
  }

  /**
   * Zoom in
   */
  zoomIn(factor: number = 1.15): void {
    this.setZoom(this.zoomLevel * factor);
  }

  /**
   * Zoom out
   */
  zoomOut(factor: number = 1.15): void {
    this.setZoom(this.zoomLevel / factor);
  }

  /**
   * Set zoom level
   */
  setZoom(level: number): void {
    const clampedLevel = Math.max(0.1, Math.min(5, level));
    this.zoomLevel = clampedLevel;

    if (this.fabricCanvas) {
      const center = this.fabricCanvas.getCenter();
      this.fabricCanvas.zoomToPoint(
        new fabric.Point(center.left, center.top),
        clampedLevel
      );
      this.fabricCanvas.renderAll();
    }

    this.emit('zoom:changed', clampedLevel);
  }

  /**
   * Rotate left (−90°)
   */
  async rotateLeft(): Promise<void> {
    await this.rotate(-90);
  }

  /**
   * Rotate right (+90°)
   */
  async rotateRight(): Promise<void> {
    await this.rotate(90);
  }

  /**
   * Undo last action
   */
  async undo(): Promise<void> {
    await this.historyModule?.undo();
    this.refreshBaseImageRef();
  }

  /**
   * Redo last undone action
   */
  async redo(): Promise<void> {
    await this.historyModule?.redo();
    this.refreshBaseImageRef();
  }

  /**
   * Reset to original image
   */
  async reset(): Promise<void> {
    if (!this.originalImageBlob || !this.fabricCanvas) return;

    // Re-process and reload original
    const { dataUrl } = await processImage(this.originalImageBlob, this.config.maxResolution);
    this.fabricCanvas.clear();
    await this.loadImageOntoCanvas(dataUrl);
    this.zoomLevel = 1;
    this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.historyModule?.initialize();
    this.setMode('move');
  }

  /**
   * Set brush/text color
   */
  setColor(color: string): void {
    this.drawModule?.setBrushColor(color);
    this.textModule?.setTextColor(color);
  }

  /**
   * Set brush width
   */
  setBrushWidth(width: number): void {
    this.drawModule?.setBrushWidth(width);
  }

  /**
   * Get the edited result
   */
  async getResult(): Promise<RpEditorResult> {
    if (!this.fabricCanvas) {
      throw new Error('Editor not initialized');
    }

    // Deactivate current mode to clean up overlays
    this.deactivateCurrentMode();

    const format = this.config.exportFormat;
    const quality = this.config.exportQuality;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const multiplier = this.config.exportPixelRatio;

    // Save current viewport state so we can restore after export
    const currentVPT = this.fabricCanvas.viewportTransform?.slice();
    const currentZoom = this.fabricCanvas.getZoom();
    const currentBgColor = this.fabricCanvas.backgroundColor;

    // Reset zoom and viewport for export
    this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.fabricCanvas.setZoom(1);

    // Determine the image region bounds from the base image
    let imgLeft = 0;
    let imgTop = 0;
    let imgDisplayW = this.fabricCanvas.getWidth();
    let imgDisplayH = this.fabricCanvas.getHeight();

    if (this.baseImage) {
      const scaleX = (this.baseImage as any).scaleX || 1;
      const scaleY = (this.baseImage as any).scaleY || 1;
      imgLeft = (this.baseImage as any).left || 0;
      imgTop = (this.baseImage as any).top || 0;
      imgDisplayW = (this.baseImage.width || imgDisplayW) * scaleX;
      imgDisplayH = (this.baseImage.height || imgDisplayH) * scaleY;
    }

    // Use an offscreen canvas to render ONLY the image region.
    // This avoids any Fabric.js toDataURL quirks that include extra canvas padding.
    const offW = Math.round(imgDisplayW * multiplier);
    const offH = Math.round(imgDisplayH * multiplier);
    const offscreen = document.createElement('canvas');
    offscreen.width = offW;
    offscreen.height = offH;
    const offCtx = offscreen.getContext('2d')!;

    // Fill background: white for JPEG (no transparency), transparent for PNG
    if (format === 'jpeg') {
      offCtx.fillStyle = '#ffffff';
      offCtx.fillRect(0, 0, offW, offH);
    }

    // Temporarily hide canvas background so it doesn't get baked in
    this.fabricCanvas.backgroundColor = 'transparent';
    this.fabricCanvas.renderAll();

    // Render the Fabric canvas onto the offscreen canvas, offset so only
    // the image region is captured (no surrounding canvas padding).
    offCtx.save();
    offCtx.scale(multiplier, multiplier);
    offCtx.translate(-imgLeft, -imgTop);
    (this.fabricCanvas as any).renderCanvas(
      offCtx,
      this.fabricCanvas.getObjects(),
    );
    offCtx.restore();

    // Get the base64 from the clean offscreen canvas
    const base64 = offscreen.toDataURL(mimeType, quality);

    // Clean up offscreen canvas
    offscreen.width = 1;
    offscreen.height = 1;

    // Convert base64 to blob
    const blob = await this.base64ToBlob(base64, mimeType);

    // Create File object
    const fileName = `edited_image_${Date.now()}.${format}`;
    const file = new File([blob], fileName, { type: mimeType });

    // Restore background color and viewport
    this.fabricCanvas.backgroundColor = currentBgColor;
    if (currentVPT) {
      this.fabricCanvas.setViewportTransform(currentVPT);
    }
    this.fabricCanvas.setZoom(currentZoom);
    this.fabricCanvas.renderAll();

    const result: RpEditorResult = {
      base64,
      blob,
      file,
      width: offW,
      height: offH,
      format,
    };

    this.emit('image:exported', result);
    return result;
  }

  /**
   * Destroy the editor and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
    this.deactivateCurrentMode();
    this.toolbar?.destroy();
    this.fabricCanvas?.dispose();
    this.removeAllListeners();

    if (this.wrapperEl) {
      this.wrapperEl.innerHTML = '';
      this.wrapperEl.remove();
    }

    this.fabricCanvas = null;
    this.baseImage = null;
    this.originalImageBlob = null;
    this.cropModule = null;
    this.drawModule = null;
    this.textModule = null;
    this.eraserModule = null;
    this.historyModule = null;
    this.toolbar = null;
  }

  /**
   * Get current mode
   */
  getMode(): EditorMode {
    return this.currentMode;
  }

  /**
   * Get current zoom level
   */
  getZoomLevel(): number {
    return this.zoomLevel;
  }

  // ───────────────────────── Private ─────────────────────────

  private initializeCanvas(): void {
    // Create wrapper — this fills the available space and provides the background
    this.wrapperEl = document.createElement('div');
    this.wrapperEl.className = 'rp-editor-canvas-wrapper';
    this.wrapperEl.style.cssText = `
      width: 100%;
      flex: 1;
      position: relative;
      overflow: hidden;
      background: ${this.config.theme.editorBackground || '#e0e0e0'};
      touch-action: none;
      -webkit-user-select: none;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Create canvas element — will be sized to the image after loading
    this.canvasEl = document.createElement('canvas');
    this.canvasEl.id = `rp-canvas-${Date.now()}`;
    this.wrapperEl.appendChild(this.canvasEl);

    // Insert before toolbar area
    this.container.insertBefore(this.wrapperEl, this.container.firstChild);

    // Start with a reasonable default; will be resized to image in loadImageOntoCanvas
    const rect = this.wrapperEl.getBoundingClientRect();
    const canvasW = Math.floor(rect.width) || 800;
    const canvasH = Math.floor(rect.height) || 500;

    // Initialize Fabric.js canvas
    this.fabricCanvas = new fabric.Canvas(this.canvasEl, {
      width: canvasW,
      height: canvasH,
      backgroundColor: 'transparent',
      selection: false,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      allowTouchScrolling: false,
    });

    // Setup touch/mouse event handlers
    this.setupGestureHandlers();

    // Handle resize
    this.setupResizeObserver();
  }

  private async loadImageOntoCanvas(dataUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(dataUrl, (img: fabric.Image) => {
        if (!img || !this.fabricCanvas || !this.wrapperEl) {
          reject(new Error('Failed to load image onto canvas'));
          return;
        }

        // Mark as base image (not an annotation)
        (img as any)._rpBaseImage = true;
        img.selectable = false;
        img.evented = false;

        // Calculate the available space in the wrapper
        const wrapperRect = this.wrapperEl.getBoundingClientRect();
        const availW = Math.floor(wrapperRect.width) || 800;
        const availH = Math.floor(wrapperRect.height) || 500;
        const imgW = img.width || availW;
        const imgH = img.height || availH;

        // Scale image to fit within the available area (uniform scale)
        const scale = Math.min(availW / imgW, availH / imgH, 1);
        const displayW = Math.round(imgW * scale);
        const displayH = Math.round(imgH * scale);

        // Resize the Fabric canvas to exactly match the scaled image
        this.fabricCanvas.setWidth(displayW);
        this.fabricCanvas.setHeight(displayH);

        // Place image at origin with explicit scaleX/scaleY (avoid
        // scaleToWidth/scaleToHeight which both do uniform scaling
        // and the second call overrides the first).
        img.set({
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          scaleX: displayW / imgW,
          scaleY: displayH / imgH,
        });

        // Remove old base image if exists
        const oldBase = this.fabricCanvas.getObjects().find(
          (o: any) => o._rpBaseImage
        );
        if (oldBase) {
          this.fabricCanvas.remove(oldBase);
        }

        this.baseImage = img;
        this.fabricCanvas.add(img);
        img.sendToBack();
        this.fabricCanvas.renderAll();
        resolve();
      }, { crossOrigin: 'anonymous' });
    });
  }

  private initializeModules(): void {
    if (!this.fabricCanvas) return;

    this.cropModule = new CropModule(this.fabricCanvas);
    this.drawModule = new DrawModule(this.fabricCanvas);
    this.textModule = new TextModule(this.fabricCanvas);
    this.eraserModule = new EraserModule(this.fabricCanvas);
    this.historyModule = new HistoryModule(this.fabricCanvas, this.config.maxUndoSteps);

    // Set defaults from config
    this.drawModule.setBrushColor(this.config.defaultBrushColor);
    this.drawModule.setBrushWidth(this.config.defaultBrushWidth);
    this.textModule.setTextColor(this.config.defaultTextColor);
    this.textModule.setFontSize(this.config.defaultTextFontSize);

    // Listen for drawing completion to save undo state
    this.fabricCanvas.on('path:created', () => {
      // Mark drawn paths as annotations
      const objects = this.fabricCanvas!.getObjects();
      objects.forEach((obj: any) => {
        if (obj.type === 'path' && !obj._rpBaseImage && !obj._rpAnnotation) {
          obj._rpAnnotation = true;
          obj._rpType = 'draw';
        }
      });
      this.historyModule?.saveState();
    });

    // Listen for text editing completion
    this.fabricCanvas.on('text:editing:exited', () => {
      this.historyModule?.saveState();
    });

    // Listen for object modifications
    this.fabricCanvas.on('object:modified', () => {
      this.historyModule?.saveState();
    });

    // Listen for object removal (eraser)
    this.fabricCanvas.on('object:removed', (e: any) => {
      if (e.target?._rpAnnotation) {
        this.historyModule?.saveState();
      }
    });

    // Setup history change notifications
    this.historyModule.onChange((state) => {
      this.toolbar?.updateHistoryState(state.canUndo, state.canRedo);
      this.emit('history:changed', state);
    });
  }

  private renderToolbar(): void {
    if (!this.config.showToolbar) return;

    const toolbarContainer = document.createElement('div');
    toolbarContainer.className = 'rp-editor-toolbar-container';
    this.container.appendChild(toolbarContainer);

    const callbacks: ToolbarCallbacks = {
      onModeChange: (mode) => this.setMode(mode),
      onZoomIn: () => this.zoomIn(),
      onZoomOut: () => this.zoomOut(),
      onRotateLeft: () => this.rotateLeft(),
      onRotateRight: () => this.rotateRight(),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onReset: () => this.reset(),
      onColorChange: (color) => this.setColor(color),
      onBrushWidthChange: (width) => this.setBrushWidth(width),
      onCropRatioChange: (ratio) => {
        this.cropModule?.setAspectRatio(ratio);
      },
      onApplyCrop: () => this.applyCrop(),
      onCancelCrop: () => {
        this.cropModule?.deactivate();
        this.setMode('move');
      },
    };

    this.toolbar = new Toolbar(
      toolbarContainer,
      this.config.theme,
      this.config.colorPalette,
      this.config.cropAspectRatios,
      callbacks
    );
    this.toolbar.render();
  }

  private deactivateCurrentMode(): void {
    this.drawModule?.deactivate();
    this.textModule?.deactivate();
    this.eraserModule?.deactivate();

    if (this.fabricCanvas) {
      this.fabricCanvas.isDrawingMode = false;
      this.fabricCanvas.defaultCursor = 'default';
      this.fabricCanvas.selection = false;
    }
  }

  private activateMoveMode(): void {
    if (!this.fabricCanvas) return;
    this.fabricCanvas.defaultCursor = 'grab';
    // Enable panning
    this.isPanning = false;
  }

  private activateCropMode(): void {
    if (!this.baseImage) return;
    this.cropModule?.activate(this.baseImage);
  }

  private async applyCrop(): Promise<void> {
    const result = this.cropModule?.applyCrop();
    if (result && this.fabricCanvas) {
      // Reload the cropped image — canvas will be resized to new image dims
      this.fabricCanvas.clear();
      this.fabricCanvas.backgroundColor = 'transparent';
      await this.loadImageOntoCanvas(result.dataUrl);
      this.zoomLevel = 1;
      this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      this.historyModule?.saveState();
      this.setMode('move');
    }
  }

  private async rotate(degrees: number): Promise<void> {
    if (!this.fabricCanvas) return;

    // Export current state to a flat image (image region only, no background)
    this.deactivateCurrentMode();
    this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    this.fabricCanvas.setZoom(1);

    // Temporarily strip background so it's not baked in
    const savedBg = this.fabricCanvas.backgroundColor;
    this.fabricCanvas.backgroundColor = 'transparent';

    // Crop to image region only (exclude any canvas padding)
    let cropLeft = 0;
    let cropTop = 0;
    let cropW = this.fabricCanvas.getWidth();
    let cropH = this.fabricCanvas.getHeight();
    if (this.baseImage) {
      cropLeft = (this.baseImage as any).left || 0;
      cropTop = (this.baseImage as any).top || 0;
      const sx = (this.baseImage as any).scaleX || 1;
      const sy = (this.baseImage as any).scaleY || 1;
      cropW = (this.baseImage.width || cropW) * sx;
      cropH = (this.baseImage.height || cropH) * sy;
    }
    const dataUrl = this.fabricCanvas.toDataURL({
      format: 'png',
      left: cropLeft,
      top: cropTop,
      width: cropW,
      height: cropH,
    });
    this.fabricCanvas.backgroundColor = savedBg;

    // Load the flattened image, rotate, and reload
    const img = await this.loadHtmlImage(dataUrl);
    const rotCanvas = document.createElement('canvas');
    const isSwap = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

    rotCanvas.width = isSwap ? img.height : img.width;
    rotCanvas.height = isSwap ? img.width : img.height;
    const ctx = rotCanvas.getContext('2d')!;
    ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const rotatedDataUrl = rotCanvas.toDataURL('image/png');
    rotCanvas.width = 1;
    rotCanvas.height = 1;

    // Reload — canvas will be resized to new rotated image dimensions
    this.fabricCanvas.clear();
    this.fabricCanvas.backgroundColor = 'transparent';
    await this.loadImageOntoCanvas(rotatedDataUrl);
    this.zoomLevel = 1;
    this.fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

    this.historyModule?.saveState();
    this.setMode('move');
  }

  private setupGestureHandlers(): void {
    if (!this.fabricCanvas) return;

    const canvas = this.fabricCanvas;

    // Mouse/touch panning in move mode
    canvas.on('mouse:down', (opt: fabric.IEvent<MouseEvent>) => {
      if (this.currentMode === 'move' && !opt.target) {
        this.isPanning = true;
        const e = opt.e as any;
        this.lastPanX = e.clientX || e.touches?.[0]?.clientX || 0;
        this.lastPanY = e.clientY || e.touches?.[0]?.clientY || 0;
        canvas.defaultCursor = 'grabbing';
      }
    });

    canvas.on('mouse:move', (opt: fabric.IEvent<MouseEvent>) => {
      if (this.isPanning && this.currentMode === 'move') {
        const e = opt.e as any;
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

        const deltaX = clientX - this.lastPanX;
        const deltaY = clientY - this.lastPanY;

        const vpt = canvas.viewportTransform!;
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        canvas.setViewportTransform(vpt);

        this.lastPanX = clientX;
        this.lastPanY = clientY;
      }
    });

    canvas.on('mouse:up', () => {
      this.isPanning = false;
      if (this.currentMode === 'move') {
        canvas.defaultCursor = 'grab';
      }
    });

    // Scroll wheel zoom
    canvas.on('mouse:wheel', (opt: fabric.IEvent<WheelEvent>) => {
      const delta = (opt.e as WheelEvent).deltaY;
      let newZoom = this.zoomLevel * (delta > 0 ? 0.95 : 1.05);
      newZoom = Math.max(0.1, Math.min(5, newZoom));

      const pointer = canvas.getPointer(opt.e, true);
      canvas.zoomToPoint(new fabric.Point(pointer.x, pointer.y), newZoom);
      this.zoomLevel = newZoom;
      this.emit('zoom:changed', newZoom);

      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Touch gesture handling (pinch to zoom)
    if (isTouchDevice()) {
      this.setupTouchGestures();
    }
  }

  private setupTouchGestures(): void {
    const upperCanvas = this.fabricCanvas?.getElement()?.parentElement;
    if (!upperCanvas) return;

    let activeTouches: Touch[] = [];

    upperCanvas.addEventListener('touchstart', (e: TouchEvent) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 2) {
        this.lastPinchDistance = this.getTouchDistance(activeTouches[0], activeTouches[1]);
        e.preventDefault();
      }
    }, { passive: false });

    upperCanvas.addEventListener('touchmove', (e: TouchEvent) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 2 && this.fabricCanvas) {
        const dist = this.getTouchDistance(activeTouches[0], activeTouches[1]);
        if (this.lastPinchDistance > 0) {
          const scale = dist / this.lastPinchDistance;
          const newZoom = Math.max(0.1, Math.min(5, this.zoomLevel * scale));

          const midX = (activeTouches[0].clientX + activeTouches[1].clientX) / 2;
          const midY = (activeTouches[0].clientY + activeTouches[1].clientY) / 2;

          const rect = upperCanvas.getBoundingClientRect();
          const canvasX = midX - rect.left;
          const canvasY = midY - rect.top;

          this.fabricCanvas.zoomToPoint(new fabric.Point(canvasX, canvasY), newZoom);
          this.zoomLevel = newZoom;
          this.emit('zoom:changed', newZoom);
        }
        this.lastPinchDistance = dist;
        e.preventDefault();
      }
    }, { passive: false });

    upperCanvas.addEventListener('touchend', () => {
      this.lastPinchDistance = 0;
    });
  }

  private getTouchDistance(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private setupResizeObserver(): void {
    if (!this.wrapperEl || !this.fabricCanvas) return;

    const resizeObserver = new ResizeObserver(() => {
      if (this.isDestroyed || !this.wrapperEl || !this.fabricCanvas || !this.baseImage) return;

      const rect = this.wrapperEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // Recalculate the image fit within the new wrapper size
        const availW = Math.floor(rect.width);
        const availH = Math.floor(rect.height);
        const imgW = this.baseImage.width || availW;
        const imgH = this.baseImage.height || availH;
        const scale = Math.min(availW / imgW, availH / imgH, 1);
        const displayW = Math.round(imgW * scale);
        const displayH = Math.round(imgH * scale);

        this.fabricCanvas.setWidth(displayW);
        this.fabricCanvas.setHeight(displayH);

        // Reposition and rescale the base image with explicit scaleX/scaleY
        this.baseImage.set({
          left: 0,
          top: 0,
          scaleX: displayW / imgW,
          scaleY: displayH / imgH,
        });

        this.fabricCanvas.renderAll();
      }
    });

    resizeObserver.observe(this.wrapperEl);
  }

  private refreshBaseImageRef(): void {
    if (!this.fabricCanvas) return;
    this.baseImage = this.fabricCanvas.getObjects().find(
      (o: any) => o._rpBaseImage
    ) as fabric.Image || null;
  }

  private loadHtmlImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  private async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const response = await fetch(base64);
    return response.blob();
  }
}
