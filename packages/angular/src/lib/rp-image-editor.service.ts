import { Injectable } from '@angular/core';
import {
  RpEditorConfig,
  RpEditorResult,
  openEditorModal,
} from '@rageshpikalmunde/rp-image-editor';

/**
 * Service to open the image editor as a modal overlay.
 * Works with or without Ionic — uses the core modal implementation.
 *
 * Usage:
 * ```ts
 * constructor(private rpEditor: RpImageEditorService) {}
 *
 * async editImage(file: File) {
 *   const result = await this.rpEditor.openEditor(file, {
 *     theme: { applyButtonBackground: '#28a745' }
 *   });
 *   if (result) {
 *     // result.file — upload to server
 *     // result.base64 — preview
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class RpImageEditorService {
  /**
   * Open the image editor in a modal popup.
   *
   * @param image - File, Blob, or URL string to edit
   * @param config - Optional editor configuration (theme, crop ratios, etc.)
   * @returns Promise resolving to RpEditorResult if applied, or null if cancelled
   */
  async openEditor(
    image: File | Blob | string,
    config?: Partial<RpEditorConfig>
  ): Promise<RpEditorResult | null> {
    return openEditorModal({
      image,
      config,
    });
  }
}
