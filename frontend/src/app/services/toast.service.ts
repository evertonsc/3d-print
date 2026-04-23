import { Injectable, signal } from '@angular/core';

/**
 * Tiny global toast service. A single message is held at a time and auto
 * dismisses after `AUTO_DISMISS_MS` (default 6 s). Components can also call
 * `dismiss()` to close it manually.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** ms before the toast is automatically removed. */
  static readonly AUTO_DISMISS_MS = 6000;

  /** Reactive signal so OnPush components also re-render. */
  readonly current = signal<{ text: string; success: boolean } | null>(null);

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(text: string, success = true): void {
    this.clearTimer();
    this.current.set({ text, success });
    this.timer = setTimeout(() => this.dismiss(), ToastService.AUTO_DISMISS_MS);
  }

  success(text: string): void { this.show(text, true); }
  error(text: string): void { this.show(text, false); }

  dismiss(): void {
    this.clearTimer();
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }
}
