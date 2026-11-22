// Ten skins: the galaxy + nine member powers. Each one swaps the accent palette, the shader scene and the particle layer.
import { $, $$, glyph, reduced, store, overlay, toast } from './util.js';

export const POWERS = [{ id: 'galaxy', zh: '银河', en: 'GALAXY', name: 'EXO', line: 'EXOPLANET 默认行星坐标：正六边形星图与银白轨道。', scene: 0, color: '#d6dcff', color2: '#8f9bff' }];
let universe = null, current = 'galaxy';
export const currentPower = () => current;

/* ---------- particle layer ---------- */
const KIND = { galaxy: 'twinkle', xiumin: 'snow', suho: 'bubble', lay: 'mote', baekhyun: 'bokeh', chen: 'bolt', chanyeol: 'ember', do: 'dust', kai: 'blink', sehun: 'streak' };
const COUNT = { twinkle: 46, snow: 110, bubble: 44, mote: 54, bokeh: 22, bolt: 26, ember: 80, dust: 70, blink: 22, streak: 34 };
const fx = { cv: null, c: null, w: 0, h: 0, dpr: 1, ps: [], kind: 'twinkle', col: '#d6dcff', col2: '#8f9bff', raf: 0, t: 0, bolt: null, on: false };
const R = (a, b) => a + Math.random() * (b - a);
function seed(p, kind, fresh) {
  const { w, h } = fx; p.x = R(0, w); p.y = R(0, h); p.ph = R(0, 6.28); p.life = 1;
  if (kind === 'snow') { p.r = R(1, 3.4); p.vy = R(18, 60); p.vx = R(-12, 12); if (!fresh) p.y = -10; }
  else if (kind === 'bubble') { p.r = R(3, 13); p.vy = -R(14, 46); p.vx = 0; if (!fresh) p.y = h + 20; }
  else if (kind === 'mote') { p.r = R(1.2, 3.2); p.vy = -R(4, 16); p.vx = R(-8, 8); if (!fresh) p.y = h + 10; }
  else if (kind === 'bokeh') { p.r = R(30, 110); p.vy = -R(2, 8); p.vx = R(-4, 4); }
  else if (kind === 'ember') { p.r = R(0.8, 2.6); p.vy = -R(40, 130); p.vx = R(-20, 20); p.life = R(0.4, 1); if (!fresh) { p.y = h + 10; } }
  else if (kind === 'dust') { p.r = R(0.8, 2.4); p.vy = R(6, 22); p.vx = R(8, 30); if (!fresh) { p.x = -10; } }
  else if (kind === 'blink') { p.r = R(6, 26); p.life = R(0.2, 1); p.vx = p.vy = 0; }
  else if (kind === 'streak') { p.r = R(40, 220); p.vx = R(380, 900); p.vy = R(-14, 14); p.life = R(0.15, 0.6); if (!fresh) p.x = -p.r - 20; }
  else if (kind === 'bolt') { p.r = R(0.6, 1.8); p.vx = R(-6, 6); p.vy = R(-6, 6); }
  else { p.r = R(0.6, 1.9); p.vx = p.vy = 0; }
  return p;
}
function makeBolt() {
  const { w, h } = fx; const pts = []; let x = R(w * 0.1, w * 0.9), y = -10;
  while (y < h * R(0.45, 0.9)) { pts.push([x, y]); x += R(-70, 70); y += R(24, 80); }
  fx.bolt = { pts, life: 1, fork: pts.slice(Math.floor(pts.length * R(0.3, 0.6))).map(([a, b], i) => [a + i * R(10, 34), b + i * R(4, 16)]) };
}
function frame(now) {
  if (!fx.on) return;
  const dt = Math.min(0.05, (now - fx.t) / 1000 || 0.016); fx.t = now;
  const { c, w, h, kind } = fx; c.clearRect(0, 0, w, h);
  c.fillStyle = fx.col; c.strokeStyle = fx.col; c.lineWidth = 1;
  for (const p of fx.ps) {
    p.ph += dt; p.x += p.vx * dt; p.y += p.vy * dt;
    if (kind === 'snow') { p.x += Math.sin(p.ph * 1.3) * 0.4; c.globalAlpha = 0.25 + 0.5 * (p.r / 3.4); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); if (p.y > h + 10) seed(p, kind); }
    else if (kind === 'bubble') { p.x += Math.sin(p.ph * 1.6) * 0.5; c.globalAlpha = 0.34; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.stroke(); c.globalAlpha = 0.5; c.beginPath(); c.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.14, 0, 6.28); c.fill(); if (p.y < -20) seed(p, kind); }
    else if (kind === 'mote') { c.globalAlpha = 0.18 + 0.5 * Math.abs(Math.sin(p.ph * 0.9)); c.shadowColor = fx.col; c.shadowBlur = 12; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); c.shadowBlur = 0; if (p.y < -10) seed(p, kind); }
    else if (kind === 'bokeh') { const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, fx.col); g.addColorStop(1, 'transparent'); c.globalAlpha = 0.05 + 0.07 * Math.abs(Math.sin(p.ph * 0.5)); c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); if (p.y < -p.r) { seed(p, kind); p.y = h + p.r; } }
    else if (kind === 'ember') { p.life -= dt * 0.28; p.x += Math.sin(p.ph * 3) * 0.7; c.globalAlpha = Math.max(0, p.life) * 0.85; c.fillStyle = p.life > 0.55 ? fx.col : fx.col2; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); if (p.life <= 0 || p.y < -10) seed(p, kind); }
    else if (kind === 'dust') { c.globalAlpha = 0.3 + 0.3 * Math.sin(p.ph); c.fillRect(p.x, p.y, p.r, p.r); if (p.x > w + 10 || p.y > h + 10) seed(p, kind); }
    else if (kind === 'blink') { p.life -= dt * 0.9; const a = Math.max(0, Math.sin(Math.min(1, p.life) * Math.PI)); c.globalAlpha = a * 0.3; c.strokeRect(p.x, p.y, p.r, p.r); c.globalAlpha = a * 0.12; c.fillStyle = fx.col2; c.fillRect(p.x + p.r * 0.5, p.y - p.r * 0.5, p.r, p.r); c.fillStyle = fx.col; if (p.life <= 0) seed(p, kind, true); }
    else if (kind === 'streak') { const g = c.createLinearGradient(p.x, 0, p.x + p.r, 0); g.addColorStop(0, 'transparent'); g.addColorStop(1, fx.col); c.globalAlpha = p.life; c.strokeStyle = g; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + p.r, p.y); c.stroke(); if (p.x > w + 20) seed(p, kind); }
    else { c.globalAlpha = 0.2 + 0.6 * Math.abs(Math.sin(p.ph * (kind === 'bolt' ? 2.4 : 0.8))); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.28); c.fill(); }
  }
  if (kind === 'bolt') {
    if (!fx.bolt && Math.random() < dt * 0.22) makeBolt();
    if (fx.bolt) {
      const b = fx.bolt; b.life -= dt * 2.6; const a = Math.max(0, b.life) * (Math.random() > 0.3 ? 1 : 0.35);
      c.globalAlpha = a * 0.75; c.strokeStyle = '#fff'; c.shadowColor = fx.col; c.shadowBlur = 24; c.lineWidth = 1.6;
      for (const line of [b.pts, b.fork]) { c.beginPath(); line.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); c.lineWidth = 0.9; }
      c.shadowBlur = 0; c.globalAlpha = a * 0.05; c.fillStyle = fx.col; c.fillRect(0, 0, w, h);
      if (b.life <= 0) fx.bolt = null;
    }
  }
  c.globalAlpha = 1;
  fx.raf = requestAnimationFrame(frame);
}
function fxResize() {
  const cv = fx.cv; fx.dpr = Math.min(window.devicePixelRatio || 1, 1.5); fx.w = cv.clientWidth; fx.h = cv.clientHeight;
  cv.width = fx.w * fx.dpr; cv.height = fx.h * fx.dpr; fx.c.setTransform(fx.dpr, 0, 0, fx.dpr, 0, 0);
}
function fxSet(id, p) {
  if (!fx.c) return;
  fx.kind = KIND[id] || 'twinkle'; fx.col = p.color; fx.col2 = p.color2; fx.bolt = null;
  const n = Math.round(COUNT[fx.kind] * (fx.w < 700 ? 0.5 : 1));
  fx.ps = Array.from({ length: n }, () => seed({}, fx.kind, true));
}
function fxInit() {
  fx.cv = $('#fx'); if (!fx.cv || reduced) return;
  fx.c = fx.cv.getContext('2d'); fxResize();
  window.addEventListener('resize', fxResize, { passive: true });
  const run = () => { const on = !document.hidden; if (on && !fx.on) { fx.on = true; fx.t = performance.now(); fx.raf = requestAnimationFrame(frame); } else if (!on) { fx.on = false; cancelAnimationFrame(fx.raf); } };
  document.addEventListener('visibilitychange', run); run();
}

