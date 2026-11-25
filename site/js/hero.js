// Hero: an endless, draggable film strip of group photos + the nine portraits, each with a clickable name capsule.
import { $, $$, esc, glyph, reduced, clamp, dayDiff, relDay, todayStr, eventState, isConfirmed, memberPrimaryPhoto } from './util.js';

export function initHero(ctx, { openMember, lenis }) {
  const film = $('#film'), track = $('#film-track'), dock = $('#dock');
  const by = ctx.byId;
  const chip = (id, clone) => { const m = by[id]; return m ? `<button class="mchip" type="button" data-member="${m.id}" style="--mc:${m.color}"${clone ? ' tabindex="-1"' : ''}><i><img src="${esc(m.thumb)}" alt="" loading="lazy"></i>${esc(m.en)}</button>` : ''; };
  const frameHTML = (f, clone) => {
    const hide = clone ? ' tabindex="-1" aria-hidden="true"' : '';
    if (f.kind === 'member') {
      const m = by[f.member]; if (!m) return '';
      return `<button class="frame frame--m" type="button" data-member="${m.id}" style="--mc:${m.color};--mc2:${m.color2}"${hide} aria-label="${esc(m.en)} ${esc(m.zh)}，${esc(m.power.zh)}，打开名片">
        <img src="${esc(memberPrimaryPhoto(m, { slot: 0 }).src)}" alt="" draggable="false" loading="lazy" decoding="async">
        <span class="frame__no">${m.no}<small>${esc(m.power.en)}</small></span>${glyph(m.id, 'glyph frame__glyph')}
        <span class="cap"><i class="cap__dot">${glyph(m.id)}</i><b>${esc(m.en)}</b><small>${esc(m.zh)}</small></span>
      </button>`;
    }
    const tab = clone ? ' tabindex="-1"' : '';
    const pins = (f.pins || []).map((p, i) => { const m = by[p.member]; return m ? `<button class="pin" type="button" data-member="${m.id}" style="--x:${+p.x}%;--y:${+(p.y ?? 41)}%;--d:${i % 2 ? 30 : 0}px;--mc:${m.color}"${tab} aria-label="${esc(m.en)} ${esc(m.zh)} 名片"><i>${glyph(m.id)}</i>${esc(m.en)}</button>` : ''; }).join('');
    return `<figure class="frame frame--g${f.pins ? ' frame--pin' : ''}"${f.title.length > 12 ? ' data-len="long"' : ''}${clone ? ' aria-hidden="true"' : ''}>
      <img src="${esc(f.src)}" alt="${clone ? '' : esc(`EXO ${f.title} 团体照`)}" draggable="false" loading="lazy" decoding="async" style="object-position:${esc(f.pos || '50% 30%')}">
      <figcaption class="frame__cap"><div><h3>${esc(f.title)}</h3><p>${esc([f.year, f.note].filter(Boolean).join(' · '))}</p></div>
      <div class="frame__who">${(f.members || []).map(id => chip(id, clone)).join('')}</div></figcaption>
      ${pins ? `<div class="pins">${pins}</div>` : ''}${f.credit ? `<span class="frame__credit">${esc(f.credit)}</span>` : ''}
    </figure>`;
  };
  const frames = ctx.hero.frames || [];
  track.innerHTML = frames.map(f => frameHTML(f, false)).join('') + frames.map(f => frameHTML(f, true)).join('');

  dock.innerHTML = ctx.members.map(m => `<button class="dock__pill" type="button" data-member="${m.id}" style="--mc:${m.color}" aria-label="${esc(m.en)} ${esc(m.zh)} 名片">
    <img src="${esc(m.thumb)}" alt="" loading="lazy">${esc(m.en)}${glyph(m.id)}</button>`).join('');

  /* ---- endless strip ---- */
  const st = { x: 0, v: 0, setW: 0, drag: false, hold: false, px: 0, moved: 0, lastT: performance.now(), glide: null, vis: true };
  const measure = () => { st.setW = track.scrollWidth / 2; };
  const wrap = () => { if (!st.setW) return; while (st.x <= -st.setW) st.x += st.setW; while (st.x > 0) st.x -= st.setW; };
  const BASE = reduced ? 0 : -34; // px per second
  function tick(now) {
    const dt = Math.min(0.05, (now - st.lastT) / 1000); st.lastT = now;
    if (st.vis) {
      if (st.glide) { /* gsap drives st.x */ }
      else if (!st.drag) {
        const scrollPush = lenis ? clamp(-lenis.velocity * 6, -500, 500) : 0;
        const target = st.hold ? 0 : BASE + scrollPush;
        st.v += (target - st.v) * Math.min(1, dt * 3.2);
        st.x += st.v * dt;
      }
      wrap(); track.style.transform = `translate3d(${st.x.toFixed(2)}px,0,0)`;
    }
    requestAnimationFrame(tick);
  }
  measure(); requestAnimationFrame(tick);
  window.addEventListener('resize', measure, { passive: true });
  $$('img', track).forEach(i => i.addEventListener('load', measure, { once: true }));
  new IntersectionObserver(es => (st.vis = es[0].isIntersecting)).observe(film);

  // drag
  let lastX = 0, lastMoveT = 0;
  film.addEventListener('pointerdown', e => {
    if (e.button) return; st.drag = true; st.moved = 0; st.px = lastX = e.clientX; lastMoveT = performance.now(); st.glide?.kill(); st.glide = null;
  });
  window.addEventListener('pointermove', e => {
    if (!st.drag) return; const dx = e.clientX - lastX; const now = performance.now();
    st.moved += Math.abs(dx); if (st.moved > 5) film.classList.add('is-drag');
    st.x += dx; st.v = dx / Math.max(0.008, (now - lastMoveT) / 1000); lastX = e.clientX; lastMoveT = now;
  }, { passive: true });
  const end = () => { if (!st.drag) return; st.drag = false; st.v = clamp(st.v, -2600, 2600); setTimeout(() => film.classList.remove('is-drag'), 0); };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  film.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); st.x -= e.deltaX; st.v = -e.deltaX * 8; } }, { passive: false });
  film.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') st.hold = true; });
  film.addEventListener('pointerleave', () => { st.hold = false; });
  film.addEventListener('click', e => {
    if (st.moved > 8) { e.preventDefault(); e.stopPropagation(); return; }
    const b = e.target.closest('[data-member]'); if (b) openMember(b.dataset.member, b);
  }, true);
  film.addEventListener('keydown', e => { if (e.key === 'ArrowRight') st.v = -900; if (e.key === 'ArrowLeft') st.v = 900; });
  film.addEventListener('focusin', e => { const f = e.target.closest('.frame--m'); if (f && f.matches(':focus-visible')) centre(f.dataset.member); });

  // dock ↔ film
  function centre(id) {
    const cands = $$(`.frame--m[data-member="${id}"]`, track); if (!cands.length || !window.gsap) return;
    const mid = film.clientWidth / 2;
    let best = null;
    for (const el of cands) for (const shift of [-st.setW, 0, st.setW]) {
      const x = mid - (el.offsetLeft + el.offsetWidth / 2) + shift; const d = Math.abs(x - st.x);
      if (!best || d < best.d) best = { x, d };
    }
    st.glide?.kill(); st.v = 0;
    st.glide = window.gsap.to(st, { x: best.x, duration: reduced ? 0 : 0.9, ease: 'power3.out', onComplete: () => { st.glide = null; } });
  }
  const hot = id => {
    film.classList.toggle('has-hot', !!id);
    $$('.frame--m', track).forEach(f => f.classList.toggle('is-hot', f.dataset.member === id));
    $$('.dock__pill', dock).forEach(p => p.classList.toggle('is-hot', p.dataset.member === id));
    $$('.pin', track).forEach(p => p.classList.toggle('is-hot', p.dataset.member === id));
  };
  dock.addEventListener('pointerover', e => { const p = e.target.closest('.dock__pill'); if (!p || e.pointerType !== 'mouse') return; st.hold = true; hot(p.dataset.member); centre(p.dataset.member); });
  dock.addEventListener('pointerleave', () => { st.hold = false; hot(null); });
  dock.addEventListener('focusin', e => { const p = e.target.closest('.dock__pill'); if (p && p.matches(':focus-visible')) { hot(p.dataset.member); centre(p.dataset.member); } });
  dock.addEventListener('focusout', () => hot(null));
  dock.addEventListener('click', e => { const p = e.target.closest('.dock__pill'); if (p) openMember(p.dataset.member, p); });

  /* ---- next-up capsule (dual-axis: confirmed + ongoing/upcoming) ---- */
  const activeConfirmed = ctx.events
    .map(e => ({ e, es: eventState(e) }))
    .filter(({ e, es }) => es.isActive && isConfirmed(e))
    .sort((a, b) => {
      if (a.es.isOngoing !== b.es.isOngoing) return a.es.isOngoing ? -1 : 1;
      return (a.e.date + (a.e.timeKST || '23:59')).localeCompare(b.e.date + (b.e.timeKST || '23:59'));
    });
  const next = activeConfirmed[0];
  if (next) {
    const tag = next.es.isOngoing ? '正在进行' : '下一站';
    const chip = next.es.isOngoing
      ? (next.es.phaseLabel.replace(/^进行中\s*·\s*/, '') || '进行中')
      : relDay(Math.max(0, dayDiff(next.e.date)));
    $('#hero-next').innerHTML = `<a class="nextmini" href="#schedule" data-event="${esc(next.e.id)}"><b>${esc(chip)}</b><span><em>${tag}</em> · ${esc(next.e.title)}</span></a>`;
  }
  const days = dayDiff(todayStr(), ctx.meta.debut);
  const dd = $('[data-debut-days]'); if (dd && days > 0) dd.textContent = `出道第 ${days.toLocaleString('en-US')} 天`;

  /* ---- entrance ---- */
  const g = window.gsap;
  if (g && !reduced) {
    const tl = g.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero__title .w', { yPercent: 110, duration: 1.05, stagger: 0.08 }, 0.05)
      .from('.hero__sigil', { scale: 0, rotate: -180, duration: 1.0 }, 0.35)
      .from('.hero .eyebrow > *', { opacity: 0, y: 8, duration: 0.65, stagger: 0.04 }, 0.1)
      .from('.hero__sub', { opacity: 0, y: 12, duration: 0.75 }, 0.35)
      .from(track.children, { opacity: 0, y: 48, duration: 0.85, stagger: { amount: 0.38, from: 'start' }, clearProps: 'opacity,transform' }, 0.18)
      .from('.dock__pill', { opacity: 0, y: 14, duration: 0.65, stagger: 0.03, clearProps: 'opacity,transform' }, 0.45)
      .from('.nextmini', { opacity: 0, y: -10, duration: 0.65, clearProps: 'opacity,transform' }, 0.5);
    if (window.ScrollTrigger) g.to('.hero__title', { yPercent: -18, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  return { centre };
}
