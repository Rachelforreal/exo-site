// Boot: load data, wire the universe, smooth scroll, and every section present on the current page.
import { $, $$, esc, icon, safeUrl, reduced, reveal, overlay, clamp, enhanceSegs, animateDetails } from './util.js';
import { lazyUniverse } from './lazyuni.js';
import { initThemes, setPower, currentPower } from './themes.js';
import { initHero } from './hero.js?v=27';
import { initTicker, initNow, initMembers, initChannels } from './sections.js?v=27';
import { initOffstage } from './offstage.js?v=27';
import { initSchedule } from './schedule.js?v=27';
import { initAlbums } from './albums.js?v=27';
import { initSearch } from './search.js?v=27';
import { initMode } from './mode.js?v=27';
import { initCover } from './cover.js?v=27';
import { initRoad } from './road.js?v=27';
import { initMaker } from './maker.js?v=27';
import { initWallpaper } from './wallpaper.js?v=27';
import { initPlushieEggs } from './plushies.js?v=27';
import { withCalendar } from './calendar.js?v=27';
import { initSubscribe } from './subscribe.js?v=27';
import { initFeed } from './feed.js?v=27';
import { initGuestbook } from './guestbook.js?v=27';
import { initVibeMotion } from './vibe-motion.js?v=27';

const V = '27';
const load = name => fetch(`data/${name}.json?v=${V}`).then(r => { if (!r.ok) throw new Error(`${name}: ${r.status}`); return r.json(); });
const SECTION_PAGE = {
  now: 'index.html',
  members: 'index.html',
  schedule: 'index.html',
  albums: 'index.html',
  explore: 'index.html',
  road: 'archive.html',
  channels: 'archive.html',
  maker: 'studio.html',
};