/* ---------- applying a power ---------- */
function paint(id) {
  const p = POWERS.find(x => x.id === id) || POWERS[0];
  current = p.id; document.documentElement.dataset.power = p.id;
  $$('[data-power-glyph]').forEach(u => u.setAttribute('href', `#g-${p.id}`));
  $$('[data-power-name]').forEach(n => (n.textContent = p.id === 'galaxy' ? '超能力' : p.zh));
  $$('.dial__btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.power === p.id)));
  const meta = $('meta[name=theme-color]'); if (meta) meta.content = document.documentElement.dataset.mode === 'paper' ? '#f2f0eb' : '#060812';
  fxSet(p.id, p);
  return p;
}
export function setPower(id, { x, y, quiet = false } = {}) {
  if (id === current) return;
  const p = POWERS.find(v => v.id === id) || POWERS[0];
  try { localStorage.setItem('exo-power', p.id); } catch {}
  const canVT = document.startViewTransition && !reduced && x != null;
  if (canVT) {
    const root = document.documentElement; root.style.setProperty('--vx', x + 'px'); root.style.setProperty('--vy', y + 'px');
    universe?.setScene(p.scene, true);
    document.startViewTransition(() => paint(p.id));
  } else { universe?.setScene(p.scene); paint(p.id); }
  if (!quiet) toast(p.id === 'galaxy' ? '回到银河' : `${p.name} · ${p.zh}`);
  document.dispatchEvent(new CustomEvent('power:change', { detail: p }));
}

export function initThemes(members, uni) {
  universe = uni;
  for (const m of members) POWERS.push({ id: m.id, zh: m.power.zh, en: m.power.en, name: m.en, line: m.power.line, scene: m.scene, color: m.color, color2: m.color2 });
  fxInit();
  // dial
  const ring = $('#dial-ring'), nameEl = $('[data-dial-name]'), lineEl = $('[data-dial-line]');
  const label = p => { nameEl.textContent = p.id === 'galaxy' ? '银河' : `${p.zh} · ${p.name}`; lineEl.textContent = p.line; };
  ring.innerHTML = POWERS.map((p, i) => i === 0
    ? `<button class="dial__btn dial__btn--core" type="button" data-power="galaxy" style="--mc:${p.color}" aria-label="银河（默认）">${glyph('galaxy')}<span>银河</span></button>`
    : `<button class="dial__btn" type="button" data-power="${p.id}" style="--a:${(i - 1) * 40}deg;--mc:${p.color}" aria-label="${p.name} ${p.zh}">${glyph(p.id)}<span>${p.zh}</span></button>`).join('');
  ring.addEventListener('pointerover', e => { const b = e.target.closest('.dial__btn'); if (b) label(POWERS.find(p => p.id === b.dataset.power)); });
  ring.addEventListener('focusin', e => { const b = e.target.closest('.dial__btn'); if (b) label(POWERS.find(p => p.id === b.dataset.power)); });
  ring.addEventListener('pointerleave', () => label(POWERS.find(p => p.id === current)));
  ring.addEventListener('click', e => {
    const b = e.target.closest('.dial__btn'); if (!b) return;
    const r = b.getBoundingClientRect(); overlay.close($('#dial'));
    setPower(b.dataset.power, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  $$('[data-open-dial]').forEach(b => b.addEventListener('click', () => { label(POWERS.find(p => p.id === current)); overlay.open($('#dial'), { focus: $(`.dial__btn[data-power="${current}"]`) }); }));
  // restore
  let saved = 'galaxy'; try { saved = localStorage.getItem('exo-power') || 'galaxy'; } catch {}
  const p = paint(POWERS.some(v => v.id === saved) ? saved : 'galaxy');
  universe?.setScene(p.scene, true);
}
