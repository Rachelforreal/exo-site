// 白昼 / 银河 — two editions of the same planet. 白昼 (paper) is the warm daylight edition;
// 银河 (galaxy) is the deep-space night edition with the superpower universe behind everything.
import { $$, reduced } from './util.js';

export const currentMode = () => document.documentElement.dataset.mode === 'galaxy' ? 'galaxy' : 'paper';

export function initMode({ uni } = {}) {
  const html = document.documentElement;
  const meta = document.querySelector('meta[name=theme-color]');

  function apply(mode, save) {
    html.dataset.mode = mode;
    if (save) { try { localStorage.setItem('exo-mode', mode); } catch {} }
    const g = mode === 'galaxy';
    $$('[data-mode-toggle]').forEach(b => { b.setAttribute('aria-pressed', String(g)); b.setAttribute('aria-label', g ? '切换到白昼模式' : '切换到银河模式'); });
    $$('[data-mode-name]').forEach(n => (n.textContent = g ? '白昼' : '银河'));
    if (meta) meta.content = g ? '#060812' : '#f2f0eb';
    if (uni) g && !document.hidden ? uni.start() : uni.stop();
    document.dispatchEvent(new CustomEvent('mode:change', { detail: { mode } }));
    window.ScrollTrigger?.refresh();
  }

  $$('[data-mode-toggle]').forEach(b => b.addEventListener('click', () => {
    const next = currentMode() === 'galaxy' ? 'paper' : 'galaxy';
    const r = b.getBoundingClientRect();
    html.style.setProperty('--vx', `${r.left + r.width / 2}px`); html.style.setProperty('--vy', `${r.top + r.height / 2}px`);
    if (document.startViewTransition && !reduced) document.startViewTransition(() => apply(next, true)); else apply(next, true);
  }));
  const hasExplicitMode = ['paper', 'day', 'daylight', 'galaxy'].includes((new URLSearchParams(location.search).get('mode') || '').toLowerCase());
  apply(currentMode(), hasExplicitMode);
  return { apply };
}
