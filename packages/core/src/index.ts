/**
 * @rageshpikalmunde/rp-image-editor
 * Lightweight image editor with crop, zoom, rotate, draw, text, eraser, undo/redo
 */

// Core editor
export { RpImageEditor } from './editor';

// Modal helper
export { openEditorModal } from './modal';
export type { ModalOptions } from './modal';

// Types
export type {
  RpEditorConfig,
  RpEditorTheme,
  RpEditorResult,
  CropAspectRatio,
  EditorMode,
  RpEditorEvents,
  LoadedImageInfo,
} from './types';

// Utils (for advanced users)
export { processImage, isHeicFile } from './utils/image-processing';
export { isIOS, isSafari, isCapacitor, isTouchDevice, getMaxResolution } from './utils/platform';
export { mergeConfig, DEFAULT_CONFIG } from './utils/defaults';
