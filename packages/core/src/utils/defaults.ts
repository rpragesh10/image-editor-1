import { RpEditorConfig, CropAspectRatio } from '../types/index.js';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<
  Omit<RpEditorConfig, 'maxResolution' | 'locale' | 'theme'>
> & { maxResolution: number | null; theme: NonNullable<RpEditorConfig['theme']> } = {
  maxResolution: null, // auto-detect
  cropAspectRatios: [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:4', value: 3 / 4 },
    { label: '2:3', value: 2 / 3 },
    { label: '9:16', value: 9 / 16 },
  ],
  exportFormat: 'png',
  exportQuality: 0.92,
  exportPixelRatio: 1,
  exportAtNativeResolution: true,
  maxUndoSteps: 20,
  defaultBrushColor: '#ff0000',
  defaultBrushWidth: 3,
  defaultTextColor: '#ff0000',
  defaultTextFontSize: 24,
  defaultShapeColor: '#ff0000',
  defaultShapeStrokeWidth: 3,
  colorPalette: [
    '#000000', '#ffffff', '#ff0000', '#0066ff',
    '#00cc44', '#ffcc00', '#ff6600', '#9933ff',
    '#ff69b4', '#00cccc',
  ],
  showToolbar: true,
  disabledFeatures: [],
  theme: {
    headerBackground: '#f5f5f5',
    headerTextColor: '#222222',
    headerTitle: 'Photo Editor',
    editorBackground: '#e0e0e0',
    toolbarBackground: '#fafafa',
    toolbarIconColor: '#333333',
    toolbarActiveIconColor: '#1976d2',
    footerBackground: '#f5f5f5',
    cancelButtonBackground: 'transparent',
    cancelButtonTextColor: '#333333',
    cancelButtonBorderColor: '#999999',
    cancelButtonText: 'Close',
    applyButtonBackground: '#1976d2',
    applyButtonTextColor: '#ffffff',
    applyButtonBorderColor: '#1976d2',
    applyButtonText: 'Apply',
    modalBorderRadius: '12px',
    buttonBorderRadius: '6px',
  },
};

/**
 * Deep merge configuration with defaults
 */
export function mergeConfig(userConfig?: Partial<RpEditorConfig>): typeof DEFAULT_CONFIG & RpEditorConfig {
  if (!userConfig) {
    return { ...DEFAULT_CONFIG };
  }

  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...(userConfig.theme || {}),
    },
    cropAspectRatios: userConfig.cropAspectRatios || DEFAULT_CONFIG.cropAspectRatios,
    colorPalette: userConfig.colorPalette || DEFAULT_CONFIG.colorPalette,
  };
}
