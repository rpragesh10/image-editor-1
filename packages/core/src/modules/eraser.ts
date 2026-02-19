/**
 * Eraser Module — erase annotations (drawings and text)
 * Uses object-tap-to-delete approach for reliability across platforms
 */
import { fabric } from 'fabric';

export class EraserModule {
  private canvas: fabric.Canvas;
  private isActive = false;
  private eraserWidth = 20;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Activate eraser mode — tapping on an annotation object removes it
   */
  activate(): void {
    this.isActive = true;
    this.canvas.isDrawingMode = false;
    this.canvas.defaultCursor = 'crosshair';
    this.canvas.selection = false;

    // Make all annotation objects selectable but with delete-on-click behavior
    this.canvas.getObjects().forEach((obj: any) => {
      if (obj._rpAnnotation) {
        obj.selectable = true;
        obj.evented = true;
        obj.hoverCursor = 'pointer';
      }
    });

    this.canvas.on('mouse:down', this.handleEraserClick);
  }

  /**
   * Deactivate eraser mode
   */
  deactivate(): void {
    this.isActive = false;
    this.canvas.defaultCursor = 'default';
    this.canvas.selection = true;
    this.canvas.off('mouse:down', this.handleEraserClick);
  }

  /**
   * Set eraser brush width (visual indicator on hover)
   */
  setEraserWidth(width: number): void {
    this.eraserWidth = Math.max(5, Math.min(100, width));
  }

  getEraserWidth(): number {
    return this.eraserWidth;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  private handleEraserClick = (opt: fabric.IEvent): void => {
    if (!this.isActive) return;

    const target = opt.target as any;
    if (target && target._rpAnnotation) {
      // Remove the annotation object
      this.canvas.remove(target);
      this.canvas.renderAll();
    }
  };
}
