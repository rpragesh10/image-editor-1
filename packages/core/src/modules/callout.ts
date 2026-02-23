/**
 * Callout Module — add callout annotations with an editable label and a
 * draggable tail pointer (like markerjs CalloutMarker).
 *
 * Architecture (all separate Fabric objects, no Group):
 *   1. tailImage  — filled triangle rendered via off-screen canvas
 *   2. bgRect     — colored rounded rectangle behind the text
 *   3. border     — dashed selection border around bgRect
 *   4. label      — fabric.IText so the user can double-click to edit
 *   5. anchor     — small draggable circle at the tail tip
 *
 * Moving the rect drags border + label along and redraws the tail.
 * Moving the anchor redraws only the tail.
 * Double-clicking the box enters text editing mode.
 */
import { fabric } from 'fabric';

export interface CalloutOptions {
  text?: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
  left?: number;
  top?: number;
  anchorLeft?: number;
  anchorTop?: number;
}

/** Internal bookkeeping for one callout on the canvas */
interface CalloutHandle {
  bgRect: fabric.Rect;
  border: fabric.Rect;
  label: fabric.IText;
  anchor: fabric.Circle;
  tailCanvas: HTMLCanvasElement;
  tailImage: fabric.Image;
  color: string;
  paddingH: number;
  paddingV: number;
}

export class CalloutModule {
  private canvas: fabric.Canvas;
  private isActive = false;
  private pendingAdd = false;
  private calloutColor = '#ff0000';
  private calloutTextColor = '#ffffff';
  private fontSize = 20;
  private callouts: CalloutHandle[] = [];

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  /* ═══════════════════ public API ═══════════════════ */

  activate(): void {
    this.isActive = true;
    this.pendingAdd = true;
    this.canvas.isDrawingMode = false;
    this.canvas.defaultCursor = 'crosshair';
    this.canvas.on('mouse:down', this.handleCanvasClick);
  }

  deactivate(): void {
    this.isActive = false;
    this.pendingAdd = false;
    this.canvas.defaultCursor = 'default';
    this.canvas.off('mouse:down', this.handleCanvasClick);
  }

  setColor(color: string): void {
    this.calloutColor = color;
  }

  setTextColor(color: string): void {
    this.calloutTextColor = color;
  }

  setFontSize(size: number): void {
    this.fontSize = Math.max(8, Math.min(200, size));
  }

  getIsActive(): boolean {
    return this.isActive;
  }

  /* ═══════════════════ addCallout ═══════════════════ */

  addCallout(opts?: CalloutOptions): void {
    const color = opts?.color || this.calloutColor;
    const textColor = opts?.textColor || this.calloutTextColor;
    const fontSize = opts?.fontSize || this.fontSize;
    const labelText = opts?.text || 'Label';

    const paddingH = 14;
    const paddingV = 8;

    // ── 1. Editable label (IText) — measure first ──
    const label = new fabric.IText(labelText, {
      fontSize,
      fontFamily: 'Arial, Helvetica, sans-serif',
      fill: textColor,
      originX: 'left',
      originY: 'top',
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
      editable: true,
      padding: 0,
    });

    const textW = label.getScaledWidth();
    const textH = label.getScaledHeight();
    const rectW = textW + paddingH * 2;
    const rectH = textH + paddingV * 2;

    // Box position
    const boxLeft = opts?.left ?? this.canvas.getWidth() / 2 - rectW / 2;
    const boxTop = opts?.top ?? this.canvas.getHeight() / 2 - rectH / 2 - 50;

    // ── 2. Background rect ──
    const bgRect = new fabric.Rect({
      left: boxLeft,
      top: boxTop,
      width: rectW,
      height: rectH,
      fill: color,
      rx: 4,
      ry: 4,
      originX: 'left',
      originY: 'top',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: false,
      cornerColor: '#4a90d9',
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      lockRotation: true,
      hoverCursor: 'move',
    });
    (bgRect as any)._rpAnnotation = true;
    (bgRect as any)._rpType = 'callout-box';

    // ── 3. Dashed border ──
    const borderPad = 3;
    const border = new fabric.Rect({
      left: boxLeft - borderPad,
      top: boxTop - borderPad,
      width: rectW + borderPad * 2,
      height: rectH + borderPad * 2,
      fill: 'transparent',
      stroke: '#ffffff',
      strokeDashArray: [5, 3],
      strokeWidth: 1.5,
      rx: 5,
      ry: 5,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    });
    (border as any)._rpAnnotation = true;
    (border as any)._rpType = 'callout-border';

    // Position the label inside the rect
    label.set({
      left: boxLeft + paddingH,
      top: boxTop + paddingV,
    });
    (label as any)._rpAnnotation = true;
    (label as any)._rpType = 'callout-label';

    // ── 4. Anchor (tail tip) ──
    const anchorLeft = opts?.anchorLeft ?? boxLeft + rectW * 0.3;
    const anchorTop = opts?.anchorTop ?? boxTop + rectH + 80;

    const anchor = new fabric.Circle({
      radius: 7,
      fill: '#4a90d9',
      stroke: '#ffffff',
      strokeWidth: 2,
      left: anchorLeft,
      top: anchorTop,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      hoverCursor: 'move',
    });
    (anchor as any)._rpAnnotation = true;
    (anchor as any)._rpType = 'callout-anchor';

    // ── 5. Tail — off-screen canvas rendered as fabric.Image ──
    const tailCanvas = document.createElement('canvas');
    tailCanvas.width = this.canvas.getWidth();
    tailCanvas.height = this.canvas.getHeight();

    const tailImage = new fabric.Image(tailCanvas, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    });
    (tailImage as any)._rpAnnotation = true;
    (tailImage as any)._rpType = 'callout-tail';

