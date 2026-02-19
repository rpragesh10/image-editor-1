/**
 * Simple typed event emitter
 */
export class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: Partial<{ [K in keyof T]: Set<T[K]> }> = {};

  on<K extends keyof T>(event: K, listener: T[K]): void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event]!.add(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    this.listeners[event]?.delete(listener);
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        (listener as any)(...args);
      } catch (err) {
        console.error(`[RpImageEditor] Event listener error for "${String(event)}":`, err);
      }
    });
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}
