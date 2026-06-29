/**
 * Shape Module — interactive drawing of predefined shapes:
 *   • Circle    — perfect circle (uniform scaling enforced)
 *   • Ellipse   — independent width / height
 *   • Square    — perfect square (uniform scaling enforced)
 *   • Rectangle — independent width / height
 *   • Arrow     — line with arrowhead, endpoints individually editable
 *
 * Behaviour:
 *   1. activate(type) puts the canvas into drag-to-draw mode for that
 *      shape. The user presses-and-drags to size the shape; on mouseup
 *      the shape is finalised, registered as an `_rpAnnotation`, and
 *      selected so resize handles are visible immediately.
 *   2. All shapes are stored as plain Fabric objects so they participate
 *      in undo / redo, JSON serialisation and the standard eraser flow.
 *   3. Circle and Square lock uniform scaling so the user can only resize
 *      them proportionally — they can never be turned into ellipses /
 *      rectangles.
 *   4. The Arrow uses a custom `fabric.Object` subclass with two custom
 *      control handles at the start- and end-points so the user can
 *      drag either tip to reshape the arrow (changing its direction and
 *      length). The whole arrow can still be dragged to reposition.
 *
 * The module does NOT modify anything outside its own state; it only
 * registers / un-registers a few canvas listeners during the active
 * draw-gesture.
 */
import { fabric } from 'fabric';
import { ShapeType } from '../types/index.js';

/* ------------------------------------------------------------------ */
/*  Arrow — custom Fabric object                                      */
/* ------------------------------------------------------------------ */

/**
 * Internal arrow object — extends fabric.Object with two endpoints
 * (x1, y1) and (x2, y2) expressed in **canvas coordinates** (the same
 * coordinate system as `left` / `top`). The bounding box is recomputed
 * from the endpoints on every change.
 */
export interface RpArrow extends fabric.Object {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    arrowheadSize: number;
    _updateBBox(): void;
}

const ARROW_TYPE = 'rpArrow';

/** Lazily registered so we only patch fabric once per page-load */
let arrowClassRegistered = false;