async function boot() {
  const [members, albums, events, news, channels, hero, meta, archive, offstage] = await Promise.all([
    ...['members', 'albums', 'events', 'news', 'channels', 'hero', 'meta', 'archive'].map(load),
    load('offstage').catch(() => []),
  ]);
  const ctx = { members, albums, events, news, channels, hero, meta, archive, offstage, byId: Object.fromEntries(members.map(m => [m.id, m])), lenis: null };

  /* ---- background ---- */
  let uni = null;
  try { uni = lazyUniverse($('#universe'), { reduced }); } catch (e) { console.warn('universe', e); }
  initThemes(members, uni);
  if (uni) {
    document.addEventListener('visibilitychange', () => (document.hidden || document.documentElement.dataset.mode !== 'galaxy' ? uni.stop() : uni.start()));
    if (!reduced) window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') uni.pointer((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2); }, { passive: true });
  }

  /* ---- smooth scroll ---- */
  const g = window.gsap, ST = window.ScrollTrigger;
  if (g && ST) g.registerPlugin(ST);
  if (window.Lenis && !reduced && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: false });
    ctx.lenis = overlay.lenis = lenis;
    if (g && ST) { lenis.on('scroll', ST.update); g.ticker.add(t => lenis.raf(t * 1000)); g.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const goTo = (target, offset = -20) => { const el = typeof target === 'string' ? document.getElementById(target) : target; if (!el) return; ctx.lenis ? ctx.lenis.scrollTo(el, { offset, duration: 1.3 }) : window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: reduced ? 'auto' : 'smooth' }); };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a || a.dataset.event) return;
    const id = a.getAttribute('href').slice(1); if (!id) return; const el = document.getElementById(id); if (!el) return;
    e.preventDefault(); id === 'top' ? (ctx.lenis ? ctx.lenis.scrollTo(0, { duration: 1.2 }) : window.scrollTo({ top: 0, behavior: 'smooth' })) : goTo(el); history.replaceState(null, '', id === 'top' ? location.pathname + location.search : '#' + id);
  });

  /* ---- sections (late-bound + page-guarded for 3-page IA) ---- */
  ctx.calendar = withCalendar(ctx);
  initMode({ uni });
  const curFile = location.pathname.split('/').pop() || 'index.html';
  const api = {};
  const openMember = (id, from) => (api.openMember ? api.openMember(id, from) : (location.href = `member.html?id=${encodeURIComponent(id)}`));
  const focusEvent = id => (api.focusEvent ? api.focusEvent(id) : (location.href = `index.html?event=${encodeURIComponent(id)}#schedule`));
  const goSection = (id, offset = -20) => {
    const el = document.getElementById(id);
    if (el) { goTo(el, offset); return; }
    const page = SECTION_PAGE[id];
    if (page && curFile !== page) location.href = `${page}#${encodeURIComponent(id)}`;
  };

  const qs = new URLSearchParams(location.search);
  const qCard = qs.get('card');
  const qEvent = qs.get('event');
  const qAlbum = qs.get('album');
  const qSched = qs.get('sched');
  const h = decodeURIComponent(location.hash.slice(1));

  const sched = $('#sched-list') ? initSchedule(ctx, { openMember }) : null;
  if (sched) api.focusEvent = sched.focusEvent;
  const alb = $('#shelf') ? initAlbums(ctx, { initialAlbum: qAlbum }) : null;
  const goAlbum = slug => (alb ? alb.go(slug) : (location.href = `index.html?album=${encodeURIComponent(slug)}#albums`));
  const mem = $('#dex') ? initMembers(ctx, { focusEvent, filterMember: id => sched?.filterMember(id), goAlbum }) : null;
  // Quick Dossier Sheet opens in-page on homepage; subpages navigate directly to member.html?id=<id>.
  if (mem) api.openMember = mem.openMember;
  if ($('#ticker')) initTicker(ctx);
  if ($('#now')) {
    initNow(ctx, { openMember, focusEvent });
    initOffstage(ctx, { openMember });
  }

  if ($('#channels')) {
    initChannels(ctx);
  } else if ($('#credits-list')) {
    const credits = (ctx.meta.credits || []).filter(c => safeUrl(c.sourcePage));
    $('#credits-list').innerHTML = `<p>成员照片为 EXIST《Cream Soda》（2023）与 REVERXE《Crown》（2026）官方概念照，专辑封面为各专辑官方数字封面，版权均归 SM Entertainment 及原权利人所有。本站为粉丝自制，仅作交流展示，不作商业用途。照片对应的成员以来源页面的文件名与说明为准。</p>
      ${credits.length ? `<ul style="margin-top:14px">${credits.map(c => `<li>${esc(c.title || c.file)} — ${esc(c.credit || '')} · <a class="src" href="${esc(c.sourcePage)}" target="_blank" rel="noopener noreferrer">来源页${icon('arrow')}</a></li>`).join('')}</ul>` : ''}`;
    $$('[data-open-credits]').forEach(b => b.addEventListener('click', () => overlay.open($('#credits'))));
  }

  if ($('#cover') && getComputedStyle($('#cover')).display !== 'none') initCover(ctx, { openMember, focusEvent });
  if ($('#road')) initRoad(ctx);
  let wp = null;
  if ($('#maker')) {
    initMaker(ctx);
    wp = initWallpaper(ctx);
    initPlushieEggs(ctx, { onPickForWallpaper: id => wp?.pickPlushMember(id) });
  }
  if ($('#hero') && $('#film')) initHero(ctx, { openMember, lenis: ctx.lenis });

  const searchSchedule = payload => {
    if (sched) { sched.search(payload); goTo('schedule', -40); return; }
    const p = new URLSearchParams();
    p.set('sched', '1');
    if (typeof payload === 'string') {
      if (payload) p.set('q', payload);
    } else if (payload && typeof payload === 'object') {
      if (payload.q) p.set('q', payload.q);
      if (payload.member && payload.member !== 'all') p.set('member', payload.member);
      if (payload.time && payload.time !== 'all') p.set('time', payload.time);
    }
    location.href = `index.html?${p.toString()}#schedule`;
  };

  initSearch(ctx, { openMember, focusEvent, goAlbum, goSection, searchSchedule });
  $('#hero-next')?.addEventListener('click', e => { const a = e.target.closest('[data-event]'); if (a) { e.preventDefault(); focusEvent(a.dataset.event); } });
  initSubscribe();
  if ($('#gb-mount')) initGuestbook(ctx);
  reveal();
  enhanceSegs();
  animateDetails();
  initVibeMotion();

  /* ---- header + nav state, background dimming with scroll ---- */
  const bar = $('#bar'), links = $$('.bar__nav a[data-nav]'), secs = links.map(a => document.getElementById(a.dataset.nav));
  let ticking = false;
  const onScroll = () => {
    ticking = false; const y = window.scrollY, vh = innerHeight;
    bar?.classList.toggle('is-stuck', y > 30);
    const k = clamp(y / (vh * 0.9), 0, 1);
    document.documentElement.style.setProperty('--veil', (0.3 + k * 0.32).toFixed(3));
    uni?.setBright(1 - k * 0.3);
    if (!links.length) return;
    let on = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.42) on = i; });
    links.forEach((a, i) => { const is = i === on; if (a.classList.contains('is-on') !== is) { a.classList.toggle('is-on', is); is ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); } });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- section headings: a small scrubbed drift on the big numerals ---- */
  if (g && ST && !reduced) {
    $$('.sec__no').forEach(n => g.fromTo(n, { yPercent: 40 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: n.closest('.sec'), start: 'top bottom', end: 'top top', scrub: 0.6 } }));
    if ($('.foot__big')) g.fromTo('.foot__big', { yPercent: 30, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } });
    window.addEventListener('load', () => ST.refresh());
    document.fonts?.ready.then(() => ST.refresh());
  }

  /* ---- deep links & cross-page query params ---- */
  if (qCard && !$('#maker') && curFile !== 'studio.html') {
    location.href = `studio.html?card=${encodeURIComponent(qCard)}#card`;
    return;
  }
  if (qEvent && sched) {
    setTimeout(() => focusEvent(qEvent), 350);
  } else if (qAlbum && alb) {
    setTimeout(() => alb.go(qAlbum), 120);
  } else if (qSched !== null && sched) {
    let payload = null;
    if (qSched && qSched.startsWith('{')) {
      try { payload = JSON.parse(qSched); } catch {}
    }
    if (!payload) {
      payload = {
        q: qs.get('q') || '',
        member: qs.get('member') || 'all',
        time: qs.get('time') || 'all',
      };
    }
    setTimeout(() => { sched.search(payload); goTo('schedule', -40); }, 350);
  } else if (h) {
    setTimeout(() => {
      if (h === 'card' && $('#maker')) {
        $('[data-studio-tab="card"]')?.click();
        goTo('maker');
      } else if (ctx.byId[h]) {
        openMember(h);
      } else if (h.startsWith('ev-')) {
        focusEvent(h.slice(3).startsWith('ev-') ? h.slice(3) : h);
      } else if (document.getElementById(h)) {
        goTo(h);
      } else {
        goSection(h);
      }
    }, 500);
  }

  if ($('#feed')) initFeed(); // 快讯 (non-blocking; hides itself on failure)
  document.documentElement.classList.add('is-ready');
  window.EXO = { ctx, setPower, currentPower, openMember, focusEvent, goAlbum };
}

boot().catch(err => {
  console.error(err);
  document.documentElement.classList.remove('js');
  const m = document.createElement('p'); m.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:30em;text-align:center;line-height:1.8;padding:24px;z-index:99';
  m.textContent = '页面数据没有加载出来。请刷新再试一次；如果是直接双击打开的文件，需要通过本地服务器访问。';
  document.body.append(m);
});
