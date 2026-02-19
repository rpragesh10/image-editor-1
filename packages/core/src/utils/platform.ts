/**
 * Platform detection utilities
 */

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
}

export function isCapacitor(): boolean {
  return typeof (window as any)?.Capacitor !== 'undefined' &&
    (window as any)?.Capacitor?.isNativePlatform?.() === true;
}

export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Probe the maximum canvas size the current browser supports.
 * Returns the max dimension (width = height) that's safe.
 */
export function probeMaxCanvasSize(): number {
  // Known limits:
  // iOS Safari: ~4096x4096 (16MP) — older devices even less
  // Chrome: ~16384x16384 (268MP)
  // Firefox: ~11180x11180 (124MP)

  if (isIOS() || (isSafari() && isCapacitor())) {
    return 4096;
  }

  if (isAndroid() && isCapacitor()) {
    return 8192; // Conservative for Android WebView
  }

  // On desktop browsers, try to detect via a test canvas
  try {
    const testSizes = [16384, 8192, 4096];
    for (const size of testSizes) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Test if the canvas actually works at this size
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        if (data[0] === 255) {
          canvas.width = 1;
          canvas.height = 1;
          return size;
        }
      }
      canvas.width = 1;
      canvas.height = 1;
    }
  } catch {
    // Fallback
  }

  return 4096; // Safe fallback
}

/**
 * Determine the maximum resolution to use for loading images
 */
export function getMaxResolution(configMax: number | null | undefined): number | null {
  if (configMax !== null && configMax !== undefined) {
    return configMax; // User explicitly set a limit
  }

  // Auto-detect based on platform
  if (isIOS() || (isSafari() && isCapacitor())) {
    return 4096; // Stay within Safari's 16MP limit
  }

  if (isAndroid() && isCapacitor()) {
    return 8192; // Conservative for Android WebView
  }

  // Desktop browser — no limit
  return null;
}