function registerArrowClass(): any {
    if (arrowClassRegistered && (fabric as any).RpArrow) {
        return (fabric as any).RpArrow;
    }

    const RpArrowClass = (fabric as any).util.createClass(fabric.Object, {
        type: ARROW_TYPE,

        initialize(this: any, options: any) {
            options = options || {};
            this.callSuper('initialize', options);
            this.x1 = options.x1 ?? 0;
            this.y1 = options.y1 ?? 0;
            this.x2 = options.x2 ?? 0;
            this.y2 = options.y2 ?? 0;
            this.arrowheadSize = options.arrowheadSize ?? 14;
            this.objectCaching = false;
            this._lastLeft = 0;
            this._lastTop = 0;
            this._updateBBox();
        },

        /**
         * Recompute the axis-aligned bounding box from the endpoints and
         * sync the parent left/top/width/height accordingly. Always called
         * after the endpoints change.
         */
        _updateBBox(this: any) {
            const minX = Math.min(this.x1, this.x2);
            const minY = Math.min(this.y1, this.y2);
            const maxX = Math.max(this.x1, this.x2);
            const maxY = Math.max(this.y1, this.y2);
            // Pad bbox slightly so the arrowhead never gets clipped from hit-testing
            const pad = (this.strokeWidth || 2) + (this.arrowheadSize || 14);
            this.set({
                left: minX - pad,
                top: minY - pad,
                width: Math.max(maxX - minX + pad * 2, 1),
                height: Math.max(maxY - minY + pad * 2, 1),
                scaleX: 1,
                scaleY: 1,
                angle: 0,
            });
            this._lastLeft = this.left;
            this._lastTop = this.top;
            this.setCoords();
        },

        /**
         * Render the arrow inside Fabric's translated/centred context.
         * Fabric translates the ctx so (0,0) is the object's centre, hence
         * we convert canvas-space endpoints into local-space relative to
         * the bbox centre.
         */
        _render(this: any, ctx: CanvasRenderingContext2D) {
            const cx = (this.x1 + this.x2) / 2;
            const cy = (this.y1 + this.y2) / 2;

            const sx = this.x1 - cx;
            const sy = this.y1 - cy;
            const ex = this.x2 - cx;
            const ey = this.y2 - cy;

            const dx = ex - sx;
            const dy = ey - sy;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len < 0.5) return;

            const angle = Math.atan2(dy, dx);
            const stroke = this.stroke || '#ff0000';
            const sw = this.strokeWidth || 3;
            const headLen = Math.max(this.arrowheadSize || 14, sw * 3);
            const headHalfW = headLen * 0.55;

            // Stop the shaft short so it meets the arrowhead's BASE, not its tip
            const baseX = ex - Math.cos(angle) * headLen;
            const baseY = ey - Math.sin(angle) * headLen;

            ctx.save();
            ctx.lineWidth = sw;
            ctx.strokeStyle = stroke;
            ctx.fillStyle = stroke;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Shaft
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(baseX, baseY);
            ctx.stroke();

            // Arrowhead — isoceles triangle whose tip is at (ex, ey)
            const perpX = -Math.sin(angle);
            const perpY = Math.cos(angle);
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(baseX + perpX * headHalfW, baseY + perpY * headHalfW);
            ctx.lineTo(baseX - perpX * headHalfW, baseY - perpY * headHalfW);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        },

        /** Serialise the endpoints so undo / redo can reproduce the arrow */
        toObject(this: any, propertiesToInclude?: string[]) {
            return this.callSuper(
                'toObject',
                ['x1', 'y1', 'x2', 'y2', 'arrowheadSize', '_rpAnnotation', '_rpType', '_rpShapeType']
                    .concat(propertiesToInclude || []),
            );
        },
    });

    // Re-hydrate from JSON (used by the history module on undo/redo)
    RpArrowClass.fromObject = function (object: any, callback: any) {
        const arrow = new RpArrowClass(object);
        if (callback) callback(arrow);
        return arrow;
    };
    RpArrowClass.async = false;

    (fabric as any).RpArrow = RpArrowClass;
    arrowClassRegistered = true;
    return RpArrowClass;
}

/* ------------------------------------------------------------------ */
/*  Endpoint controls for the arrow                                   */
/* ------------------------------------------------------------------ */

/**
 * Render a small circular handle at (left, top) — matches the visual
 * style of the standard corner handles already used elsewhere in the
 * editor.
 */