    // ── Build handle ──
    const handle: CalloutHandle = {
      bgRect, border, label, anchor,
      tailCanvas, tailImage,
      color, paddingH, paddingV,
    };
    this.callouts.push(handle);

    // ── Add objects in z-order: tail → border → rect → label → anchor ──
    this.canvas.add(tailImage);
    this.canvas.add(border);
    this.canvas.add(bgRect);
    this.canvas.add(label);
    this.canvas.add(anchor);

    // Initial tail draw
    this.redrawTail(handle);

    // ── Wire up events ──

    // Dragging the box → move border + label along, redraw tail
    bgRect.on('moving', () => {
      this.syncBoxParts(handle);
      this.redrawTail(handle);
    });

    bgRect.on('scaling', () => {
      this.syncBoxParts(handle);
      this.redrawTail(handle);
    });

    // Dragging the anchor → just redraw tail
    anchor.on('moving', () => {
      this.redrawTail(handle);
    });

    label.on('changed', () => {
      this.resizeBoxToFitLabel(handle);
      this.redrawTail(handle);
    });

    // Double-click on box → enter text editing
    bgRect.on('mousedblclick', () => {
      this.canvas.setActiveObject(label);
      label.enterEditing();
      label.selectAll();
      this.canvas.renderAll();
    });

    // Show/hide border + anchor based on selection
    const showControls = () => {
      border.set({ visible: true });
      anchor.set({ visible: true });
      this.canvas.renderAll();
    };
    const hideControls = () => {
      border.set({ visible: false });
      anchor.set({ visible: false });
      this.canvas.renderAll();
    };

    bgRect.on('selected', showControls);
    label.on('selected', showControls);
    anchor.on('selected', showControls);

    bgRect.on('deselected', hideControls);
    label.on('deselected', hideControls);
    label.on('editing:exited', () => {
      this.resizeBoxToFitLabel(handle);
      this.redrawTail(handle);
      // Hide controls after a short delay to allow re-selection
      setTimeout(() => {
        const active = this.canvas.getActiveObject();
        if (active !== bgRect && active !== label && active !== anchor) {
          hideControls();
        }
      }, 100);
    });
    anchor.on('deselected', () => {
      // Only hide if nothing else in this callout is selected
      setTimeout(() => {
        const active = this.canvas.getActiveObject();
        if (active !== bgRect && active !== label && active !== anchor) {
          hideControls();
        }
      }, 100);
    });

