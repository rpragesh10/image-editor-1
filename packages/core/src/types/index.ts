/**
 * Configuration for the image editor
 */
export interface RpEditorConfig {
  /** Maximum resolution (longest side). null = no limit (auto-detect per platform) */
  maxResolution?: number | null;

  /** Default crop aspect ratios available to user */
  cropAspectRatios?: CropAspectRatio[];

  /** Default export format */
  exportFormat?: 'png' | 'jpeg';

  /** JPEG export quality (0.0 - 1.0). Default: 0.92 */
  exportQuality?: number;

  /** Export pixel ratio. 1 = standard, 2 = retina. Default: 1 */
  exportPixelRatio?: number;

  /**
   * When true (default), the exported image is rendered at the native
   * (intrinsic) resolution of the loaded image — so the on-screen
   * scaling that the editor applies to fit the canvas does NOT reduce
   * the resolution of the output. Annotations are upscaled to match.
   *
   * Set to false to revert to the legacy behaviour where the export
   * size matches the on-screen canvas size.
   * Default: true
   */
  exportAtNativeResolution?: boolean;

  /** Maximum undo stack depth. Default: 20 */
  maxUndoSteps?: number;

  /** Default brush color. Default: '#ff0000' */
  defaultBrushColor?: string;

  /** Default brush width in pixels. Default: 3 */
  defaultBrushWidth?: number;

  /** Default text color. Default: '#ff0000' */
  defaultTextColor?: string;

  /** Default text font size. Default: 24 */
  defaultTextFontSize?: number;

  /** Default stroke color for shapes (circle/ellipse/square/arrow). Default: matches defaultBrushColor */
  defaultShapeColor?: string;

  /** Default stroke width for shapes. Default: 3 */
  defaultShapeStrokeWidth?: number;

  /** Color palette for the color picker */
  colorPalette?: string[];

  /** Whether to show the built-in toolbar. Default: true */
  showToolbar?: boolean;

  /**
   * Features to hide from the toolbar.
   * Accepts individual tool names: 'move','crop','zoomIn','zoomOut','rotateLeft','rotateRight',
   * 'draw','text','eraser','callout','undo','redo','reset'
   * Or group names: 'zoom' (zoomIn+zoomOut), 'transform' (rotateLeft+rotateRight+reset),
   * 'annotate' (draw+text+callout+eraser)
   * Default: [] (all features visible)
   */
  disabledFeatures?: string[];

  /** Theme customization */
  theme?: RpEditorTheme;

  /** Locale for button text. Can override individual labels via theme */
  locale?: string;
}

/**
 * Theme customization for the editor modal
 */
export interface RpEditorTheme {
  // Modal header
  headerBackground?: string;
  headerTextColor?: string;
  headerTitle?: string;

  // Editor body
  editorBackground?: string;
  toolbarBackground?: string;
  toolbarIconColor?: string;
  toolbarActiveIconColor?: string;

  // Footer
  footerBackground?: string;

  // Cancel button
  cancelButtonBackground?: string;
  cancelButtonTextColor?: string;
  cancelButtonBorderColor?: string;
  cancelButtonText?: string;

  // Apply button
  applyButtonBackground?: string;
  applyButtonTextColor?: string;
  applyButtonBorderColor?: string;
  applyButtonText?: string;

  // Border radii
  modalBorderRadius?: string;
  buttonBorderRadius?: string;
}

/**
 * Predefined crop aspect ratio
 */
export interface CropAspectRatio {
  label: string;
  value: number | null; // null = free crop
}

/**
 * Result returned after editing
 */
export interface RpEditorResult {
  /** Base64 data URL (data:image/png;base64,... or data:image/jpeg;base64,...) */
  base64: string;
  /** Binary blob */
  blob: Blob;
  /** File object (uploadable via FormData) */
  file: File;
  /** Output width in pixels */
  width: number;
  /** Output height in pixels */
  height: number;
  /** Output format */
  format: 'png' | 'jpeg';
}

/**
 * Editor tool modes
 */
export type EditorMode =
  | 'move'
  | 'crop'
  | 'draw'
  | 'text'
  | 'eraser'
  | 'callout'
  | 'shape-circle'
  | 'shape-ellipse'
  | 'shape-square'
  | 'shape-arrow';

/** Shape primitive supported by the ShapeModule */
export type ShapeType = 'circle' | 'ellipse' | 'square' | 'arrow';

/**
 * Event types emitted by the editor
 */
export type RpEditorEvents = {
  [key: string]: (...args: any[]) => void;
  'mode:changed': (mode: EditorMode) => void;
  'zoom:changed': (level: number) => void;
  'history:changed': (state: { canUndo: boolean; canRedo: boolean }) => void;
  'image:loaded': (info: { width: number; height: number; downscaled: boolean }) => void;
  'image:exported': (result: RpEditorResult) => void;
  'error': (error: Error) => void;
}

/**
 * Internal image info after loading pipeline
 */
export interface LoadedImageInfo {
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
  wasDownscaled: boolean;
  wasHeicConverted: boolean;
  wasExifCorrected: boolean;
  format: string;
}