function renderEndpointHandle(
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
): void {
    const r = 6;
    ctx.save();
    ctx.fillStyle = '#0ea5e9';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(left, top, r, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

/**
 * Build the two custom endpoint controls and attach them to the arrow
 * instance (Fabric supports per-instance `controls` in v5+).
 */
function attachArrowEndpointControls(arrow: any): void {
    const startControl = new (fabric as any).Control({
        x: 0,
        y: 0,
        cursorStyleHandler: () => 'crosshair',
        actionName: 'arrowStart',
        positionHandler(_dim: any, _finalMatrix: any, fabricObject: any) {
            return new fabric.Point(fabricObject.x1, fabricObject.y1);
        },
        actionHandler(_eventData: any, transform: any, x: number, y: number) {
            const t = transform.target as any;
            t.x1 = x;
            t.y1 = y;
            t._updateBBox();
            t.canvas?.requestRenderAll();
            return true;
        },
        render(ctx: CanvasRenderingContext2D, left: number, top: number) {
            renderEndpointHandle(ctx, left, top);
        },
    });

    const endControl = new (fabric as any).Control({
        x: 0,
        y: 0,
        cursorStyleHandler: () => 'crosshair',
        actionName: 'arrowEnd',
        positionHandler(_dim: any, _finalMatrix: any, fabricObject: any) {
            return new fabric.Point(fabricObject.x2, fabricObject.y2);
        },
        actionHandler(_eventData: any, transform: any, x: number, y: number) {
            const t = transform.target as any;
            t.x2 = x;
            t.y2 = y;
            t._updateBBox();
            t.canvas?.requestRenderAll();
            return true;
        },
        render(ctx: CanvasRenderingContext2D, left: number, top: number) {
            renderEndpointHandle(ctx, left, top);
        },
    });

    // Only show our two custom endpoint handles — hide all default ones
    arrow.controls = {
        arrowStart: startControl,
        arrowEnd: endControl,
    };
}

/* ------------------------------------------------------------------ */
/*  ShapeModule                                                       */
/* ------------------------------------------------------------------ */

export class ShapeModule {
    private canvas: fabric.Canvas;
    private isActive = false;
    private activeShape: ShapeType | null = null;
    private strokeColor: string = '#ff0000';
    private strokeWidth: number = 3;

    // Drag-to-draw state
    private isDrawing = false;
    private startX = 0;
    private startY = 0;
    private currentObject: fabric.Object | null = null;

    constructor(canvas: fabric.Canvas) {
        this.canvas = canvas;
        registerArrowClass();
        // When an arrow is added to the canvas (including after undo/redo
        // restores from JSON) we need to re-attach its custom endpoint
        // controls and drag-sync handler, because plain JSON deserialisation
        // can't reconstruct functions.
        this.canvas.on('object:added', (e: fabric.IEvent) => {
            const obj = e.target as any;
            if (obj && obj.type === ARROW_TYPE && !obj._rpArrowBound) {
                attachArrowEndpointControls(obj);
                this.wireArrowDragSync(obj);
                obj._rpArrowBound = true;
            }
        });
    }

    /* ============================ public API ============================ */

    /**
     * Activate drag-to-draw for the requested primitive.
     * Replaces any currently-active shape tool.
     */
    activate(shape: ShapeType): void {
        this.deactivate();
        this.isActive = true;
        this.activeShape = shape;

        this.canvas.isDrawingMode = false;
        this.canvas.selection = false;
        this.canvas.defaultCursor = 'crosshair';
        this.canvas.hoverCursor = 'crosshair';

        // Make existing shape annotations selectable when we're not mid-draw,
        // so the user can grab a previously drawn shape to resize it. We
        // don't disturb other annotation types.
        this.canvas.getObjects().forEach((obj: any) => {
            if (obj._rpShapeType) {
                obj.selectable = true;
                obj.evented = true;
            }
        });

        this.canvas.on('mouse:down', this.handleMouseDown);
        this.canvas.on('mouse:move', this.handleMouseMove);
        this.canvas.on('mouse:up', this.handleMouseUp);
    }

    deactivate(): void {
        if (!this.isActive && !this.isDrawing) return;
        this.canvas.off('mouse:down', this.handleMouseDown);
        this.canvas.off('mouse:move', this.handleMouseMove);
        this.canvas.off('mouse:up', this.handleMouseUp);
        this.canvas.defaultCursor = 'default';
        this.canvas.hoverCursor = 'move';
        this.isActive = false;
        this.activeShape = null;
        this.isDrawing = false;
        this.currentObject = null;
    }

    /** Set stroke colour for shapes drawn from this point onward. Also
     *  updates the currently-selected shape (if any) so it matches the
     *  global color-picker behaviour used by draw/text/callout. */
    setStrokeColor(color: string): void {
        this.strokeColor = color;
        const active = this.canvas.getActiveObject() as any;
        if (active && active._rpShapeType) {
            if (active._rpShapeType === 'arrow') {
                active.set({ stroke: color });
            } else {
                // Filled vs outlined: keep stroke + matching translucent fill for
                // closed shapes so they remain visible against any background.
                active.set({ stroke: color, fill: 'transparent' });
            }
            this.canvas.requestRenderAll();
        }
    }

    setStrokeWidth(width: number): void {
        this.strokeWidth = Math.max(1, Math.min(50, width));
        const active = this.canvas.getActiveObject() as any;
        if (active && active._rpShapeType) {
            active.set({ strokeWidth: this.strokeWidth });
            if (active._rpShapeType === 'arrow') {
                active._updateBBox?.();
            }
            this.canvas.requestRenderAll();
        }
    }

    getIsActive(): boolean {
        return this.isActive;
    }

    /* ============================ draw gesture ========================== */

    private handleMouseDown = (opt: fabric.IEvent): void => {
        if (!this.isActive || !this.activeShape) return;
        // If the user clicked an existing shape annotation, let Fabric select
        // it instead of starting a new draw gesture
        if (opt.target && (opt.target as any)._rpShapeType) return;

        const pointer = this.canvas.getPointer(opt.e);
        this.isDrawing = true;
        this.startX = pointer.x;
        this.startY = pointer.y;
        this.currentObject = this.createShape(this.activeShape, pointer.x, pointer.y);
        if (this.currentObject) {
            this.canvas.add(this.currentObject);
            this.canvas.requestRenderAll();
        }
    };

    private handleMouseMove = (opt: fabric.IEvent): void => {
        if (!this.isDrawing || !this.currentObject || !this.activeShape) return;
        const pointer = this.canvas.getPointer(opt.e);
        this.updateShapeDuringDraw(this.activeShape, pointer.x, pointer.y);
        this.canvas.requestRenderAll();
    };

    private handleMouseUp = (): void => {
        if (!this.isDrawing || !this.currentObject) return;
        const obj = this.currentObject as any;

        // Reject zero-sized "click-without-drag" shapes
        const tooSmall = this.isShapeTooSmall(obj);
        this.isDrawing = false;

        if (tooSmall) {
            this.canvas.remove(obj);
            this.currentObject = null;
            this.canvas.requestRenderAll();
            return;
        }

        // Finalise: enable controls + select so resize handles appear right away
        obj.selectable = true;
        obj.evented = true;
        this.canvas.setActiveObject(obj);
        this.canvas.requestRenderAll();
        // Fire a synthetic object:modified so the editor saves an undo entry.
        this.canvas.fire('object:modified', { target: obj });
        this.currentObject = null;
    };

    /* ============================ factory =============================== */

    private createShape(type: ShapeType, x: number, y: number): fabric.Object | null {
        const common = {
            left: x,
            top: y,
            originX: 'left' as const,
            originY: 'top' as const,
            stroke: this.strokeColor,
            strokeWidth: this.strokeWidth,
            strokeUniform: true,
            fill: 'transparent',
            selectable: false, // becomes true on mouse:up
            evented: false,
            hasControls: true,
            hasBorders: true,
            cornerColor: '#0ea5e9',
            cornerStyle: 'circle' as const,
            cornerSize: 10,
            transparentCorners: false,
            borderColor: '#0ea5e9',
            lockRotation: true,
            hasRotatingPoint: false,
            objectCaching: false,
        };

        let obj: fabric.Object | null = null;

        if (type === 'circle') {
            const c = new fabric.Circle({
                ...common,
                radius: 1,
                lockUniScaling: true,
            });
            // Only show corner handles — side handles would imply non-uniform scaling
            c.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false, mtr: false,
            });
            obj = c;
        } else if (type === 'ellipse') {
            obj = new fabric.Ellipse({
                ...common,
                rx: 1,
                ry: 1,
            });
        } else if (type === 'square') {
            const r = new fabric.Rect({
                ...common,
                width: 1,
                height: 1,
                lockUniScaling: true,
            });
            r.setControlsVisibility({
                mt: false, mb: false, ml: false, mr: false, mtr: false,
            });
            obj = r;
        } else if (type === 'rectangle') {
            // Free-aspect rectangle — keeps all side handles so width and
            // height can be resized independently.
            obj = new fabric.Rect({
                ...common,
                width: 1,
                height: 1,
            });
        } else if (type === 'arrow') {
            const ArrowClass = registerArrowClass();
            const arrow = new ArrowClass({
                x1: x,
                y1: y,
                x2: x,
                y2: y,
                stroke: this.strokeColor,
                strokeWidth: this.strokeWidth,
                fill: this.strokeColor,
                selectable: false,
                evented: false,
                hasControls: true,
                hasBorders: false,
                lockRotation: true,
                hasRotatingPoint: false,
                objectCaching: false,
            });
            attachArrowEndpointControls(arrow);
            this.wireArrowDragSync(arrow);
            (arrow as any)._rpArrowBound = true;
            obj = arrow as fabric.Object;
        }

        if (obj) {
            (obj as any)._rpAnnotation = true;
            (obj as any)._rpType = 'shape';
            (obj as any)._rpShapeType = type;
        }
        return obj;
    }

    /**
     * Keep an arrow's endpoints in sync with its left/top as the user
     * drags the whole arrow. Fabric updates `left`/`top` during the
     * `moving` event but the arrow stores its endpoints in canvas coords,
     * so we shift them by the per-frame delta.
     */
    private wireArrowDragSync(arrow: any): void {
        arrow.on('moving', () => {
            const dx = (arrow.left ?? 0) - (arrow._lastLeft ?? 0);
            const dy = (arrow.top ?? 0) - (arrow._lastTop ?? 0);
            if (dx === 0 && dy === 0) return;
            arrow.x1 += dx;
            arrow.x2 += dx;
            arrow.y1 += dy;
            arrow.y2 += dy;
            arrow._lastLeft = arrow.left;
            arrow._lastTop = arrow.top;
            // Don't call _updateBBox here — left/top are already correct,
            // the user is mid-drag and we don't want to fight Fabric.
        });
        arrow.on('modified', () => {
            arrow._lastLeft = arrow.left;
            arrow._lastTop = arrow.top;
        });
    }

    /* ============================ sizing during draw ==================== */

    private updateShapeDuringDraw(type: ShapeType, x: number, y: number): void {
        if (!this.currentObject) return;
        const obj = this.currentObject as any;

        const dx = x - this.startX;
        const dy = y - this.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (type === 'circle') {
            // Constrain to a perfect circle — radius is the larger half-diagonal
            const size = Math.max(absDx, absDy);
            const radius = size / 2;
            obj.set({
                left: dx >= 0 ? this.startX : this.startX - size,
                top: dy >= 0 ? this.startY : this.startY - size,
                radius,
            });
        } else if (type === 'ellipse') {
            obj.set({
                left: dx >= 0 ? this.startX : x,
                top: dy >= 0 ? this.startY : y,
                rx: absDx / 2,
                ry: absDy / 2,
            });
        } else if (type === 'square') {
            const size = Math.max(absDx, absDy);
            obj.set({
                left: dx >= 0 ? this.startX : this.startX - size,
                top: dy >= 0 ? this.startY : this.startY - size,
                width: size,
                height: size,
            });
        } else if (type === 'rectangle') {
            obj.set({
                left: dx >= 0 ? this.startX : x,
                top: dy >= 0 ? this.startY : y,
                width: absDx,
                height: absDy,
            });
        } else if (type === 'arrow') {
            obj.x2 = x;
            obj.y2 = y;
            obj._updateBBox();
        }
        obj.setCoords();
    }

    private isShapeTooSmall(obj: any): boolean {
        const minSize = 4;
        if (obj.type === 'circle') return (obj.radius || 0) < minSize / 2;
        if (obj.type === 'ellipse') return (obj.rx || 0) < minSize / 2 || (obj.ry || 0) < minSize / 2;
        if (obj.type === 'rect') return (obj.width || 0) < minSize || (obj.height || 0) < minSize;
        if (obj.type === ARROW_TYPE) {
            const dx = obj.x2 - obj.x1;
            const dy = obj.y2 - obj.y1;
            return Math.sqrt(dx * dx + dy * dy) < minSize;
        }
        return false;
    }
}
