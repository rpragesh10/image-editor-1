import { useCallback } from 'react';
import {
  RpEditorConfig,
  RpEditorResult,
  openEditorModal,
} from '@rageshpikalmunde/rp-image-editor';

/**
 * React hook to open the image editor as a modal overlay.
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { openEditor } = useRpImageEditor();
 *
 *   const handleEdit = async (file: File) => {
 *     const result = await openEditor(file, {
 *       theme: { applyButtonBackground: '#28a745' }
 *     });
 *     if (result) {
 *       console.log(result.file); // upload
 *     }
 *   };
 * }
 * ```
 */
export function useRpImageEditor() {
  const openEditor = useCallback(
    async (
      image: File | Blob | string,
      config?: Partial<RpEditorConfig>
    ): Promise<RpEditorResult | null> => {
      return openEditorModal({ image, config });
    },
    []
  );

  return { openEditor };
}
