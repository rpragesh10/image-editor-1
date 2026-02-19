/**
 * Draw Module — freehand drawing with configurable brush
 */
import { fabric } from 'fabric';

export class DrawModule {
  private canvas: fabric.Canvas;
  private isActive = false;
  private brushColor = '#ff0000';
  private brushWidth = 3;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Activate freehand drawing mode
   */
  activate(): void {
    this.isActive = true;
    this.canvas.isDrawingMode = true;
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = this.brushColor;
    this.canvas.freeDrawingBrush.width = this.brushWidth;
    (this.canvas.freeDrawingBrush as any).strokeLineCap = 'round';
    (this.canvas.freeDrawingBrush as any).strokeLineJoin = 'round';
  }

  /**
   * Deactivate drawing mode
   */
  deactivate(): void {
    this.isActive = false;
    this.canvas.isDrawingMode = false;
  }

  /**
   * Set brush color
   */
  setBrushColor(color: string): void {
    this.brushColor = color;
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = color;
    }
  }

  /**
   * Set brush width
   */
  setBrushWidth(width: number): void {
    this.brushWidth = Math.max(1, Math.min(50, width));
    if (this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.width = this.brushWidth;
    }
  }

  /**
   * Get current brush color
   */
  getBrushColor(): string {
    return this.brushColor;
  }

  /**
   * Get current brush width
   */
  getBrushWidth(): number {
    return this.brushWidth;
  }

  getIsActive(): boolean {
    return this.isActive;
  }
}
