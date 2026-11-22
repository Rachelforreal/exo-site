// Vibe Motion Engine:
// - #018 Holo Card pointer specular tracking (--lx, --ly)
// - #013 Shockwave Glow chromatic ring on search / guestbook submit
// - #014 Card Delete blocks+plume particle shatter & 520ms spring sibling reflow
// - #016 Action Toast with 5s Undo button
// - Asterloom & @黄白 elastic spring wobble + magnetic button pull + footer lightstick easter egg
import { $, $$, reduced } from './util.js';

const EGG_LINES = [
  '✨ 银海应援已点亮 · WE ARE ONE, EXO 사랑하자!',
  '🪐 第 5,339 号行星观测正常 · 今天也在同一片银海下',
  '🤍 爱丽棒信号已同步 · 2012.04.08 → ∞',
  '💿 站长收到一份来自 EXOPLANET 的星光应援',
];
let eggIdx = 0;

/* ---------- #013 Chromatic Shockwave Halo ---------- */
export function triggerShockwave(targetEl) {
  if (reduced || !targetEl) return;
  const r = targetEl.getBoundingClientRect();
  if (!r.width && !r.height) return;
  const wave = document.createElement('div');
  wave.className = 'vibe-shockwave';
  wave.style.setProperty('--sx', `${(r.left + r.width / 2).toFixed(1)}px`);
  wave.style.setProperty('--sy', `${(r.top + r.height / 2).toFixed(1)}px`);
  document.body.append(wave);
  setTimeout(() => wave.remove(), 960);
}

