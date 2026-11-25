// Chapter II insert: contact prints, transport and a light table.
import { $, $$, esc, safeUrl, reduced, clamp, overlay } from './util.js';

const memberNames = { xiumin: '珉锡', suho: '俊勉', lay: '艺兴', baekhyun: '伯贤', chen: '钟大', chanyeol: '灿烈', do: '暻秀', kai: '钟仁', sehun: '世勋' };
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;
const itemMs = n => { const t = Date.parse(n?.publishedAt || (n?.date ? `${n.date}T12:00:00+08:00` : '')); return Number.isFinite(t) ? t : 0; };
const isRecent7d = n => Date.now() - itemMs(n) <= SEVEN_DAYS_MS;
function relTime(n) {
  const raw = n?.publishedAt;
  if (!raw) return n?.date || '';
  const ms = Date.parse(raw), diff = Date.now() - ms;
  if (!Number.isFinite(ms) || diff < 0) return n.date || '';
  if (diff < 3600e3) return `${Math.max(1, Math.floor(diff / 60e3))} 分钟前`;
  if (diff < 86400e3) return `${Math.floor(diff / 3600e3)} 小时前`;
  const hhmm = raw.slice(11, 16);
  if (diff < 2 * 86400e3) return `昨天 ${hhmm}`;
  if (diff <= SEVEN_DAYS_MS) return `${raw.slice(5, 10)} ${hhmm}`;
  return n.date || raw.slice(0, 10);
}
const photos = n => n.images?.length ? n.images : [n.cover].filter(Boolean);
const badge = n => n.badge || n.platform || '';
const credits = (n, ctx) => n.collab || [(n.members || []).map(id => ctx.byId[id]?.en || (id === 'group' ? 'EXO' : '')).filter(Boolean).join(' × '), n.author].filter(Boolean).join(' · ');
const trackNote = n => [n.collab, n.song && `♪ ${n.song}`].filter(Boolean).join(' · ');
const color = (n, ctx) => ctx.byId[(n.members || [])[0]]?.color || 'var(--foil, #a87e43)';
const external = (url, label, cls) => safeUrl(url) ? `<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : '';
const round = (key, dir, label) => `<button class="archive-round" type="button" ${key}="${dir}" aria-label="${label}">${dir < 0 ? '‹' : '›'}</button>`;
const photoAttrs = 'draggable="false" referrerpolicy="no-referrer" decoding="async"';

function contact(n, i, clone, ctx) {
  const video = n.kind === 'video', imgs = photos(n), num = String(i + 1).padStart(2, '0');
  const hint = video ? trackNote(n) || '查看原片' : `共 ${imgs.length} 张原图 · 点击翻阅`;
  return `<button type="button" class="os-card ${video ? 'os-video' : imgs.length > 1 ? 'os-multi' : ''}" data-os-index="${i}" data-os-id="${esc(n.id)}" style="--mc:${esc(color(n, ctx))}" aria-label="${esc([badge(n), n.title, video ? '打开短片档案' : '查看照片'].join(' · '))}"${clone ? ' aria-hidden="true" tabindex="-1"' : ''}>
    <span class="os-card__face"><img class="os-cover" src="${esc(n.cover || imgs[0])}" alt="" loading="lazy" ${photoAttrs}>
      <span class="os-label">${esc(badge(n))}</span>${video || imgs.length > 1 ? `<span class="os-time">${video ? `<i class="os-playmark"></i> ${esc(n.duration)}` : `1/${imgs.length}`}</span>` : ''}
      <span class="os-caption"><small>${esc([credits(n, ctx), relTime(n)].filter(Boolean).join(' · '))}</small><strong>${esc(n.title)}</strong></span>
      ${video || imgs.length > 1 ? `<span class="os-hint">${esc(hint)}</span>` : ''}</span><small class="os-edge">RAW ${num}</small></button>`;
}

export function initOffstage(ctx, { openMember } = {}) {
  const now = $('#now'); if (!now) return;
  let root = $('#offstage-mount'); if (!root) { root = document.createElement('section'); root.id = 'offstage-mount'; now.append(root); }
  if ($('.os-track', root)) return;
  const items = Array.isArray(ctx.offstage) ? ctx.offstage : [];
  const choices = (data, opts) => opts.map(([key, label, mc]) => `<button type="button" data-os-${data}="${esc(key)}" aria-pressed="${key === 'all'}"${mc ? ` style="--mc:${esc(mc)}"` : ''}>${mc ? '<i></i>' : ''}${esc(label)}</button>`).join('');
  const syncIso = ctx.meta?.offstageSyncedAt || ctx.meta?.weiboSyncedAt || '';
  const syncLabel = syncIso ? `最近同步 ${syncIso.slice(5, 16).replace('T', ' ')}` : '双端同源优先挂官抖，外网独有附国内直达';
  root.innerHTML = `<header class="os-heading"><div><p class="os-kicker">OFF STAGE // CONTACT SHEET · 近 7 天鲜活营业</p><h3>镜头之外</h3></div><p class="os-lead">仅展示近 7 天全员 IG / 抖音 / 小红书 / 跨团合拍<small>${esc(syncLabel)}</small></p></header>
    <div class="os-controls"><div class="os-kinds" role="group" aria-label="胶片类型">${choices('kind', [['all', '全部'], ['photo', '图文随拍'], ['video', '合拍与短片']])}</div>
    <div class="os-transport">${round('data-os-step', -1, '向左移动胶片')}${round('data-os-step', 1, '向右移动胶片')}</div></div>
    <div class="os-members" role="group" aria-label="按成员筛选胶片">${choices('filter', [['all', '全员'], ...ctx.members.map(m => [m.id, `${m.en} ${memberNames[m.id] || m.zh}`, m.color])])}</div>
    <p class="os-fallback-note" hidden role="status"></p>
    <div class="os-viewport" aria-label="胶片长带，可左右拖动" role="region"><div class="os-track"></div></div><div class="os-foot"><span>EXOPLANET / LAST 7 DAYS</span><output aria-live="polite"></output></div>`;
  const vp = $('.os-viewport', root), track = $('.os-track', vp), steps = $$('[data-os-step]', root), fallbackNote = $('.os-fallback-note', root);
  const st = { x: 0, v: 0, kind: 'all', member: 'all', loop: false, span: 0, limit: 0, drag: null, hover: false, focus: false, paused: false, viewing: false, visible: true, glide: null };
  let selected = [], raf = 0, last = 0, hot, dwell, suppress = false;
  const held = () => st.hover || st.focus || st.paused || st.viewing || !!st.drag;
  function label() {}
  function clearHot() { clearTimeout(dwell); if (!hot) return; hot.classList.remove('is-hot', 'is-dwell'); hot.previousElementSibling?.classList.remove('is-before'); hot.nextElementSibling?.classList.remove('is-after'); hot = null; }
  function place() {
    if (st.loop && st.span) { st.x %= st.span; if (st.x > 0) st.x -= st.span; }
    else st.x = clamp(st.x, -st.limit, 0);
    track.style.transform = `translate3d(${st.x.toFixed(3)}px,0,0)`;
    steps[0].disabled = !st.loop && st.x >= -0.5; steps[1].disabled = !st.loop && st.x <= -st.limit + 0.5;
  }
  function measure() {
    st.span = st.loop ? track.children[selected.length].offsetLeft - track.firstElementChild.offsetLeft : 0;
    st.limit = Math.max(0, track.scrollWidth - vp.clientWidth); if (!st.viewing) place();
  }
  function wake() { if (!raf && st.visible && !st.viewing) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(t) {
    raf = 0; if (!st.visible || st.viewing || st.drag) return;
    const dt = Math.min(.05, (t - last) / 1000); last = t;
    const target = st.loop && !held() ? -26 : 0;
    if (st.glide) {
      const g = st.glide, p = clamp((t - g.t) / 530, 0, 1);
      st.x = g.start + g.dx * (1 - (1 - p) ** 3); if (p >= 1) st.glide = null;
    } else { st.v += (target - st.v) * Math.min(1, dt * 6.5); st.x += st.v * dt; }
    place(); if (st.glide || target || Math.abs(st.v) > .3) raf = requestAnimationFrame(tick); else st.v = 0;
  }
  const open = viewer(ctx, openMember, on => { st.viewing = on; st.v = 0; st.glide = null; clearHot(); label(); if (!on) wake(); });
  function render() {
    clearHot(); st.x = st.v = 0; st.glide = null; st.paused = false; st.focus = false;
    const byKind = items.filter(n => st.kind === 'all' || n.kind === st.kind);
    let isFallback = false;
    if (st.member === 'all') {
      selected = byKind.filter(isRecent7d);
    } else {
      const member7d = byKind.filter(n => n.members?.includes(st.member) && isRecent7d(n));
      if (member7d.length) {
        selected = member7d;
      } else {
        const latest = byKind.find(n => n.members?.includes(st.member)) || items.find(n => n.members?.includes(st.member));
        selected = latest ? [latest] : [];
        isFallback = !!latest;
      }
    }
    fallbackNote.hidden = !isFallback;
    if (isFallback) fallbackNote.textContent = '近 7 天暂无新营业，以下为最近一条动态';
    st.loop = !reduced && selected.length >= 5 && st.member === 'all' && st.kind === 'all';
    const cards = clone => selected.map((n, i) => contact(n, i, clone, ctx)).join('');
    track.innerHTML = selected.length ? cards(false) + (st.loop ? cards(true) : '') : '<p class="os-empty">近 7 天暂无收录胶片。可切换成员或类型查看。</p>';
    $$('[data-os-kind], [data-os-filter]', root).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.osKind === st.kind || b.dataset.osFilter === st.member)));
    $('.os-foot output', root).textContent = `${String(selected.length).padStart(2, '0')} 张胶片`;
    measure(); label(); wake();
  }
  render(); new ResizeObserver(measure).observe(vp);
  new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible) wake(); }).observe(vp);
  vp.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { st.hover = true; label(); wake(); } });
  vp.addEventListener('pointerleave', () => { st.hover = false; clearHot(); label(); wake(); });
  vp.addEventListener('pointerover', e => {
    const card = e.target.closest('.os-card'); if (st.drag || st.viewing || e.pointerType !== 'mouse' || !card || card === hot) return;
    clearHot(); hot = card; card.classList.add('is-hot'); card.previousElementSibling?.classList.add('is-before'); card.nextElementSibling?.classList.add('is-after');
    dwell = setTimeout(() => card.classList.add('is-dwell'), 450);
  });
  vp.addEventListener('pointerout', e => { if (hot && !hot.contains(e.relatedTarget)) clearHot(); });
  vp.addEventListener('focusin', e => {
    if (st.viewing || !e.target.matches('.os-card:focus-visible')) return;
    st.focus = true; st.glide = null; st.v = 0; vp.scrollLeft = 0;
    const left = e.target.offsetLeft + st.x;
    if (left < 0 || left + e.target.offsetWidth > vp.clientWidth) { st.x = -e.target.offsetLeft; place(); } label();
  });
  vp.addEventListener('focusout', () => { st.focus = false; label(); wake(); });
  vp.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !e.isPrimary || st.viewing) return;
    suppress = false; clearHot(); st.v = 0; st.glide = null;
    st.drag = { id: e.pointerId, start: e.clientX, last: e.clientX, at: performance.now() }; label();
  });
  window.addEventListener('pointermove', e => {
    const d = st.drag; if (!d || d.id !== e.pointerId) return;
    if (!suppress && Math.abs(e.clientX - d.start) <= 7) return;
    if (!suppress) { vp.setPointerCapture(e.pointerId); vp.classList.add('is-drag'); suppress = true; }
    const dx = e.clientX - d.last, t = performance.now(); st.x += dx; st.v = clamp(dx / Math.max(.008, (t - d.at) / 1000), -1400, 1400); d.last = e.clientX; d.at = t; place();
  }, { passive: true });
  const end = e => { if (st.drag?.id !== e.pointerId) return; if (performance.now() - st.drag.at > 100 || e.type === 'pointercancel' || reduced) st.v = 0; st.drag = null; vp.classList.remove('is-drag'); label(); wake(); };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  vp.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) && !e.shiftKey) return;
    e.preventDefault(); e.stopPropagation(); clearHot(); st.glide = null; st.v = 0; st.x -= (e.deltaX || e.deltaY) * (e.deltaMode === 1 ? 16 : 1); place(); wake();
  }, { passive: false });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || st.viewing) return;
    if (b.dataset.osKind || b.dataset.osFilter) { st.kind = b.dataset.osKind || st.kind; st.member = b.dataset.osFilter || st.member; render(); }
    else if (b.dataset.osStep) {
      clearHot(); const dx = -Number(b.dataset.osStep) * 2.5 * (track.firstElementChild.offsetWidth + parseFloat(getComputedStyle(track).gap));
      st.v = 0; if (reduced) { st.x += dx; place(); } else { st.glide = { start: st.x, dx, t: performance.now() }; wake(); }
    } else if (b.matches('.os-card') && (!suppress || e.detail === 0)) open(b, selected[+b.dataset.osIndex]);
  });
}

function viewer(ctx, openMember, pause) {
  const box = document.createElement('div'); box.id = 'os-viewer'; box.className = 'archive-overlay'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'os-title'); box.setAttribute('data-lenis-prevent', '');
  box.innerHTML = `<div class="archive-scrim" data-os-close></div><article class="os-dialog" data-lenis-prevent><button class="archive-round os-close" type="button" data-os-close aria-label="关闭胶片">×</button><div class="os-dialog__media"></div><div class="os-dialog__info"></div></article>`;
  document.body.append(box);
  const panel = $('.os-dialog', box), media = $('.os-dialog__media', box), info = $('.os-dialog__info', box), scrim = $('.archive-scrim', box);
  let origin, item, imgs, index, closing, flip, fade, touch;
  const neutral = 'translate3d(0,0,0) scale(1,1)';
  function originTransform(r, d) { return `translate3d(${r.left + r.width / 2 - d.left - d.width / 2}px,${r.top + r.height / 2 - d.top - d.height / 2}px,0) scale(${r.width / d.width},${r.height / d.height})`; }
  function imageAt(n) {
    if (!imgs.length || item.kind === 'video') return;
    index = (n + imgs.length) % imgs.length; const img = $('.os-main-image', media); img.src = imgs[index]; img.alt = `${item.title} · 第 ${index + 1} 张`; $('output', media).textContent = `${index + 1} / ${imgs.length}`;
    $$('[data-os-img]', media).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.osImg === index)));
  }
  function close(then) {
    if (closing || box.hidden) return; closing = true;
    const start = getComputedStyle(panel).transform; flip?.cancel(); fade?.cancel();
    const rect = origin?.getBoundingClientRect(), dest = panel.getBoundingClientRect(), rail = origin?.closest('.os-viewport')?.getBoundingClientRect();
    const visible = rect && rail && rect.bottom > 0 && rect.top < innerHeight && rect.right > rail.left && rect.left < rail.right;
    const done = () => { origin?.classList.remove('is-origin-hidden'); overlay.close(box); pause(false); then?.(); };
    if (reduced || !panel.animate) { done(); return; }
    const opts = { duration: 320, easing: 'cubic-bezier(.32,0,.2,1)', fill: 'both' };
    flip = panel.animate([{ transform: start, opacity: 1 }, { transform: visible ? originTransform(rect, dest) : 'scale(.96)', opacity: 0, borderRadius: '12px' }], opts);
    fade = scrim.animate([{ opacity: 1 }, { opacity: 0 }], opts); flip.onfinish = done;
  }
  box.addEventListener('click', e => {
    const b = e.target.closest('button,[data-os-close]'); if (!b) return;
    if (b.hasAttribute('data-os-close')) close();
    else if (b.dataset.osWho) close(() => openMember ? openMember(b.dataset.osWho, origin) : location.assign(`member.html?id=${encodeURIComponent(b.dataset.osWho)}`));
    else if (b.dataset.osPhoto) imageAt(index + +b.dataset.osPhoto);
    else if (b.dataset.osImg !== undefined) imageAt(+b.dataset.osImg);
  });
  document.addEventListener('keydown', e => {
    if (box.hidden || overlay.top() !== box) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); imageAt(index + (e.key === 'ArrowLeft' ? -1 : 1)); }
  }, true);
  media.addEventListener('touchstart', e => { touch = e.touches.length === 1 && !e.target.closest('button,a,.os-thumbs') ? [e.touches[0].clientX, e.touches[0].clientY] : null; }, { passive: true });
  media.addEventListener('touchend', e => { if (!touch) return; const dx = e.changedTouches[0].clientX - touch[0], dy = e.changedTouches[0].clientY - touch[1]; if (Math.abs(dx) > 44 && Math.abs(dx) > 1.3 * Math.abs(dy)) imageAt(index + (dx < 0 ? 1 : -1)); touch = null; }, { passive: true });
  media.addEventListener('touchcancel', () => { touch = null; });
  return (card, n) => {
    const from = card.getBoundingClientRect(); origin = card; item = n; imgs = photos(n); index = 0; closing = false; flip?.cancel(); fade?.cancel(); pause(true);
    origin.classList.add('is-origin-hidden'); panel.style.setProperty('--mc', color(n, ctx));
    const video = n.kind === 'video', primary = n.primaryLabel || ({ 抖音: '前往抖音原片 ↗', 微博: '查看微博原帖 ↗' }[n.platform] || `前往 ${n.platform || ''} 原帖 ↗`);
    media.innerHTML = `<div class="os-stage${video ? ' os-stage--video' : ''}"><img class="os-main-image" alt="${esc(n.title)}" src="${esc(video ? n.cover || imgs[0] : imgs[0])}" ${photoAttrs}><span class="os-label">${esc(badge(n))}</span>${video ? `${external(n.primaryUrl, '播放原片 ↗', 'os-play')}<span class="os-video-credit">${esc([n.duration, trackNote(n)].filter(Boolean).join(' / '))}</span>` : `<div class="os-paging">${imgs.length > 1 ? round('data-os-photo', -1, '上一张照片') : ''}<output></output>${imgs.length > 1 ? round('data-os-photo', 1, '下一张照片') : ''}</div>`}</div>
      ${!video && imgs.length > 1 ? `<div class="os-thumbs">${imgs.map((src, k) => `<button type="button" data-os-img="${k}" aria-label="第 ${k + 1} 张照片"><img src="${esc(src)}" alt="" loading="lazy" ${photoAttrs}></button>`).join('')}</div>` : ''}`;
    info.innerHTML = `<small class="os-kicker">OFF STAGE // ${video ? 'MOTION PICTURE' : 'CONTACT PRINT'}</small><p class="os-byline"><time>${esc(relTime(n))}</time><span>${esc(n.platform)}</span><span>${esc(n.author)}</span></p><h3 id="os-title">${esc(n.title)}</h3><div class="os-members">${(n.members || []).map(id => ctx.byId[id] ? `<button type="button" data-os-who="${esc(id)}" style="--mc:${esc(ctx.byId[id].color)}"><i></i>${esc(ctx.byId[id].en)} ${esc(memberNames[id])}</button>` : '').join('')}</div>
      ${n.captionZh ? `<p class="os-note">${esc(n.captionZh)}</p>` : ''}${n.captionOrig && n.captionOrig !== n.captionZh ? `<details class="os-original"${n.captionZh ? '' : ' open'}><summary>原帖文字</summary><p>${esc(n.captionOrig)}</p></details>` : ''}
      <div class="os-links">${external(n.primaryUrl, primary, 'os-action')}${external(n.mirrorUrl, n.mirrorLabel || '国内免翻墙观看 ↗', 'os-action os-mirror')}${external(n.secondaryUrl, n.secondaryLabel || 'TikTok ↗', 'os-ghost')}</div>`;
    if (!video) imageAt(0);
    overlay.open(box, { focus: $('.os-close', box) }); box._return = origin; panel.scrollTop = info.scrollTop = 0;
    const to = panel.getBoundingClientRect(); if (reduced || !panel.animate) return;
    const opts = { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' };
    flip = panel.animate([{ transform: originTransform(from, to), borderRadius: '12px', opacity: .75 }, { transform: neutral, opacity: 1 }], opts);
    fade = scrim.animate([{ opacity: 0 }, { opacity: 1 }], opts);
  };
}
