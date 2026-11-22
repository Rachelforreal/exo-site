// 9 Bespoke Member Superpower Hover Visual Effects (60fps 2D Canvas Engine)
// Smoothly crossfades & reacts to cursor position/velocity without triggering DOM layout reflows.
import { reduced } from './util.js';

export function createPowerStripFX() {
  if (reduced) return { attach() {}, pointer() {}, stop() {} };

  const canvas = document.createElement('canvas');
  canvas.className = 'mpanel__fx';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');

  let host = null;
  let activeId = null;
  let rafId = 0;
  let w = 0, h = 0, dpr = 1;
  let mx = 0.5, my = 0.45, tx = 0.5, ty = 0.45, vx = 0, vy = 0;
  let particles = [];
  let ripples = [];
  let bolts = [];
  let t0 = performance.now();
  let fadeAlpha = 0;

  function resize() {
    if (!host) return;
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(r.width));
    h = Math.max(1, Math.round(r.height));
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
  }

  function seedParticles(id) {
    particles = [];
    ripples = [];
    bolts = [];
    const count = id === 'baekhyun' ? 26 : id === 'chen' ? 18 : 34;
    for (let i = 0; i < count; i++) {
      particles.push(makeParticle(id, true));
    }
    if (id === 'suho' || id === 'do') {
      ripples.push({ x: 0.5, y: 0.55, r: 12, maxR: 150, a: 0.65 });
    }
  }

  function makeParticle(id, randomY = false) {
    const p = {
      x: Math.random(),
      y: randomY ? Math.random() : (id === 'xiumin' ? -0.06 : 1.06),
      s: 0.4 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.002,
      vy: 0,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.03,
      life: Math.random(),
      phase: Math.random() * Math.PI * 2,
    };
    if (id === 'xiumin') {
      p.vy = 0.0018 + Math.random() * 0.0026;
      p.vx = (Math.random() - 0.5) * 0.0018;
    } else if (id === 'suho') {
      p.vy = -(0.0016 + Math.random() * 0.0028);
    } else if (id === 'lay') {
      p.vy = -(0.0012 + Math.random() * 0.0022);
    } else if (id === 'baekhyun') {
      p.x = Math.random();
      p.y = Math.random();
    } else if (id === 'chanyeol') {
      p.y = randomY ? Math.random() : 1.05;
      p.vy = -(0.0035 + Math.random() * 0.0055);
      p.vx = (Math.random() - 0.5) * 0.003;
    } else if (id === 'do') {
      p.y = randomY ? Math.random() : 1.02;
      p.vy = -(0.0009 + Math.random() * 0.0016);
      p.sides = 4 + Math.floor(Math.random() * 3);
    } else if (id === 'kai') {
      p.angle = Math.random() * Math.PI * 2;
      p.dist = 20 + Math.random() * 160;
      p.speed = 0.018 + Math.random() * 0.025;
    } else if (id === 'sehun') {
      p.x = randomY ? Math.random() : -0.15;
      p.y = 0.12 + Math.random() * 0.78;
      p.vx = 0.008 + Math.random() * 0.012;
      p.len = 45 + Math.random() * 85;
    }
    return p;
  }

  function makeBolt(x1, y1, x2, y2) {
    const pts = [{ x: x1, y: y1 }];
    const steps = 7;
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      const jitter = (1 - Math.abs(k - 0.5) * 1.5) * 34;
      pts.push({
        x: x1 + (x2 - x1) * k + (Math.random() - 0.5) * jitter,
        y: y1 + (y2 - y1) * k + (Math.random() - 0.5) * jitter,
      });
    }
    pts.push({ x: x2, y: y2 });
    return { pts, life: 1 };
  }

  function drawCrystal(x, y, r, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.closePath();
    ctx.moveTo(-r * 1.35, 0); ctx.lineTo(r * 1.35, 0);
    ctx.moveTo(0, -r * 1.35); ctx.lineTo(0, r * 1.35);
    ctx.stroke();
    ctx.restore();
  }

  function tick(now) {
    if (!host || !activeId) { rafId = 0; return; }
    resize();
    const dt = Math.min(32, now - t0) / 16.67;
    t0 = now;
    fadeAlpha = Math.min(1, fadeAlpha + 0.08 * dt);

    const prevMx = mx, prevMy = my;
    mx += (tx - mx) * 0.16;
    my += (ty - my) * 0.16;
    vx = (mx - prevMx) * w;
    vy = (my - prevMy) * h;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = fadeAlpha;
    ctx.globalCompositeOperation = 'screen';

    const cx = mx * w, cy = my * h;
    const sec = now * 0.001;

    if (activeId === 'xiumin') {
      // Icy frost rim + drifting diamond snow-crystals
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.55);
      g.addColorStop(0, 'rgba(195, 232, 255, 0.28)');
      g.addColorStop(0.6, 'rgba(130, 195, 255, 0.08)');
      g.addColorStop(1, 'rgba(130, 195, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(225, 245, 255, 0.78)';
      ctx.lineWidth = 1.25;
      for (const p of particles) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(sec * 1.8 + p.phase) * 0.0008) * dt;
        p.rot += p.vr * dt;
        if (p.y > 1.06) Object.assign(p, makeParticle('xiumin', false));
        drawCrystal(p.x * w, p.y * h, 3.5 + p.s * 4.5, p.rot);
      }
    } else if (activeId === 'suho') {
      // Water caustics + interactive ripples + rising hydro pearls
      if (Math.hypot(vx, vy) > 1.8 && ripples.length < 7 && Math.random() < 0.35) {
        ripples.push({ x: mx, y: my, r: 6, maxR: 110 + Math.random() * 60, a: 0.62 });
      }
      if (Math.random() < 0.03 && ripples.length < 5) {
        ripples.push({ x: 0.2 + Math.random() * 0.6, y: 0.3 + Math.random() * 0.5, r: 6, maxR: 125, a: 0.48 });
      }
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 220);
      g.addColorStop(0, 'rgba(111, 193, 255, 0.28)');
      g.addColorStop(1, 'rgba(63, 125, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 1.9 * dt;
        rp.a *= Math.pow(0.968, dt);
        if (rp.r > rp.maxR || rp.a < 0.03) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(155, 218, 255, ${rp.a.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(rp.x * w, rp.y * h, rp.r, rp.r * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const p of particles) {
        p.y += p.vy * dt;
        p.x += Math.sin(sec * 2 + p.phase) * 0.001 * dt;
        if (p.y < -0.05) Object.assign(p, makeParticle('suho', false));
        const r = 2 + p.s * 3.8;
        ctx.fillStyle = 'rgba(185, 232, 255, 0.55)';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (activeId === 'lay') {
      // Healing violet-gold aura pulse + rising luminous motes
      const pulse = 0.85 + Math.sin(sec * 2.4) * 0.15;
      const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 230 * pulse);
      g.addColorStop(0, 'rgba(222, 186, 255, 0.30)');
      g.addColorStop(0.5, 'rgba(255, 226, 168, 0.12)');
      g.addColorStop(1, 'rgba(180, 140, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = `rgba(232, 205, 255, ${(0.28 * pulse).toFixed(3)})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, 52 + Math.sin(sec * 2.4) * 12, 0, Math.PI * 2);
      ctx.stroke();

      for (const p of particles) {
        p.y += p.vy * dt;
        p.x += Math.sin(sec * 1.5 + p.phase) * 0.0012 * dt;
        if (p.y < -0.05) Object.assign(p, makeParticle('lay', false));
        const px = p.x * w, py = p.y * h, r = 1.8 + p.s * 2.8;
        const twinkle = 0.45 + 0.55 * Math.sin(sec * 3.2 + p.phase);
        ctx.fillStyle = p.s > 0.85
          ? `rgba(255, 236, 179, ${(0.78 * twinkle).toFixed(3)})`
          : `rgba(220, 190, 255, ${(0.72 * twinkle).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(px, py - r * 2);
        ctx.quadraticCurveTo(px, py, px + r * 2, py);
        ctx.quadraticCurveTo(px, py, px, py + r * 2);
        ctx.quadraticCurveTo(px, py, px - r * 2, py);
        ctx.quadraticCurveTo(px, py, px, py - r * 2);
        ctx.fill();
      }
    } else if (activeId === 'baekhyun') {
      // Solar volumetric sunbeams + 16-ray prism flare
      ctx.save();
      ctx.translate(cx, cy * 0.72);
      for (let i = 0; i < 8; i++) {
        const ang = sec * 0.18 + (i * Math.PI) / 4;
        ctx.save();
        ctx.rotate(ang);
        const lg = ctx.createLinearGradient(0, 0, 0, h * 0.9);
        lg.addColorStop(0, 'rgba(255, 236, 175, 0.20)');
        lg.addColorStop(1, 'rgba(255, 215, 120, 0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.lineTo(54, h * 0.9);
        ctx.lineTo(-54, h * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      const halo = ctx.createRadialGradient(cx, cy, 4, cx, cy, 170);
      halo.addColorStop(0, 'rgba(255, 248, 214, 0.45)');
      halo.addColorStop(0.45, 'rgba(255, 212, 118, 0.16)');
      halo.addColorStop(1, 'rgba(255, 212, 118, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        const tw = Math.max(0, Math.sin(sec * 3.6 + p.phase));
        const px = p.x * w, py = p.y * h, r = (2 + p.s * 4) * tw;
        ctx.strokeStyle = `rgba(255, 246, 205, ${(0.8 * tw).toFixed(3)})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(px - r * 2, py); ctx.lineTo(px + r * 2, py);
        ctx.moveTo(px, py - r * 2); ctx.lineTo(px, py + r * 2);
        ctx.stroke();
      }
    } else if (activeId === 'chen') {
      // Electric branching lightning arcs + golden-violet thunder flash
      if (Math.random() < 0.16 * dt && bolts.length < 4) {
        const sx = cx + (Math.random() - 0.5) * 140;
        const sy = Math.max(20, cy - 110 + (Math.random() - 0.5) * 80);
        bolts.push(makeBolt(sx, sy, sx + (Math.random() - 0.5) * 130, sy + 120 + Math.random() * 110));
      }
      const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 220);
      g.addColorStop(0, 'rgba(255, 232, 145, 0.24)');
      g.addColorStop(0.6, 'rgba(130, 175, 255, 0.10)');
      g.addColorStop(1, 'rgba(130, 175, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.life -= 0.085 * dt;
        if (b.life <= 0) { bolts.splice(i, 1); continue; }
        ctx.save();
        ctx.shadowColor = 'rgba(255, 224, 110, 0.9)';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = `rgba(255, 248, 200, ${b.life.toFixed(3)})`;
        ctx.lineWidth = 2.1 * b.life;
        ctx.beginPath();
        b.pts.forEach((pt, idx) => (idx ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.stroke();
        ctx.restore();
      }
    } else if (activeId === 'chanyeol') {
      // Warm bottom flame corona + rising glowing embers
      const baseG = ctx.createLinearGradient(0, h, 0, h * 0.42);
      baseG.addColorStop(0, 'rgba(255, 102, 48, 0.36)');
      baseG.addColorStop(0.5, 'rgba(255, 168, 76, 0.12)');
      baseG.addColorStop(1, 'rgba(255, 102, 48, 0)');
      ctx.fillStyle = baseG;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.y += p.vy * dt;
        p.x += (p.vx + Math.sin(sec * 3 + p.phase) * 0.002) * dt;
        if (p.y < 0.05) Object.assign(p, makeParticle('chanyeol', false));
        const px = p.x * w, py = p.y * h;
        const glow = Math.min(1, p.y * 1.3);
        ctx.fillStyle = p.s > 0.8
          ? `rgba(255, 230, 140, ${(0.88 * glow).toFixed(3)})`
          : `rgba(255, 122, 69, ${(0.78 * glow).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.6 + p.s * 3.0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (activeId === 'do') {
      // Gravity shockwave rings + anti-gravity levitating mineral shards
      if (Math.random() < 0.028 * dt && ripples.length < 4) {
        ripples.push({ x: mx, y: Math.max(0.55, my), r: 14, maxR: 165, a: 0.55 });
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.r += 1.4 * dt;
        rp.a *= Math.pow(0.975, dt);
        if (rp.r > rp.maxR || rp.a < 0.03) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = `rgba(235, 185, 145, ${rp.a.toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(rp.x * w, rp.y * h, rp.r, rp.r * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(242, 206, 174, 0.72)';
      ctx.fillStyle = 'rgba(218, 165, 126, 0.28)';
      ctx.lineWidth = 1.2;
      for (const p of particles) {
        p.y += p.vy * dt;
        p.rot += p.vr * 0.6 * dt;
        if (p.y < 0.08) Object.assign(p, makeParticle('do', false));
        ctx.save();
        ctx.translate(p.x * w, p.y * h);
        ctx.rotate(p.rot);
        const r = 3 + p.s * 4.5;
        ctx.beginPath();
        for (let k = 0; k < (p.sides || 5); k++) {
          const a = (k / (p.sides || 5)) * Math.PI * 2;
          k === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    } else if (activeId === 'kai') {
      // Teleportation dimensional triangle & spinning portal rings
      ctx.save();
      ctx.translate(cx, cy);
      for (let ring = 0; ring < 2; ring++) {
        ctx.save();
        ctx.rotate(sec * (ring ? -0.9 : 1.2));
        const rad = 46 + ring * 34;
        ctx.strokeStyle = ring ? 'rgba(165, 123, 255, 0.42)' : 'rgba(255, 145, 205, 0.48)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([18, 12]);
        ctx.beginPath();
        ctx.arc(0, 0, rad, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Subtle portal triangle echo
      const tr = 66 + Math.sin(sec * 3) * 6;
      ctx.strokeStyle = 'rgba(255, 175, 220, 0.34)';
      ctx.setLineDash([]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, -tr);
      ctx.lineTo(tr * 0.866, tr * 0.5);
      ctx.lineTo(-tr * 0.866, tr * 0.5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      for (const p of particles) {
        p.angle += p.speed * dt;
        const px = cx + Math.cos(p.angle) * p.dist;
        const py = cy + Math.sin(p.angle) * p.dist * 0.78;
        const px2 = cx + Math.cos(p.angle - 0.24) * p.dist;
        const py2 = cy + Math.sin(p.angle - 0.24) * p.dist * 0.78;
        ctx.strokeStyle = 'rgba(255, 168, 224, 0.58)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px2, py2);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    } else if (activeId === 'sehun') {
      // Sweeping silky wind ribbons & swirling breeze currents
      ctx.lineCap = 'round';
      for (const p of particles) {
        p.x += p.vx * dt;
        if (p.x > 1.25) Object.assign(p, makeParticle('sehun', false));
        const x0 = p.x * w;
        const y0 = p.y * h + Math.sin(p.x * 5 + sec * 2.5 + p.phase) * 24;
        const lg = ctx.createLinearGradient(x0 - p.len, y0, x0, y0);
        lg.addColorStop(0, 'rgba(159, 240, 212, 0)');
        lg.addColorStop(0.6, 'rgba(159, 240, 212, 0.48)');
        lg.addColorStop(1, 'rgba(230, 255, 248, 0.08)');
        ctx.strokeStyle = lg;
        ctx.lineWidth = 1.3 + p.s * 1.4;
        ctx.beginPath();
        ctx.moveTo(x0 - p.len, y0 + 10);
        ctx.quadraticCurveTo(x0 - p.len * 0.45, y0 - 12, x0, y0);
        ctx.stroke();
      }
    }

    ctx.restore();
    rafId = requestAnimationFrame(tick);
  }

  return {
    attach(panelCard, memberId) {
      if (!panelCard) return;
      if (host !== panelCard || activeId !== memberId) {
        host = panelCard;
        activeId = memberId;
        fadeAlpha = 0.15;
        host.appendChild(canvas);
        resize();
        seedParticles(memberId);
        t0 = performance.now();
        if (!rafId) rafId = requestAnimationFrame(tick);
      }
    },
    pointer(nx, ny) {
      tx = Math.max(0.05, Math.min(0.95, nx));
      ty = Math.max(0.08, Math.min(0.92, ny));
    },
    stop() {
      activeId = null;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      canvas.remove();
      host = null;
    }
  };
}