/* ---------- #014 Card Delete: Blocks + Plume Disintegration & 520ms Spring Reflow ---------- */
export function shatterAndRemove(cardEl, onDone) {
  if (!cardEl || reduced) {
    onDone?.();
    return;
  }
  const rect = cardEl.getBoundingClientRect();
  const parent = cardEl.parentElement;
  const siblings = parent ? [...parent.children].filter(c => c !== cardEl && c.offsetParent !== null) : [];
  const beforeTops = new Map(siblings.map(s => [s, s.getBoundingClientRect().top]));

  // Spawn 20 fragmented blocks + ash plume particles (#014-card-delete Blocks + Plume)
  const cs = getComputedStyle(document.documentElement);
  const ac = cs.getPropertyValue('--ac').trim() || '#5b8cff';
  const ink = cs.getPropertyValue('--ink').trim() || '#111625';
  const surf = cs.getPropertyValue('--surface').trim() || '#faf9f6';
  const palette = [ac, ink, surf, '#8fb8ff', '#ffd59e'];

  const count = 20;
  for (let i = 0; i < count; i++) {
    const f = document.createElement('i');
    f.className = 'vibe-frag';
    const size = 5 + (i % 4) * 3;
    const x0 = rect.left + ((i + 0.5) / count) * rect.width + (Math.random() - 0.5) * 18;
    const y0 = rect.top + rect.height * (0.25 + Math.random() * 0.55);
    const dx = (Math.random() - 0.5) * 110;
    const dy = -24 - Math.random() * 68;
    const rot = (Math.random() - 0.5) * 220;
    f.style.width = `${size}px`;
    f.style.height = `${size}px`;
    f.style.background = palette[i % palette.length];
    f.style.boxShadow = `0 0 10px ${ac}`;
    document.body.append(f);
    f.animate(
      [
        { transform: `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0) scale(1) rotate(0deg)`, opacity: 0.95 },
        { transform: `translate3d(${(x0 + dx).toFixed(1)}px, ${(y0 + dy).toFixed(1)}px, 0) scale(0.15) rotate(${rot.toFixed(0)}deg)`, opacity: 0 },
      ],
      { duration: 460 + Math.random() * 240, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' }
    );
    setTimeout(() => f.remove(), 740);
  }

  // Collapse card over 240ms, then run callback & 520ms FLIP spring on siblings
  const anim = cardEl.animate(
    [
      { opacity: 1, transform: 'scale(1) rotateX(0deg)', filter: 'blur(0px)' },
      { opacity: 0, transform: 'scale(.88) translate3d(0, -10px, 0)', filter: 'blur(6px)' },
    ],
    { duration: 240, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' }
  );

  const finish = () => {
    onDone?.();
    // 520ms spring layout reflow for new DOM children in the same container
    if (!parent) return;
    requestAnimationFrame(() => {
      for (const [s, oldTop] of beforeTops.entries()) {
        if (!s.isConnected) continue;
        const dy = oldTop - s.getBoundingClientRect().top;
        if (Math.abs(dy) > 2) {
          s.animate(
            [{ transform: `translate3d(0, ${dy.toFixed(1)}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
            { duration: 520, easing: 'cubic-bezier(.22, 1.28, .36, 1)' }
          );
        }
      }
    });
  };
  if (anim?.finished) anim.finished.then(finish).catch(finish);
  else setTimeout(finish, 240);
}

/* ---------- Elastic Jelly Wobble (@黄白 Q弹回弹) ---------- */
export function springWobble(el) {
  if (reduced || !el?.animate) return;
  el.animate(
    [
      { transform: 'scale3d(1, 1, 1)' },
      { transform: 'scale3d(1.13, .87, 1)' },
      { transform: 'scale3d(.93, 1.07, 1)' },
      { transform: 'scale3d(1.03, .98, 1)' },
      { transform: 'scale3d(1, 1, 1)' },
    ],
    { duration: 460, easing: 'cubic-bezier(.22, 1, .36, 1)' }
  );
}

/* ---------- Boot All Global Vibe Motion Listeners ---------- */
export function initVibeMotion() {
  if (document.documentElement._vibeMotionBound) return;
  document.documentElement._vibeMotionBound = true;

  if (!reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // 1. #018 Holo Card pointer tracking (--lx, --ly)
    let rafId = 0, lastEv = null;
    window.addEventListener('pointermove', e => {
      lastEv = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const ev = lastEv;
        if (!ev) return;
        const card = ev.target?.closest?.('.mag, .portal-card, .mcard, .mstrip-card, .studio__card, .gb-card, .ch, .next, .ev, .vr');
        if (card) {
          const r = card.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            const lx = ((ev.clientX - r.left) / r.width) * 100;
            const ly = ((ev.clientY - r.top) / r.height) * 100;
            card.style.setProperty('--lx', `${lx.toFixed(1)}%`);
            card.style.setProperty('--ly', `${ly.toFixed(1)}%`);
          }
        }
      });
    }, { passive: true });
  }

  // 2. Elastic spring wobble on plush shelf cards, cover sigils, bookmarks, and guestbook planet badges
  document.addEventListener('click', e => {
    const jelly = e.target.closest('.plush-card, .sigil-pick, .gb__badge-btn, .pick, .road-bm, .mag__flip-btn');
    if (jelly) springWobble(jelly);
  });

  // 3. #013 Shockwave Glow on command palette search & schedule search submit/change
  document.addEventListener('focusin', e => {
    const inp = e.target.closest('#palette-q, #sched-q, #road-query, #var-q');
    if (inp) triggerShockwave(inp);
  });

  // 4. Counter digit flip observer on #count
  const countEl = $('#count');
  if (countEl && 'MutationObserver' in window && !reduced) {
    let prevDigits = [];
    const mo = new MutationObserver(() => {
      const bs = $$('b', countEl);
      bs.forEach((b, i) => {
        if (prevDigits[i] !== undefined && prevDigits[i] !== b.textContent) {
          b.classList.add('is-tick');
        }
        prevDigits[i] = b.textContent;
      });
    });
    mo.observe(countEl, { childList: true, subtree: true });
  }

  // 5. Playful Human Easter Egg on footer `.foot__love` (inspired by vibedesign.tips cat easter egg)
  $$('.foot__love').forEach(el => {
    el.setAttribute('title', '点击点亮银海应援 ✨');
    el.addEventListener('click', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX || (r.left + r.width / 2);
      const y = e.clientY || r.top;
      const tip = document.createElement('div');
      tip.className = 'foot__love-egg';
      tip.textContent = EGG_LINES[eggIdx++ % EGG_LINES.length];
      tip.style.left = `${Math.min(window.innerWidth - 150, Math.max(150, x))}px`;
      tip.style.top = `${Math.max(40, y - 16)}px`;
      document.body.append(tip);
      triggerShockwave(el);
      setTimeout(() => tip.remove(), 2250);
    });
  });

  // 6. Smooth page-turn settle & photocard reset when switching cover member
  document.addEventListener('click', e => {
    if (e.target.closest('.sigil-pick, .mag-nav, [data-cover-step]')) {
      const m = $('.mag');
      const frame = $('[data-cover-frame]') || $('.mag__ph');
      const flipBtn = $('[data-cover-flip]');
      if (frame?.classList.contains('is-flipped')) {
        frame.classList.remove('is-flipped');
        if (flipBtn) {
          flipBtn.setAttribute('aria-pressed', 'false');
          flipBtn.textContent = '翻看小卡背面 ↺';
        }
      }
      if (m && !reduced) {
        m.classList.remove('is-turning');
        void m.offsetWidth;
        m.classList.add('is-turning');
        setTimeout(() => m.classList.remove('is-turning'), 700);
      }
    }
  });

  // 7. Silky Scroll-Linked Stagger Reveal for below-the-fold sections & cards
  if ('IntersectionObserver' in window && !reduced) {
    const revealTargets = $$('.sec .sec__head, .portal-card, .plush-card, .era-shot, .level');
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

    revealTargets.forEach((el, idx) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.92) {
        el.classList.add('vibe-reveal');
        el.style.setProperty('--stagger', `${(idx % 5) * 55}ms`);
        io.observe(el);
      }
    });
  }

  // 8. "Which year did you land?" EXO-L Era Onboarding Boarding Pass Ritual
  const eraMount = $('#exoEraMount') || $('.issue__side');
  if (eraMount && !$('#exoEraAnchor')) {
    const ERAS = [
      { id: '2012', date: '2012-04-08', label: '2012 · MAMA 初遇', note: '从百日 23 支预告起，看着十二道光降落未知行星的那一年。' },
      { id: '2013', date: '2013-08-05', label: '2013 · 咆哮入坑', note: '校服和一镜到底的《Growl》，整个夏天都在循环的百万奇迹。' },
      { id: '2015', date: '2015-03-30', label: '2015 · 约定之年', note: '「谢谢你等我」，每次听到《Promise》前奏还是会鼻酸。' },
      { id: '2016', date: '2016-06-09', label: '2016 · Monster', note: '白昼与暗黑双概念封神，舞台上永远的教科书。' },
      { id: '2018', date: '2018-11-02', label: '2018 · Tempo', note: '那段无伴奏阿卡贝拉一出来，就知道还是无人能替的 EXO。' },
      { id: '2021', date: '2021-06-07', label: '2021 · DFTF 归来', note: '军白期里像收到一封来自宇宙航母的家书，心一下子就定了。' },
      { id: '2023', date: '2023-07-10', label: '2023 · EXIST', note: '十年之后依然清爽游刃有余的《Cream Soda》盛夏重逢。' },
      { id: '2026', date: '2026-01-19', label: '2026 · REVERXE', note: '全员军毕合流后的正规八辑，新的十四年也一起走下去。' }
    ];
    let picked = localStorage.getItem('exo-era-anchor') || '2015';
    const box = document.createElement('div');
    box.id = 'exoEraAnchor';
    box.className = 'exo-era-anchor';
    const renderAnchor = () => {
      const cur = ERAS.find(x => x.id === picked) || ERAS[2];
      const days = Math.max(1, Math.floor((Date.now() - new Date(cur.date).getTime()) / 86400000));
      box.innerHTML = `
        <div class="exo-era-anchor__head">
          <span class="exo-era-anchor__title">你是哪一年登上这颗星球的？</span>
          <span class="exo-era-anchor__sub">选择入坑节点，印进你的专属票根与 L 卡</span>
        </div>
        <div class="exo-era-anchor__chips">
          ${ERAS.map(er => `<button type="button" class="exo-era-chip" data-era-pick="${er.id}" aria-pressed="${er.id === picked}">${er.label}</button>`).join('')}
        </div>
        <div class="exo-era-boarding">
          <div class="exo-era-boarding__main">
            <div class="exo-era-boarding__days"><b>${days.toLocaleString()} 天</b><span>从 ${cur.id} 年走到今天</span></div>
            <p class="exo-era-anchor__note">${cur.note}</p>
          </div>
          <a class="exo-era-boarding__stamp" href="studio.html#card" title="去印制专属 EXO-L 入坑纪念卡">
            <span>CLASS OF</span>
            <b>${cur.id}</b>
          </a>
        </div>
      `;
      $$('[data-era-pick]', box).forEach(b => {
        b.addEventListener('click', () => {
          picked = b.dataset.eraPick;
          const matchEra = ERAS.find(x => x.id === picked);
          localStorage.setItem('exo-era-anchor', picked);
          if (matchEra) localStorage.setItem('exo-era-date', matchEra.date);
          springWobble(box);
          renderAnchor();
        });
      });
    };
    renderAnchor();
    eraMount.appendChild(box);
  }

  // 9. Sync top masthead Eribong lightstick collection badge with localStorage plushies
  const syncEribongBadge = () => {
    const badges = $$('[data-eribong-count]');
    if (!badges.length) return;
    let foundCount = 7;
    try {
      const raw = JSON.parse(localStorage.getItem('exo-plush-found') || '[]');
      if (Array.isArray(raw) && raw.length > 0) foundCount = Math.min(7, raw.length);
    } catch {}
    badges.forEach(b => {
      b.textContent = `爱丽棒集章 ${foundCount}/7`;
      b.closest('.tool--eribong')?.classList.toggle('is-lit', foundCount >= 7);
    });
  };
  syncEribongBadge();
  window.addEventListener('storage', syncEribongBadge);
  document.addEventListener('click', e => {
    if (e.target.closest('.plush-card')) setTimeout(syncEribongBadge, 80);
  });
}
