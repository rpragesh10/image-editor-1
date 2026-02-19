/**
 * Text Module — add and edit text annotations on the canvas
 */
import { fabric } from 'fabric';

export class TextModule {
  private canvas: fabric.Canvas;
  private textColor = '#ff0000';
  private fontSize = 24;
  private fontFamily = 'Arial, Helvetica, sans-serif';
  private isActive = false;
  private pendingTextAdd = false;

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /**
   * Activate text mode — next tap on canvas adds text
   */
  activate(): void {
    this.isActive = true;
    this.pendingTextAdd = true;
    this.canvas.isDrawingMode = false;
    this.canvas.defaultCursor = 'text';

    // Listen for click to place text
    this.canvas.on('mouse:down', this.handleCanvasClick);
  }

  /**
   * Deactivate text mode
   */
  deactivate(): void {
    this.isActive = false;
    this.pendingTextAdd = false;
    this.canvas.defaultCursor = 'default';
    this.canvas.off('mouse:down', this.handleCanvasClick);
  }

  /**
   * Add text at a specific position (or center of canvas)
   */
  addText(options?: {
    text?: string;
    color?: string;
    fontSize?: number;
    left?: number;
    top?: number;
  }): fabric.IText {
    const text = new fabric.IText(options?.text || 'Text', {
      left: options?.left ?? this.canvas.getWidth() / 2 - 50,
      top: options?.top ?? this.canvas.getHeight() / 2 - 15,
      fontSize: options?.fontSize || this.fontSize,
      fontFamily: this.fontFamily,
      fill: options?.color || this.textColor,
      editable: true,
      selectable: true,
      cornerColor: '#4a90d9',
      cornerStyle: 'circle',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#4a90d9',
      hasRotatingPoint: true,
      padding: 5,
    });

    (text as any)._rpAnnotation = true;
    (text as any)._rpType = 'text';

    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.renderAll();

    // Enter editing mode immediately
    text.enterEditing();

    return text;
  }

  /**
   * Set text color (for new text)
   */
  setTextColor(color: string): void {
    this.textColor = color;

    // Update currently selected text object if any
    const active = this.canvas.getActiveObject();
    if (active && active.type === 'i-text') {
      (active as fabric.IText).set('fill', color);
      this.canvas.renderAll();
    }
  }

  /**
   * Set font size (for new text)
   */
  setFontSize(size: number): void {
    this.fontSize = Math.max(8, Math.min(200, size));

    const active = this.canvas.getActiveObject();
    if (active && active.type === 'i-text') {
      (active as fabric.IText).set('fontSize', this.fontSize);
      this.canvas.renderAll();
    }
  }

  getTextColor(): string {
    return this.textColor;
  }

  getFontSize(): number {
    return this.fontSize;
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  private handleCanvasClick = (opt: fabric.IEvent): void => {
    if (!this.pendingTextAdd) return;

    // Don't add text if clicking on an existing object
    if (opt.target) return;

    const pointer = this.canvas.getPointer(opt.e);
    this.addText({
      left: pointer.x,
      top: pointer.y,
    });

    this.pendingTextAdd = false;
    // Stay in text mode — user can click again to add more text
    setTimeout(() => {
      this.pendingTextAdd = true;
    }, 300);
  };
}
