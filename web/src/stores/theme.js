/**
 * 主题切换：light / dark / auto（跟随系统）
 * 用 localStorage 记住用户选择
 */
import { defineStore } from 'pinia';

const KEY = 'fanji.theme';

function applyTheme(mode) {
  const dark =
    mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: localStorage.getItem(KEY) || 'auto',
  }),
  actions: {
    set(mode) {
      this.mode = mode;
      localStorage.setItem(KEY, mode);
      applyTheme(mode);
    },
    init() {
      applyTheme(this.mode);
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.mode === 'auto') applyTheme('auto');
      });
    },
  },
});
