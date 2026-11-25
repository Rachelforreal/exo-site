// Small shared helpers.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const safeUrl = u => (/^https?:\/\//i.test(u || '') ? u : '');
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const glyph = (id, cls = 'glyph') => `<svg class="${cls}" viewBox="0 0 48 48" aria-hidden="true"><use href="#g-${id}"/></svg>`;
export const icon = id => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${id}"/></svg>`;

/* ---- dates: the site reads dates as Korea time and shows Beijing time next to it ---- */
const TODAY_OVERRIDE = new URLSearchParams(location.search).get('today'); // ?today=2026-11-12 for testing check-ins / birthdays / ongoing states
export const todayStr = () => (/^\d{4}-\d{2}-\d{2}$/.test(TODAY_OVERRIDE || '') ? TODAY_OVERRIDE : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }));
export const nowMs = () => (/^\d{4}-\d{2}-\d{2}$/.test(TODAY_OVERRIDE || '') ? new Date(`${TODAY_OVERRIDE}T12:00:00+09:00`).getTime() : Date.now());
const utc = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const dayDiff = (a, b = todayStr()) => Math.round((utc(a) - utc(b)) / 864e5);

/* ---- synchronized weekly member portraits ---- */
const WEEK_OVERRIDE = new URLSearchParams(location.search).get('week');
export function weekIndex(dateStr = todayStr()) {
  if (WEEK_OVERRIDE !== null && /^-?\d+$/.test(WEEK_OVERRIDE)) return Number(WEEK_OVERRIDE);
  return Math.floor((utc(dateStr) - Date.UTC(2012, 3, 9)) / (7 * 864e5));
}
export function memberWeeklyGallery(m, dateStr = todayStr()) {
  const gallery = Array.isArray(m?.gallery) && m.gallery.length
    ? m.gallery
    : [m?.photo && { src: m.photo, era: m.photoEra }, m?.photo2 && { src: m.photo2, era: m.photo2Era }].filter(Boolean);
  if (!gallery.length) return [];
  const fresh = WEEK_OVERRIDE === null ? gallery.filter(g =>
    (g.pinnedUntil && g.pinnedUntil >= dateStr) ||
    (g.addedAt && dayDiff(dateStr, g.addedAt) >= 0 && dayDiff(dateStr, g.addedAt) < 7)
  ) : [];
  if (fresh.length) return [...fresh, ...gallery.filter(g => !fresh.includes(g))];
  const w = ((weekIndex(dateStr) % gallery.length) + gallery.length) % gallery.length;
  return [...gallery.slice(w), ...gallery.slice(0, w)];
}
export function memberPrimaryPhoto(m, { slot = 0, dateStr = todayStr() } = {}) {
  const gallery = memberWeeklyGallery(m, dateStr);
  const index = gallery.length ? ((slot % gallery.length) + gallery.length) % gallery.length : 0;
  const photo = gallery[index] || {};
  return { src: photo.src || m?.photo || '', era: photo.era || m?.photoEra || '', index, isFresh: WEEK_OVERRIDE === null && !!(photo.pinnedUntil && photo.pinnedUntil >= dateStr || photo.addedAt && dayDiff(dateStr, photo.addedAt) >= 0 && dayDiff(dateStr, photo.addedAt) < 7) };
}
const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const weekday = s => WD[new Date(utc(s)).getUTCDay()];
export const md = s => { const [, m, d] = s.split('-'); return `${+m}.${d}`; };
export const fullDate = s => { const [y, m, d] = s.split('-'); return `${y}.${m}.${d}`; };
export const cst = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${String((h + 23) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
export const instant = (date, timeKST) => new Date(`${date}T${timeKST || '00:00'}:00+09:00`);
export const relDay = n => (n === 0 ? '今天' : n === 1 ? '明天' : n === 2 ? '后天' : n > 0 ? `${n} 天后` : n === -1 ? '昨天' : `${-n} 天前`);
export const dateRange = e => (e.endDate && e.endDate !== e.date ? `${fullDate(e.date)} – ${md(e.endDate)}` : fullDate(e.date));

/* ---- orthogonal dual-axis event state model ----
   Axis 1 (verification): official | media (both = 已确认) | unverified (待核实)
   Axis 2 (lifecycle):    ongoing (进行中) | upcoming (即将开始) | done (已结束 / 日期已过·未见证实) */
export const isConfirmed = e => e?.verification === 'official' || e?.verification === 'media';
export const hasTicketInfo = e => !!(e?.ticket && (e.ticket.platform || e.ticket.url || e.ticket.onSale)) || e?.category === '票务';

export function eventState(e, refMs = nowMs()) {
  const today = todayStr();
  const startDiff = dayDiff(e.date, today);
  const endDiff = dayDiff(e.endDate || e.date, today);
  const verif = e.verification || 'unverified';
  const confirmed = verif === 'official' || verif === 'media';

  const makeDone = (todayEnded = false) => !confirmed
    ? { verif, confirmed, phase: 'done', subphase: 'unconfirmed_past', phaseLabel: '日期已过 · 未见证实', phaseShort: '未见证实', dateChip: '未见证实', isActive: false, isOngoing: false, isUpcoming: false, isDone: true }
    : { verif, confirmed, phase: 'done', subphase: 'completed', phaseLabel: todayEnded ? '今日已结束' : '已结束', phaseShort: '已结束', dateChip: '已结束', isActive: false, isOngoing: false, isUpcoming: false, isDone: true };

  if (e.status === 'done' || endDiff < 0) return makeDone(false);

  if (e.endDate && e.endDate > e.date && startDiff <= 0 && endDiff >= 0) {
    const endClock = e.endTimeKST || (e.timeKST === '23:59' ? '23:59' : '');
    if (endDiff === 0 && endClock && instant(e.endDate, endClock).getTime() < refMs) return makeDone(true);
    const rem = endDiff === 0 ? '今日截止' : `剩 ${endDiff} 天 · ${md(e.endDate)} 截止`;
    return {
      verif, confirmed, phase: 'ongoing', subphase: 'span',
      phaseLabel: `进行中 · ${rem}`, phaseShort: '进行中',
      dateChip: endDiff === 0 ? '今日截止' : `进行中`,
      isActive: true, isOngoing: true, isUpcoming: false, isDone: false,
    };
  }

  if (startDiff === 0) {
    if (e.timeKST) {
      const sMs = instant(e.date, e.timeKST).getTime(), eMs = sMs + 3 * 3600e3;
      if (refMs < sMs) {
        return { verif, confirmed, phase: 'upcoming', subphase: 'today', phaseLabel: `今日 ${e.timeKST} KST`, phaseShort: '今日开始', dateChip: '今天', isActive: true, isOngoing: false, isUpcoming: true, isDone: false };
      }
      if (refMs <= eMs) {
        return { verif, confirmed, phase: 'ongoing', subphase: 'live', phaseLabel: '进行中 · 今日', phaseShort: '进行中', dateChip: '进行中', isActive: true, isOngoing: true, isUpcoming: false, isDone: false };
      }
      return makeDone(true);
    }
    return { verif, confirmed, phase: 'ongoing', subphase: 'today', phaseLabel: '进行中 · 今日', phaseShort: '进行中', dateChip: '进行中', isActive: true, isOngoing: true, isUpcoming: false, isDone: false };
  }

  const rel = relDay(startDiff);
  return {
    verif, confirmed, phase: 'upcoming', subphase: 'future',
    phaseLabel: `即将开始 · ${rel}`, phaseShort: '即将开始',
    dateChip: rel, isActive: true, isOngoing: false, isUpcoming: true, isDone: false,
  };
}

export const isUpcoming = e => eventState(e).isActive;

/* ---- storage ---- */
export const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ---- verification + lifecycle badges ---- */
export const VERIF = {
  official: ['已确认 · 官方', 'official', '官方'],
  media: ['已确认 · 媒体', 'media', '媒体'],
  unverified: ['待核实', 'rumor', '待核实'],
};
export const badge = (v, { compact = false } = {}) => {
  const [full, c, short] = VERIF[v] || VERIF.unverified;
  return `<span class="badge badge--${c}" data-verif="${esc(v || 'unverified')}">${compact ? short : full}</span>`;
};
export const phaseBadge = e => {
  const st = eventState(e);
  const cls = st.subphase === 'unconfirmed_past' ? 'stale' : st.phase;
  return `<span class="pbadge pbadge--${cls}" data-phase="${st.phase}">${esc(st.phaseLabel)}</span>`;
};
export const eventTimeLabel = e => {
  if (e.endDate && e.endDate > e.date && e.endTimeKST) {
    const startPart = e.timeKST ? `${md(e.date)} ${e.timeKST} 起 · ` : '';
    return `${startPart}至 ${md(e.endDate)} ${e.endTimeKST} KST（北京 ${cst(e.endTimeKST)} 截止）`;
  }
  if (e.timeKST) return `首尔 ${e.timeKST} · 北京 ${cst(e.timeKST)}`;
  return e.timeLocal || '';
};
export const detailBadges = e => [
  e.timeConflict ? '<span class="pbadge pbadge--warn">报道时刻分歧</span>' : '',
  e.detailNote && !e.timeKST && !e.timeLocal ? `<span class="pbadge pbadge--muted">${e.venue ? '开演时刻/票务待公布' : '场馆/票务待公布'}</span>` : '',
].filter(Boolean).join('');
export const sources = list => (list || []).filter(s => s && (s.name || s.url)).map(s => {
  const u = safeUrl(s.url); const name = esc(s.name || new URL(u).hostname);
  return u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${name}${icon('arrow')}</a>` : `<span>${name}</span>`;
}).join('');

/* ---- toast (#016-toast-or-notification: status toast 3s / action toast 5s with in-place undo morph) ---- */
let toastT;
export function toast(msg, opts = {}) {
  const el = $('#toast');
  if (!el) return;
  const { actionLabel, onAction, duration } = opts;
  el.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = msg;
  el.append(span);
  if (actionLabel && typeof onAction === 'function') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast__undo';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => {
      onAction();
      el.innerHTML = '<span>已恢复该条留言</span>';
      clearTimeout(toastT);
      toastT = setTimeout(() => el.classList.remove('is-on'), 2000);
    }, { once: true });
    el.append(btn);
  }
  el.classList.remove('is-on');
  void el.offsetWidth; // re-trigger sheen sweep
  el.classList.add('is-on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('is-on'), duration || (actionLabel ? 5000 : 2800));
}

/* ---- overlays ---- */
const stack = [];
export const overlay = {
  lenis: null,
  open(el, { focus } = {}) {
    if (!el) return;
    if (el._closeTimer) { clearTimeout(el._closeTimer); el._closeTimer = 0; el._closing = false; }
    if (!el.hidden) return;
    el._return = document.activeElement; el.hidden = false; el.classList.remove('is-out'); stack.push(el);
    this.lenis?.stop(); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => (focus || el.querySelector('input, button, [href]'))?.focus({ preventScroll: true }));
  },
  close(el) {
    if (!el || el.hidden || el._closing) return;
    const done = () => {
      el._closing = false; el._closeTimer = 0;
      el.hidden = true; el.classList.remove('is-out');
      el.dispatchEvent(new CustomEvent('overlay:closed'));
    };
    const dur = el.id === 'sheet' ? 380 : (el.matches('.dial, .palette, .credits, .mv') ? 180 : 0);
    if (dur && !reduced) {
      el._closing = true;
      el.classList.add('is-out');
      el._closeTimer = setTimeout(done, dur);
    } else {
      done();
    }
    const idx = stack.indexOf(el);
    if (idx >= 0) stack.splice(idx, 1);
    if (!stack.length) { this.lenis?.start(); document.documentElement.style.overflow = ''; }
    el._return?.focus?.({ preventScroll: true });
  },
  top: () => stack[stack.length - 1],
};
document.addEventListener('click', e => { const c = e.target.closest('[data-close]'); if (c) overlay.close(c.closest('.dial, .sheet, .palette, .mv, .credits')); });
document.addEventListener('keydown', e => {
  const top = overlay.top(); if (!top) return;
  if (e.key === 'Escape') { e.preventDefault(); overlay.close(top); return; }
  if (e.key === 'Tab') { // keep focus inside the open overlay
    const f = $$('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])', top).filter(n => n.offsetParent !== null);
    if (!f.length) return; const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---- reveal on scroll ---- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }) : null;
export const reveal = (root = document) => $$('.rv:not(.is-in)', root).forEach(n => (io ? io.observe(n) : n.classList.add('is-in')));

/* ---- sliding pill thumb for .seg controls ---- */
export function enhanceSegs(root = document) {
  const segs = root?.matches?.('.seg') ? [root, ...$$('.seg', root)] : $$('.seg', root);
  for (const seg of segs) {
    if (!seg._segBound) {
      seg._segBound = true;
      const sync = (immediate = false) => {
        const sr = seg.getBoundingClientRect();
        if (sr.width === 0 || sr.height === 0 || seg.closest('[hidden]')) {
          seg.style.setProperty('--seg-o', '0');
          return;
        }
        const active = seg.querySelector('button[aria-pressed="true"], button[aria-selected="true"]');
        if (!active) {
          seg.style.setProperty('--seg-o', '0');
          return;
        }
        const ar = active.getBoundingClientRect();
        if (ar.width === 0) return;
        const useOffset = active.offsetParent === seg;
        const x = useOffset ? active.offsetLeft : (ar.left - sr.left + seg.scrollLeft);
        const y = useOffset ? active.offsetTop : (ar.top - sr.top + seg.scrollTop);
        if (immediate || !seg.classList.contains('has-thumb')) seg.classList.add('is-init');
        seg.classList.add('has-thumb');
        seg.style.setProperty('--seg-x', `${x.toFixed(2)}px`);
        seg.style.setProperty('--seg-y', `${y.toFixed(2)}px`);
        seg.style.setProperty('--seg-w', `${ar.width.toFixed(2)}px`);
        seg.style.setProperty('--seg-h', `${ar.height.toFixed(2)}px`);
        seg.style.setProperty('--seg-o', '1');
        if (seg.classList.contains('is-init')) requestAnimationFrame(() => seg.classList.remove('is-init'));
      };
      seg._segSync = sync;
      seg.addEventListener('click', () => queueMicrotask(() => sync(false)));
      if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => sync(!seg.classList.contains('has-thumb')));
        ro.observe(seg);
        $$('button', seg).forEach(b => ro.observe(b));
      }
      if ('MutationObserver' in window) {
        const mo = new MutationObserver(() => sync(false));
        mo.observe(seg, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-selected'] });
      }
      document.fonts?.ready?.then(() => sync(true));
    }
    seg._segSync(!seg.classList.contains('has-thumb'));
  }
}

/* ---- smooth <details> fallback when native ::details-content interpolation isn't supported ---- */
const NATIVE_DETAILS = typeof CSS !== 'undefined' && !!CSS.supports?.('interpolate-size', 'allow-keywords');
export function animateDetails(root = document) {
  if (reduced || NATIVE_DETAILS) return;
  const list = root?.matches?.('details') ? [root, ...$$('details', root)] : $$('details', root);
  for (const d of list) {
    if (d._detBound) continue;
    d._detBound = true;
    d.addEventListener('toggle', () => {
      if (!d.open) return;
      for (const ch of d.children) {
        if (ch.tagName === 'SUMMARY') continue;
        ch.animate?.(
          [{ opacity: 0, transform: 'translate3d(0, -6px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
          { duration: 240, easing: 'cubic-bezier(.22, 1, .36, 1)' }
        );
      }
    });
  }
}

/* ---- MPA shared-element portrait handoff before navigation to member.html ---- */
document.addEventListener('pointerdown', e => {
  if (e.button && e.button !== 0) return;
  const link = e.target.closest('a[href*="member.html"], [data-cover-link]');
  $$('[style*="view-transition-name"]').forEach(n => { n.style.viewTransitionName = ''; });
  if (!link || reduced) return;
  const scope = link.closest('.mcard, .mpanel, .sheet, #cover, .issue');
  const img = scope?.querySelector('.mcard__pic img, .mpanel__img.is-active, [data-cover-img], .sheet__hero img')
    || (link.matches('[data-cover-link]') ? $('[data-cover-img]') : null);
  if (img && img.offsetParent !== null && img.getClientRects().length > 0) {
    img.style.viewTransitionName = 'member-portrait';
  }
}, { passive: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { enhanceSegs(); animateDetails(); }, { once: true });
} else {
  queueMicrotask(() => { enhanceSegs(); animateDetails(); });
}

/* ---- drag-to-scroll for native horizontal scrollers ---- */
export function dragScroll(el) {
  let down = false, sx = 0, sl = 0, moved = 0;
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = el.scrollLeft; moved = 0; });
  window.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 4) { el.classList.add('is-drag'); el.scrollLeft = sl - dx; } });
  window.addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => el.classList.remove('is-drag'), 0); });
  el.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
}
