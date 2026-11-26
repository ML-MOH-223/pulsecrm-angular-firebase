import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'pulsecrm_theme';

@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly _mode = signal<ThemeMode>(this.resolveInitialTheme());

  readonly mode = this._mode.asReadonly();
  readonly isDark = computed(() => this._mode() === 'dark');

  constructor() {
    effect(() => {
      const dark = this.isDark();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', dark);
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, this._mode());
        } catch {
          // Ignore storage quota / privacy mode errors
        }
      }
    });
  }

  toggle(): void {
    this._mode.set(this.isDark() ? 'light' : 'dark');
  }

  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  private resolveInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