    // Auto-focus label for editing so user can immediately type
    border.set({ visible: true });
    anchor.set({ visible: true });
    this.canvas.setActiveObject(label);
    label.enterEditing();
    label.selectAll();
    this.canvas.renderAll();
  }

  /* ═══════════════ private helpers ═══════════════════ */

  /** Keep border + label in sync with bgRect position/size */
  private syncBoxParts(h: CalloutHandle): void {
    const { bgRect, border, label, paddingH, paddingV } = h;
    const bLeft = bgRect.left || 0;
    const bTop = bgRect.top || 0;
    const sx = bgRect.scaleX || 1;
    const sy = bgRect.scaleY || 1;
    const rw = (bgRect.width || 0) * sx;
    const rh = (bgRect.height || 0) * sy;

    const borderPad = 3;
    border.set({
      left: bLeft - borderPad,
      top: bTop - borderPad,
      width: rw + borderPad * 2,
      height: rh + borderPad * 2,
      scaleX: 1,
      scaleY: 1,
    });
    border.setCoords();

    label.set({
      left: bLeft + paddingH * sx,
      top: bTop + paddingV * sy,
      scaleX: sx,
      scaleY: sy,
    });
    label.setCoords();
  }

  /** After text edit, resize bgRect + border to fit the new label */
  private resizeBoxToFitLabel(h: CalloutHandle): void {
    const { bgRect, border, label, paddingH, paddingV } = h;
    const tw = label.getScaledWidth();
    const th = label.getScaledHeight();
    const newW = tw + paddingH * 2;
    const newH = th + paddingV * 2;

    const bLeft = bgRect.left || 0;
    const bTop = bgRect.top || 0;

    bgRect.set({ width: newW, height: newH, scaleX: 1, scaleY: 1 });
    bgRect.setCoords();

    const borderPad = 3;
    border.set({
      left: bLeft - borderPad,
      top: bTop - borderPad,
      width: newW + borderPad * 2,
      height: newH + borderPad * 2,
      scaleX: 1,
      scaleY: 1,
    });
    border.setCoords();

    label.set({ left: bLeft + paddingH, top: bTop + paddingV });
    label.setCoords();

    this.canvas.renderAll();
  }

  /**
   * Redraw the tail triangle from the rect edge to the anchor point.
   * Uses ray-rect intersection so the tail exits from the correct edge
   * regardless of where the anchor is (below, above, left, right).
   */
  private redrawTail(h: CalloutHandle): void {
    const { bgRect, anchor, tailCanvas, tailImage, color } = h;

    const canvasW = this.canvas.getWidth();
    const canvasH = this.canvas.getHeight();

    if (tailCanvas.width !== canvasW || tailCanvas.height !== canvasH) {
      tailCanvas.width = canvasW;
      tailCanvas.height = canvasH;
    }

    const ctx = tailCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Box geometry
    const bLeft = bgRect.left || 0;
    const bTop = bgRect.top || 0;
    const sx = bgRect.scaleX || 1;
    const sy = bgRect.scaleY || 1;
    const rw = (bgRect.width || 0) * sx;
    const rh = (bgRect.height || 0) * sy;

    const boxCX = bLeft + rw / 2;
    const boxCY = bTop + rh / 2;

    const aX = anchor.left || 0;
    const aY = anchor.top || 0;

    // Direction to anchor
    const dx = aX - boxCX;
    const dy = aY - boxCY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      // Anchor inside box — no tail
      tailImage.setElement(tailCanvas as any);
      tailImage.set({ dirty: true });
      this.canvas.renderAll();
      return;
    }

    // Perpendicular for the base width
    const perpX = -dy / dist;
    const perpY = dx / dist;
    const baseHalf = Math.min(rw * 0.12, 14);

    // Where the tail exits the rect edge
    const edgePoint = this.rayRectIntersection(
      boxCX, boxCY, dx, dy, bLeft, bTop, rw, rh
    );

    const base1X = edgePoint.x + perpX * baseHalf;
    const base1Y = edgePoint.y + perpY * baseHalf;
    const base2X = edgePoint.x - perpX * baseHalf;
    const base2Y = edgePoint.y - perpY * baseHalf;

    // Draw the filled triangle
    ctx.beginPath();
    ctx.moveTo(base1X, base1Y);
    ctx.lineTo(base2X, base2Y);
    ctx.lineTo(aX, aY);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    tailImage.setElement(tailCanvas as any);
    tailImage.set({ dirty: true });

    // Z-order: tail behind box parts, base image behind everything
    tailImage.sendToBack();
    const baseImg = this.canvas.getObjects().find((o: any) => o._rpBaseImage);
    if (baseImg) baseImg.sendToBack();

    this.canvas.renderAll();
  }

  /**
   * Find where a ray from (ox,oy) in direction (dx,dy) exits the rect.
   */
  private rayRectIntersection(
    ox: number, oy: number,
    dx: number, dy: number,
    rx: number, ry: number,
    rw: number, rh: number
  ): { x: number; y: number } {
    let tMin = Infinity;
    let hitX = ox;
    let hitY = oy;

    const checks = [
      { t: dy !== 0 ? (ry - oy) / dy : Infinity },           // top
      { t: dy !== 0 ? (ry + rh - oy) / dy : Infinity },      // bottom
      { t: dx !== 0 ? (rx - ox) / dx : Infinity },            // left
      { t: dx !== 0 ? (rx + rw - ox) / dx : Infinity },       // right
    ];

    for (const c of checks) {
      if (c.t > 0.001 && c.t < tMin) {
        const px = ox + dx * c.t;
        const py = oy + dy * c.t;
        if (px >= rx - 1 && px <= rx + rw + 1 && py >= ry - 1 && py <= ry + rh + 1) {
          tMin = c.t;
          hitX = px;
          hitY = py;
        }
      }
    }

    return { x: hitX, y: hitY };
  }

  /** Canvas click handler — place a new callout */
  private handleCanvasClick = (opt: fabric.IEvent): void => {
    if (!this.pendingAdd) return;
    if (opt.target) return;

    const pointer = this.canvas.getPointer(opt.e);
    this.addCallout({
      left: pointer.x - 60,
      top: pointer.y - 100,
      anchorLeft: pointer.x,
      anchorTop: pointer.y,
    });

    this.pendingAdd = false;
    // Don't re-enable — user must click the Callout toolbar button again to add another
  };
}
