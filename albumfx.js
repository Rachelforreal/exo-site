// One small canvas motif per album, drawn behind the stage. Each is derived from that album's cover.
import { reduced } from './util.js';

const TAU = Math.PI * 2;
const rng = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const poly = (c, x, y, r, n, rot = 0) => { c.beginPath(); for (let i = 0; i < n; i++) { const a = rot + i * TAU / n; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); };
const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
const noise = (x, y) => Math.sin(x * 1.7 + y * 0.9) * 0.5 + Math.sin(x * 0.63 - y * 1.31 + 1.7) * 0.32 + Math.sin(x * 3.1 + y * 2.3 + 4.1) * 0.18;

const M = {
  /* MAMA — the ring of power marks */
  sigil: { draw(c, e) {
    const cx = e.w * 0.8, cy = e.h * 0.34, R = Math.min(e.w, e.h) * 0.56; c.strokeStyle = e.ac; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.globalAlpha = 0.3 - i * 0.05; c.beginPath(); c.arc(cx, cy, R * (0.42 + i * 0.2), 0, TAU); c.stroke(); }
    c.globalAlpha = 0.3; for (let i = 0; i < 72; i++) { const a = -e.t * 0.03 + i * TAU / 72, r1 = R * 0.62, r2 = R * (i % 6 ? 0.635 : 0.665); line(c, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); }
    for (let i = 0; i < 12; i++) { const a = e.t * 0.05 + i * TAU / 12, x = cx + Math.cos(a) * R * 0.82, y = cy + Math.sin(a) * R * 0.82; c.globalAlpha = 0.3 + 0.3 * Math.sin(e.t * 0.8 + i * 1.7); poly(c, x, y, R * 0.045, (i % 4) + 3, a); c.stroke(); }
    c.globalAlpha = 0.36; poly(c, cx, cy, R * 0.36, 6, e.t * 0.02 + Math.PI / 6); c.stroke();
    c.globalAlpha = 0.22; poly(c, cx, cy, R * 0.2, 6, -e.t * 0.03); c.stroke(); poly(c, cx, cy, R * 0.36, 3, e.t * 0.02 + Math.PI / 6); c.stroke();
  } },

  /* XOXO / Growl — marker pen on a yearbook page */
  frame: { draw(c, e) {
    const k = Math.floor(e.t * 5), base = rng(77); c.strokeStyle = e.ac; c.lineCap = 'round'; c.lineJoin = 'round';
    const n = Math.round(e.w / 90);
    for (let i = 0; i < n; i++) {
      const x = base() * e.w, y = base() * e.h, s = 14 + base() * 30, kind = base(), j = rng(k * 31 + i * 7 + 1), w = () => (j() - 0.5) * 3.2;
      c.globalAlpha = 0.1 + base() * 0.1; c.lineWidth = 2 + base() * 2.5;
      if (kind < 0.4) { line(c, x - s + w(), y - s + w(), x + s + w(), y + s + w()); line(c, x + s + w(), y - s + w(), x - s + w(), y + s + w()); }
      else if (kind < 0.8) { c.beginPath(); for (let a = 0; a <= 13; a++) { const an = a / 12 * TAU, r = s * (1 + (j() - 0.5) * 0.1); c[a ? 'lineTo' : 'moveTo'](x + Math.cos(an) * r, y + Math.sin(an) * r * 0.92); } c.stroke(); }
      else { c.beginPath(); for (let a = 0; a < 6; a++) c[a ? 'lineTo' : 'moveTo'](x + a * s * 0.5, y + (a % 2 ? -1 : 1) * s * 0.22 + w()); c.stroke(); }
    }
    const j = rng(k + 5), w = () => (j() - 0.5) * 5, p = Math.max(14, e.w * 0.018);
    c.globalAlpha = 0.5; c.lineWidth = 3; c.beginPath(); c.moveTo(p + w(), p + w()); c.lineTo(e.w - p + w(), p + w()); c.lineTo(e.w - p + w(), e.h - p + w()); c.lineTo(p + w(), e.h - p + w()); c.closePath(); c.stroke();
  } },

  /* winter albums — snow */
  snow: {
    init(e, r) { return Array.from({ length: Math.round(e.w / 12) }, () => ({ x: r() * e.w, y: r() * e.h, r: 1 + r() * 7, v: 10 + r() * 30, ph: r() * 6, k: r() })); },
    draw(c, e, s) {
      const cols = e.light ? [e.fg, e.ac, e.ac2] : [e.fg, e.fg, e.ac];
      for (const p of s) {
        p.y += p.v * e.dt; p.ph += e.dt; const x = p.x + Math.sin(p.ph * 0.8) * 14; if (p.y > e.h + 12) { p.y = -12; }
        c.strokeStyle = c.fillStyle = cols[Math.floor(p.k * 3)]; c.globalAlpha = (e.light ? 0.2 : 0.3) + p.k * 0.2;
        if (p.r > 4.5) { c.lineWidth = 1; for (let a = 0; a < 3; a++) { const an = p.ph * 0.3 + a * Math.PI / 3; line(c, x - Math.cos(an) * p.r, p.y - Math.sin(an) * p.r, x + Math.cos(an) * p.r, p.y + Math.sin(an) * p.r); } }
        else { c.beginPath(); c.arc(x, p.y, p.r * 0.5, 0, TAU); c.fill(); }
      }
    },
  },

  /* Sing For You — drifting in space */
  dust: {
    init(e, r) { return Array.from({ length: Math.round(e.w / 16) }, () => ({ x: r() * e.w, y: r() * e.h, r: 0.5 + r() * 1.8, vx: 4 + r() * 10, vy: -2 - r() * 6, ph: r() * 6 })); },
    draw(c, e, s) {
      c.strokeStyle = e.ac; c.lineWidth = 1; const cx = e.w * 0.74, cy = e.h * 0.46;
      for (let i = 0; i < 3; i++) { c.globalAlpha = 0.16 - i * 0.04; c.beginPath(); c.ellipse(cx, cy, e.w * (0.24 + i * 0.1), e.h * (0.12 + i * 0.07), -0.3 + Math.sin(e.t * 0.05) * 0.05, 0, TAU); c.stroke(); }
      const a = e.t * 0.12; c.globalAlpha = 0.8; c.fillStyle = e.fg; c.beginPath(); c.arc(cx + Math.cos(a) * e.w * 0.34 * Math.cos(-0.3) - Math.sin(a) * e.h * 0.19 * Math.sin(-0.3), cy + Math.cos(a) * e.w * 0.34 * Math.sin(-0.3) + Math.sin(a) * e.h * 0.19 * Math.cos(-0.3), 2.4, 0, TAU); c.fill();
      c.fillStyle = e.ac;
      for (const p of s) { p.x += p.vx * e.dt; p.y += p.vy * e.dt; p.ph += e.dt; if (p.x > e.w + 6) p.x = -6; if (p.y < -6) p.y = e.h + 6; c.globalAlpha = 0.15 + 0.4 * Math.abs(Math.sin(p.ph * 0.7)); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
    },
  },

  /* Overdose — the labyrinth */
  maze: { draw(c, e) {
    const cx = e.w * 0.76, cy = e.h * 0.5, S = Math.max(e.w, e.h) * 0.6; c.strokeStyle = e.ac; c.lineWidth = 1.4; c.lineCap = 'butt';
    for (let i = 1; i <= 15; i++) {
      const s = S * i / 15, P = s * 8; c.globalAlpha = 0.07 + 0.2 * (1 - i / 15);
      c.setLineDash([P * 0.4, P * 0.035, P * 0.2, P * 0.05, P * 0.28, P * 0.035]); c.lineDashOffset = (i % 2 ? 1 : -1) * e.t * (8 + i * 1.6) + i * 211;
      c.strokeRect(cx - s, cy - s, s * 2, s * 2);
    }
    c.setLineDash([]);
  } },

  /* EXODUS / Love Me Right — the hexagon */
  hex: { draw(c, e) {
    const s = Math.max(30, e.w / 26), hx = s * Math.sqrt(3), cols = Math.ceil(e.w / hx) + 1, rows = Math.ceil(e.h / (s * 1.5)) + 1; c.strokeStyle = c.fillStyle = e.ac; c.lineWidth = 1;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const x = q * hx + (r % 2 ? hx / 2 : 0), y = r * s * 1.5, h = hash(q, r), p = Math.max(0, Math.sin(e.t * (0.3 + h * 0.5) + h * 40)) ** 6, edge = Math.min(1, x / e.w + 0.25);
      c.globalAlpha = (0.05 + p * 0.3) * edge; poly(c, x, y, s * 0.94, 6, Math.PI / 6); c.stroke();
      if (h > 0.86) { c.globalAlpha = p * 0.16 * edge; c.fill(); }
    }
  } },

  /* EX'ACT — letters wired into one mark */
  nodes: {
    init(e, r) { const L = "EX'ACT".split(''); return Array.from({ length: 16 }, (_, i) => ({ x: r() * e.w, y: r() * e.h, vx: (r() - 0.5) * 10, vy: (r() - 0.5) * 10, l: i < 6 ? L[i] : '' })); },
    draw(c, e, s) {
      c.strokeStyle = c.fillStyle = e.ac; c.lineWidth = 1; const D = Math.max(220, e.w * 0.24);
      for (const p of s) { p.x += p.vx * e.dt; p.y += p.vy * e.dt; if (p.x < 0 || p.x > e.w) p.vx *= -1; if (p.y < 0 || p.y > e.h) p.vy *= -1; }
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
        const a = s[i], b = s[j], d = Math.hypot(a.x - b.x, a.y - b.y); if (d > D) continue;
        c.globalAlpha = (1 - d / D) * 0.3; line(c, a.x, a.y, b.x, b.y);
        const an = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2; c.beginPath(); c.moveTo(mx + Math.cos(an) * 5, my + Math.sin(an) * 5); c.lineTo(mx + Math.cos(an + 2.5) * 5, my + Math.sin(an + 2.5) * 5); c.lineTo(mx + Math.cos(an - 2.5) * 5, my + Math.sin(an - 2.5) * 5); c.fill();
      }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const p of s) {
        if (p.l) { c.globalAlpha = 0.2; c.font = "300 64px 'Cormorant Garamond', serif"; c.fillText(p.l, p.x, p.y); }
        else { c.globalAlpha = 0.4; c.beginPath(); c.arc(p.x, p.y, 3, 0, TAU); c.stroke(); }
      }
    },
  },

  /* LOTTO — stacked chips */
  coins: { draw(c, e) {
    c.strokeStyle = e.ac; c.lineWidth = 1.1; const r = rng(9), base = e.h * 1.02;
    for (let k = 0; k < 7; k++) {
      const x = e.w * (0.5 + k * 0.085) + (r() - 0.5) * 30, rx = 44 + r() * 26, ry = rx * 0.3, n = 5 + Math.floor(r() * 12), hgt = 11, bob = Math.sin(e.t * 0.7 + k * 1.3) * 5;
      for (let j = 0; j < n; j++) {
        const y = base - j * hgt - bob * (j / n), sx = x + Math.sin(j * 1.9 + k) * 3.5; c.globalAlpha = 0.14 + 0.26 * (j / n);
        c.beginPath(); c.ellipse(sx, y, rx, ry, 0, 0, Math.PI); c.stroke();
        if (j === n - 1) { c.beginPath(); c.ellipse(sx, y, rx, ry, 0, Math.PI, TAU); c.stroke(); c.globalAlpha = 0.22; c.beginPath(); c.ellipse(sx, y, rx * 0.68, ry * 0.68, 0, 0, TAU); c.stroke(); }
        line(c, sx - rx, y, sx - rx, y - hgt); line(c, sx + rx, y, sx + rx, y - hgt);
      }
    }
    for (let k = 0; k < 5; k++) { const x = e.w * (0.56 + r() * 0.42), y = e.h * (0.08 + r() * 0.4) + Math.sin(e.t * 0.5 + k) * 12, R = 16 + r() * 16, sq = Math.abs(Math.cos(e.t * 0.6 + k * 2)); c.globalAlpha = 0.3; c.beginPath(); c.ellipse(x, y, R * Math.max(0.08, sq), R, 0.3, 0, TAU); c.stroke(); }
  } },

  /* THE WAR — bird-of-paradise leaves */
  blades: { draw(c, e) {
    const r = rng(21);
    const fan = (ox, oy, a0, a1, n, len) => { for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / (n - 1)) + Math.sin(e.t * 0.5 + i * 0.9) * 0.035, L = len * (0.62 + r() * 0.5), wd = L * (0.07 + r() * 0.05);
      const tx = ox + Math.cos(a) * L, ty = oy + Math.sin(a) * L, nx = Math.cos(a + Math.PI / 2) * wd, ny = Math.sin(a + Math.PI / 2) * wd, mx = ox + Math.cos(a) * L * 0.45, my = oy + Math.sin(a) * L * 0.45;
      c.fillStyle = c.strokeStyle = i % 3 === 1 ? e.ac : e.ac2; c.beginPath(); c.moveTo(ox, oy); c.quadraticCurveTo(mx + nx, my + ny, tx, ty); c.quadraticCurveTo(mx - nx, my - ny, ox, oy);
      c.globalAlpha = 0.1; c.fill(); c.globalAlpha = 0.34; c.lineWidth = 1; c.stroke(); line(c, ox, oy, tx, ty);
    } };
    fan(e.w * 1.03, e.h * 1.08, Math.PI * 1.02, Math.PI * 1.52, 11, Math.min(e.w, e.h) * 0.95);
    fan(-e.w * 0.03, -e.h * 0.08, 0.05, Math.PI * 0.45, 7, Math.min(e.w, e.h) * 0.5);
  } },

  /* THE POWER OF MUSIC — comic-book impact */
  beams: { draw(c, e) {
    const cx = e.w * 0.24, cy = e.h * 0.5, R = Math.hypot(e.w, e.h), n = 28; c.fillStyle = e.ac;
    for (let i = 0; i < n; i++) { const a = e.t * 0.04 + i * TAU / n, wd = TAU / n * (0.22 + 0.2 * hash(i, 3)); c.globalAlpha = 0.05 + 0.07 * hash(i, 9); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a, a + wd); c.closePath(); c.fill(); }
    const g = Math.max(16, e.w / 60);
    for (let y = e.h; y > e.h * 0.35; y -= g) for (let x = e.w; x > e.w * 0.45; x -= g) { const d = ((x / e.w - 0.45) / 0.55) * ((y / e.h - 0.35) / 0.65), rr = g * 0.42 * d * (0.8 + 0.2 * Math.sin(e.t * 1.2 + x * 0.02)); if (rr < 0.6) continue; c.globalAlpha = 0.3; c.beginPath(); c.arc(x + ((y / g) % 2 ? g / 2 : 0), y, rr, 0, TAU); c.fill(); }
  } },

  /* Universe — a galaxy in a coffee cup */
  stars: {
    init(e, r) { return Array.from({ length: Math.round(e.w / 7) }, () => ({ x: r() * e.w, y: r() * e.h, r: 0.4 + r() * 1.3, ph: r() * 6, sp: 0.4 + r() * 1.6 })); },
    draw(c, e, s) {
      c.fillStyle = e.fg; for (const p of s) { c.globalAlpha = 0.15 + 0.55 * Math.abs(Math.sin(e.t * p.sp * 0.5 + p.ph)); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
      const cx = e.w * 0.8, cy = e.h * 0.36, R = Math.min(e.w, e.h) * 0.46; c.strokeStyle = e.ac; c.lineWidth = 1;
      for (let arm = 0; arm < 4; arm++) { c.globalAlpha = 0.26; c.beginPath(); for (let i = 0; i <= 90; i++) { const th = i / 90 * 4.4, rr = R * 0.06 * Math.exp(0.52 * th), a = th + arm * TAU / 4 + e.t * 0.05; if (rr > R) break; c[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.62); } c.stroke(); }
      c.globalAlpha = 0.2; c.beginPath(); c.ellipse(cx, cy, R, R * 0.62, 0, 0, TAU); c.stroke(); c.globalAlpha = 0.1; c.beginPath(); c.ellipse(cx, cy, R * 1.12, R * 0.7, 0, 0, TAU); c.stroke();
    },
  },

  /* COUNTDOWN — the white staircase */
  stairs: { draw(c, e) {
    const n = 16, sw = e.w * 0.036, sh = e.h * 0.05, ox = e.w * 0.42, oy = e.h * 1.0, dx = sw * 0.9, dy = sh * 0.5, hot = (e.t * 1.6) % (n + 6);
    c.strokeStyle = c.fillStyle = e.ac; c.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const x = ox + i * sw, y = oy - i * sh, wd = e.w * 0.24, glow = Math.max(0, 1 - Math.abs(i - hot) / 2.2);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + wd, y - wd * 0.2); c.lineTo(x + wd + dx, y - wd * 0.2 - dy); c.lineTo(x + dx, y - dy); c.closePath(); c.globalAlpha = 0.07 + glow * 0.4; c.fill(); c.globalAlpha = 0.3 + glow * 0.4; c.stroke();
      c.beginPath(); c.moveTo(x + dx, y - dy); c.lineTo(x + dx, y - dy - sh + dy); c.lineTo(x + wd + dx, y - wd * 0.2 - sh); c.lineTo(x + wd + dx, y - wd * 0.2 - dy); c.globalAlpha = 0.04 + glow * 0.12; c.fill();
    }
  } },

  /* Tempo — rev counter */
  gauge: { draw(c, e) {
    const cx = e.w * 0.8, cy = e.h * 0.6, R = Math.min(e.w, e.h) * 0.56, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, span = a1 - a0; c.lineCap = 'butt';
    c.strokeStyle = e.fg; c.lineWidth = 1; c.globalAlpha = 0.24; c.beginPath(); c.arc(cx, cy, R, a0, a1); c.stroke(); c.beginPath(); c.arc(cx, cy, R * 0.72, a0, a1); c.stroke();
    c.strokeStyle = e.ac; c.lineWidth = R * 0.05; c.globalAlpha = 0.6; c.beginPath(); c.arc(cx, cy, R * 0.955, a0 + span * 0.8, a1); c.stroke();
    c.font = `italic 300 ${Math.round(R * 0.09)}px 'Cormorant Garamond', serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (let i = 0; i <= 50; i++) { const a = a0 + span * i / 50, big = i % 5 === 0, r1 = R * (big ? 0.88 : 0.93); c.strokeStyle = c.fillStyle = i >= 40 ? e.ac : e.fg; c.lineWidth = big ? 2 : 1; c.globalAlpha = big ? 0.5 : 0.26; line(c, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * R * 0.985, cy + Math.sin(a) * R * 0.985); if (big) { c.globalAlpha = 0.4; c.fillText(String(i / 5), cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8); } }
    const cyc = (e.t * 0.32) % 1, rev = cyc < 0.7 ? Math.pow(cyc / 0.7, 0.6) : 1 - (cyc - 0.7) / 0.3 * 0.75, v = 0.2 + rev * 0.74 + Math.sin(e.t * 31) * 0.006 * rev, a = a0 + span * v;
    c.strokeStyle = e.ac; c.globalAlpha = 0.85; c.lineWidth = 2.5; line(c, cx - Math.cos(a) * R * 0.1, cy - Math.sin(a) * R * 0.1, cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    c.fillStyle = e.fg; c.globalAlpha = 0.5; c.beginPath(); c.arc(cx, cy, R * 0.035, 0, TAU); c.fill();
  } },

  /* Love Shot — the diamond */
  facets: { draw(c, e) {
    const cx = e.w * 0.8, cy = e.h * 0.46, S = Math.min(e.w, e.h) * 0.42, top = cy - S * 0.55, gird = cy - S * 0.18, tip = cy + S * 0.78;
    const T = [-0.52, -0.26, 0, 0.26, 0.52].map(k => cx + S * k), G = [-1, -0.62, -0.22, 0.22, 0.62, 1].map(k => cx + S * k);
    const tri = (pts, i) => { c.beginPath(); pts.forEach(([x, y], k) => c[k ? 'lineTo' : 'moveTo'](x, y)); c.closePath(); const p = Math.max(0, Math.sin(e.t * 0.9 + i * 1.9)) ** 5; c.fillStyle = i === 7 ? e.ac2 : e.ac; c.globalAlpha = p * 0.22; c.fill(); c.globalAlpha = 0.34; c.stroke(); };
    c.strokeStyle = e.ac; c.lineWidth = 1; let n = 0;
    for (let i = 0; i < 4; i++) tri([[T[i], top], [T[i + 1], top], [G[i + 1], gird]], n++);
    for (let i = 0; i < 5; i++) tri([[G[i], gird], [G[i + 1], gird], [T[Math.min(i, 4)], top]], n++);
    for (let i = 0; i < 5; i++) tri([[G[i], gird], [G[i + 1], gird], [cx, tip]], n++);
    const r = rng(4); c.strokeStyle = e.fg;
    for (let i = 0; i < 9; i++) { const x = cx + (r() - 0.5) * S * 3, y = cy + (r() - 0.5) * S * 2.2, k = Math.max(0, Math.sin(e.t * 1.3 + i * 2.3)) ** 8, s = 4 + r() * 12; c.globalAlpha = k * 0.8; line(c, x - s, y, x + s, y); line(c, x, y - s, x, y + s); }
  } },

  /* Obsession — EXO vs X-EXO */
  flags: { draw(c, e) {
    const flag = (px, py, W, H, dir, col, ph) => {
      c.strokeStyle = col; c.lineWidth = 1; c.globalAlpha = 0.5; line(c, px, py - H * 0.1, px, py + H * 1.9);
      const pt = (u, v) => { const wv = Math.sin(u * 5.2 - e.t * 1.7 + ph) * H * 0.09 * u + Math.sin(u * 2.3 - e.t * 1.1 + v * 2 + ph) * H * 0.05 * u; return [px + dir * u * W, py + v * H + wv + u * H * 0.08]; };
      for (let j = 0; j <= 12; j++) { c.globalAlpha = j === 0 || j === 12 ? 0.5 : 0.2; c.beginPath(); for (let i = 0; i <= 40; i++) { const [x, y] = pt(i / 40, j / 12); c[i ? 'lineTo' : 'moveTo'](x, y); } c.stroke(); }
      for (let i = 0; i <= 10; i++) { c.globalAlpha = i === 10 ? 0.5 : 0.12; c.beginPath(); for (let j = 0; j <= 12; j++) { const [x, y] = pt(i / 10, j / 12); c[j ? 'lineTo' : 'moveTo'](x, y); } c.stroke(); }
    };
    flag(e.w * 0.5, e.h * 0.1, e.w * 0.3, e.h * 0.3, 1, e.ac, 0);
    flag(e.w * 0.98, e.h * 0.46, e.w * 0.3, e.h * 0.3, -1, e.ac2, 2.4);
  } },

  /* Don't Fight the Feeling — signal acquired */
  radar: {
    init(e, r) { return Array.from({ length: 9 }, () => ({ a: r() * TAU, d: 0.15 + r() * 0.8 })); },
    draw(c, e, s) {
      const cx = e.w * 0.78, cy = e.h * 0.5, R = Math.min(e.w, e.h) * 0.62, sw = (e.t * 0.7) % TAU; c.strokeStyle = c.fillStyle = e.ac; c.lineWidth = 1;
      for (let i = 1; i <= 5; i++) { c.globalAlpha = 0.24; c.beginPath(); c.arc(cx, cy, R * i / 5, 0, TAU); c.stroke(); }
      c.globalAlpha = 0.16; line(c, cx - R, cy, cx + R, cy); line(c, cx, cy - R, cx, cy + R);
      for (let i = 0; i < 36; i++) { const a = i * TAU / 36; c.globalAlpha = 0.34; line(c, cx + Math.cos(a) * R * 0.98, cy + Math.sin(a) * R * 0.98, cx + Math.cos(a) * R * 1.02, cy + Math.sin(a) * R * 1.02); }
      for (let i = 0; i < 26; i++) { c.globalAlpha = 0.16 * (1 - i / 26); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, sw - (i + 1) * 0.035, sw - i * 0.035); c.closePath(); c.fill(); }
      c.globalAlpha = 0.8; line(c, cx, cy, cx + Math.cos(sw) * R, cy + Math.sin(sw) * R);
      for (const b of s) { const since = ((sw - b.a) % TAU + TAU) % TAU, k = Math.max(0, 1 - since / 3.6); c.globalAlpha = k * 0.9; c.beginPath(); c.arc(cx + Math.cos(b.a) * R * b.d, cy + Math.sin(b.a) * R * b.d, 3.2, 0, TAU); c.fill(); c.globalAlpha = k * 0.3; c.beginPath(); c.arc(cx + Math.cos(b.a) * R * b.d, cy + Math.sin(b.a) * R * b.d, 3 + (1 - k) * 22, 0, TAU); c.stroke(); }
    },
  },

  /* EXIST — a flare in the dark */
  burst: {
    init(e, r) { return Array.from({ length: 150 }, () => ({ a: r() * TAU, l: 0.25 + r() * 0.75, ph: r() * 6, sp: 0.3 + r(), k: r() })); },
    draw(c, e, s) {
      const cx = e.w * 0.22, cy = e.h * 0.5, R = Math.hypot(e.w, e.h) * 0.62; c.lineCap = 'round';
      for (const p of s) {
        const pulse = 0.55 + 0.45 * Math.sin(e.t * p.sp + p.ph), r0 = R * 0.16, r1 = r0 + R * p.l * pulse, a = p.a + e.t * 0.012;
        const g = c.createLinearGradient(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.addColorStop(0, p.k > 0.45 ? e.ac : e.ac2); g.addColorStop(1, 'transparent');
        c.strokeStyle = g; c.globalAlpha = 0.16 + p.k * 0.34; c.lineWidth = 0.6 + p.k * 1.8; line(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      }
    },
  },

  /* REVERXE — ridgelines of a wasteland */
  terrain: { draw(c, e) {
    const rows = 24, top = e.h * 0.3, step = (e.h * 0.82) / rows; c.strokeStyle = e.ac; c.fillStyle = e.bg; c.lineWidth = 1;
    for (let i = 0; i < rows; i++) {
      const y0 = top + i * step, amp = 26 + i * 3.4; c.beginPath(); c.moveTo(-2, e.h + 4);
      for (let x = -2; x <= e.w + 8; x += 8) { const env = Math.exp(-(((x / e.w - 0.68) / 0.3) ** 2)), n = noise(x * 0.006 + i * 0.37, e.t * 0.08 + i * 0.5); c.lineTo(x, y0 - Math.max(0, n * 0.9 + 0.35) * amp * (0.25 + env * 1.4)); }
      c.lineTo(e.w + 8, e.h + 4); c.closePath(); c.globalAlpha = 0.8; c.fill(); c.globalAlpha = 0.1 + 0.22 * (i / rows); c.stroke();
    }
  } },

  /* Member superpower motifs (used for solo albums, tinted by album cover palette) */
  power_xiumin: {
    init(e, r) { return Array.from({ length: 28 }, () => ({ x: r() * e.w, y: r() * e.h, s: 8 + r() * 18, sp: 0.2 + r() * 0.5, ph: r() * 6 })); },
    draw(c, e, s) {
      c.strokeStyle = e.ac; c.lineWidth = 1;
      for (const p of s) {
        c.globalAlpha = 0.14 + 0.22 * Math.abs(Math.sin(e.t * p.sp + p.ph));
        for (let k = 0; k < 3; k++) { const a = p.ph + e.t * 0.06 + k * Math.PI / 3; line(c, p.x - Math.cos(a) * p.s, p.y - Math.sin(a) * p.s, p.x + Math.cos(a) * p.s, p.y + Math.sin(a) * p.s); }
      }
    },
  },
  power_suho: {
    init(e, r) { return Array.from({ length: 5 }, (_, i) => ({ x: e.w * (0.62 + r() * 0.3), y: e.h * (0.25 + r() * 0.55), ph: i * 1.3 })); },
    draw(c, e, s) {
      c.strokeStyle = e.ac; c.lineWidth = 1.2;
      for (const p of s) {
        const k = (e.t * 0.28 + p.ph) % 1;
        c.globalAlpha = (1 - k) * 0.38;
        c.beginPath(); c.ellipse(p.x, p.y, 20 + k * Math.min(e.w, e.h) * 0.42, (20 + k * Math.min(e.w, e.h) * 0.42) * 0.48, -0.15, 0, TAU); c.stroke();
      }
    },
  },
  power_lay: {
    init(e, r) { return Array.from({ length: 24 }, () => ({ x: r() * e.w, y: r() * e.h, r: 4 + r() * 14, sp: 6 + r() * 14, ph: r() * 6 })); },
    draw(c, e, s) {
      c.strokeStyle = c.fillStyle = e.ac; c.lineWidth = 1;
      for (const p of s) {
        const y = ((p.y - e.t * p.sp) % (e.h + 30) + e.h + 30) % (e.h + 30) - 15;
        c.globalAlpha = 0.16 + 0.22 * Math.sin(e.t * 1.1 + p.ph);
        c.beginPath(); c.arc(p.x + Math.sin(e.t * 0.7 + p.ph) * 8, y, p.r, 0, TAU); c.stroke();
      }
    },
  },
  power_baekhyun: { draw(c, e) {
    const cx = e.w * 0.76, cy = e.h * 0.38, R = Math.hypot(e.w, e.h) * 0.7; c.strokeStyle = e.ac; c.lineWidth = 1.1;
    for (let i = 0; i < 18; i++) { const a = e.t * 0.04 + i * TAU / 18; c.globalAlpha = 0.09 + 0.16 * Math.abs(Math.sin(e.t * 0.8 + i)); line(c, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24, cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
  } },
  power_chen: { draw(c, e) {
    c.strokeStyle = e.ac; c.lineWidth = 1.3; const k = Math.floor(e.t * 2); const r = rng(k + 19);
    for (let b = 0; b < 3; b++) {
      let x = e.w * (0.55 + r() * 0.35), y = 0; c.globalAlpha = 0.18 + r() * 0.28; c.beginPath(); c.moveTo(x, y);
      while (y < e.h) { y += 18 + r() * 26; x += (r() - 0.5) * 34; c.lineTo(x, y); }
      c.stroke();
    }
  } },
  power_chanyeol: {
    init(e, r) { return Array.from({ length: 36 }, () => ({ x: r() * e.w, y: r() * e.h, r: 1.5 + r() * 3.5, vy: 18 + r() * 34, ph: r() * 6 })); },
    draw(c, e, s) {
      c.fillStyle = e.ac;
      for (const p of s) {
        p.y -= p.vy * e.dt; if (p.y < -10) { p.y = e.h + 10; }
        c.globalAlpha = 0.22 + 0.35 * Math.abs(Math.sin(e.t * 1.4 + p.ph));
        c.beginPath(); c.arc(p.x + Math.sin(e.t * 1.6 + p.ph) * 10, p.y, p.r, 0, TAU); c.fill();
      }
    },
  },
  power_do: { draw(c, e) {
    const cx = e.w * 0.76, cy = e.h * 0.52, R = Math.min(e.w, e.h) * 0.54; c.strokeStyle = e.ac; c.lineWidth = 1.2;
    for (let i = 1; i <= 5; i++) { c.globalAlpha = 0.28 - i * 0.04; poly(c, cx, cy, R * i / 5, 6, e.t * 0.03 * (i % 2 ? 1 : -1)); c.stroke(); }
  } },
  power_kai: { draw(c, e) {
    const cx = e.w * 0.76, cy = e.h * 0.48, R = Math.min(e.w, e.h) * 0.45; c.strokeStyle = e.ac; c.lineWidth = 1.1;
    for (let i = 0; i < 4; i++) { const k = (e.t * 0.22 + i * 0.25) % 1; c.globalAlpha = (1 - k) * 0.42; c.beginPath(); c.arc(cx, cy, R * k, 0, TAU); c.stroke(); }
  } },
  power_sehun: { draw(c, e) {
    c.strokeStyle = e.ac; c.lineWidth = 1.1;
    for (let i = 0; i < 7; i++) {
      const y0 = e.h * (0.16 + i * 0.11); c.globalAlpha = 0.12 + 0.14 * (i % 2); c.beginPath();
      for (let x = 0; x <= e.w; x += 18) { const y = y0 + Math.sin(x * 0.009 - e.t * (0.9 + i * 0.12) + i) * 18; c[x ? 'lineTo' : 'moveTo'](x, y); }
      c.stroke();
    }
  } },
};

export function createAlbumFx(cv) {
  const c = cv.getContext('2d');
  const e = { w: 0, h: 0, t: 0, dt: 0.016, ac: '#fff', ac2: '#fff', fg: '#fff', bg: '#000', light: false };
  let name = '', state = null, raf = 0, vis = false, last = 0, swapT = 0;
  cv.style.transition = 'opacity .7s';
  const init = () => { const m = M[name]; state = m && m.init ? m.init(e, rng(1234)) : null; };
  const resize = () => { const dpr = Math.min(window.devicePixelRatio || 1, 1.5); e.w = cv.clientWidth; e.h = cv.clientHeight; if (!e.w || !e.h) return; cv.width = Math.round(e.w * dpr); cv.height = Math.round(e.h * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0); init(); if (reduced) drawOnce(); };
  const paint = () => { const m = M[name]; c.clearRect(0, 0, e.w, e.h); if (!m) return; c.save(); try { m.draw(c, e, state); } catch (err) { console.warn('albumfx', name, err); } c.restore(); c.globalAlpha = 1; };
  const drawOnce = () => { e.t = 7.3; e.dt = 0; paint(); };
  const loop = now => { raf = 0; if (!vis || document.hidden) return; e.dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; e.t += e.dt; paint(); raf = requestAnimationFrame(loop); };
  const kick = () => { if (reduced) { drawOnce(); return; } if (!raf && vis && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  new IntersectionObserver(es => { vis = es[0].isIntersecting; kick(); }, { rootMargin: '100px' }).observe(cv);
  document.addEventListener('visibilitychange', kick);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv); else window.addEventListener('resize', resize);
  return {
    set(fx, skin, light) {
      clearTimeout(swapT); cv.style.opacity = '0';
      swapT = setTimeout(() => {
        name = fx; e.ac = skin.ac; e.ac2 = skin.ac2 || skin.ac; e.fg = skin.fg; e.bg = skin.bg; e.light = light;
        if (!e.w) resize(); else init();
        cv.style.opacity = '1'; kick();
      }, name ? 320 : 0);
    },
    names: Object.keys(M),
  };
}
