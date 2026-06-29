/**
 * Modal UI — creates a full-screen modal wrapping the editor
 */
import { RpEditorConfig, RpEditorResult, RpEditorTheme } from './types/index.js';
import { mergeConfig } from './utils/defaults.js';
import { RpImageEditor } from './editor.js';

export interface ModalOptions {
  image: File | Blob | string;
  config?: Partial<RpEditorConfig>;
  onApply?: (result: RpEditorResult) => void;
  onClose?: () => void;
}

/**
 * Open the image editor in a modal overlay
 * Returns a Promise that resolves with the edited result or null if cancelled
 */
export function openEditorModal(options: ModalOptions): Promise<RpEditorResult | null> {
  return new Promise((resolve) => {
    const config = mergeConfig(options.config);
    const theme = config.theme;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'rp-editor-modal-backdrop';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'rp-editor-modal';
    modal.style.cssText = `
      width: 100%;
      max-width: 960px;
      height: 90vh;
      max-height: 700px;
      background: ${theme.editorBackground || '#000000'};
      border-radius: ${theme.modalBorderRadius || '12px'};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      position: relative;
      z-index: 99999;
    `;

    // Header
    const header = document.createElement('div');
    header.className = 'rp-editor-modal-header';
    header.style.cssText = `
      padding: 14px 20px;
      background: ${theme.headerBackground || '#1a1a2e'};
      color: ${theme.headerTextColor || '#ffffff'};
      font-size: 18px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      flex-shrink: 0;
    `;
    header.textContent = theme.headerTitle || 'Photo Editor';

    // Editor body
    const body = document.createElement('div');
    body.className = 'rp-editor-modal-body';
    body.style.cssText = `
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    `;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'rp-editor-modal-footer';
    footer.style.cssText = `
      padding: 12px 20px;
      background: ${theme.footerBackground || '#1a1a2e'};
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      flex-shrink: 0;
    `;

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = theme.cancelButtonText || 'Close';
    cancelBtn.style.cssText = `
      padding: 10px 28px;
      border: 1px solid ${theme.cancelButtonBorderColor || '#ffffff'};
      background: ${theme.cancelButtonBackground || 'transparent'};
      color: ${theme.cancelButtonTextColor || '#ffffff'};
      border-radius: ${theme.buttonBorderRadius || '6px'};
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: opacity 0.2s;
      -webkit-tap-highlight-color: transparent;
    `;

    // Apply button — starts disabled until the image finishes loading
    const applyBtn = document.createElement('button');
    const applyBtnLabel = theme.applyButtonText || 'Apply';
    applyBtn.textContent = applyBtnLabel;
    applyBtn.disabled = true;
    applyBtn.setAttribute('aria-busy', 'true');
    applyBtn.style.cssText = `
      padding: 10px 28px;
      border: 1px solid ${theme.applyButtonBorderColor || '#4a90d9'};
      background: ${theme.applyButtonBackground || '#4a90d9'};
      color: ${theme.applyButtonTextColor || '#ffffff'};
      border-radius: ${theme.buttonBorderRadius || '6px'};
      font-size: 15px;
      font-weight: 600;
      cursor: not-allowed;
      opacity: 0.55;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: opacity 0.2s;
      -webkit-tap-highlight-color: transparent;
    `;

    let imageLoaded = false;
    const enableApplyButton = () => {
      imageLoaded = true;
      applyBtn.disabled = false;
      applyBtn.removeAttribute('aria-busy');
      applyBtn.style.cursor = 'pointer';
      applyBtn.style.opacity = '1';
      applyBtn.style.pointerEvents = 'auto';
    };

    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);

    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Prevent background scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initialize editor
    const editor = new RpImageEditor(body, options.config);

    let isClosing = false;

    const cleanup = () => {
      if (isClosing) return;
      isClosing = true;
      editor.destroy();
      document.body.style.overflow = originalOverflow;
      backdrop.remove();
    };

    // Close handler
    cancelBtn.addEventListener('click', () => {
      cleanup();
      options.onClose?.();
      resolve(null);
    });

    // Apply handler
    applyBtn.addEventListener('click', async () => {
      // Guard: ignore clicks before the image has finished loading.
      // The button is already visually disabled, but this protects against
      // edge cases where a synthetic/programmatic click bypasses pointer-events.
      if (!imageLoaded || applyBtn.disabled) return;

      try {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Processing...';
        applyBtn.style.opacity = '0.7';
        applyBtn.style.pointerEvents = 'none';

        const result = await editor.getResult();
        cleanup();
        options.onApply?.(result);
        resolve(result);
      } catch (err) {
        applyBtn.disabled = false;
        applyBtn.textContent = applyBtnLabel;
        applyBtn.style.opacity = '1';
        applyBtn.style.pointerEvents = 'auto';
        console.error('[RpImageEditor] Export failed:', err);
      }
    });

    // ESC key to close
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        cleanup();
        options.onClose?.();
        resolve(null);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Load the image — Apply stays disabled until this resolves
    editor
      .loadImage(options.image)
      .then(() => {
        if (isClosing) return;
        enableApplyButton();
      })
      .catch((err) => {
        console.error('[RpImageEditor] Failed to load image:', err);
        cleanup();
        resolve(null);
      });
  });
}
