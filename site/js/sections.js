// Ticker, Now (next-up + official / unverified lanes), member dex + dossier sheet, channels.
import { $, $$, esc, glyph, icon, badge, phaseBadge, detailBadges, sources, safeUrl, reveal, overlay, reduced, dayDiff, relDay, md, fullDate, weekday, cst, instant, dateRange, eventState, isConfirmed, nowMs, enhanceSegs, animateDetails } from './util.js';
import { setPower, currentPower } from './themes.js';
import { createPowerStripFX } from './powerfx.js';

export const memberChips = (ctx, ids, tag = 'span') => (ids || []).map(id => {
  if (id === 'group') return `<${tag} class="mchip"${tag === 'button' ? ' type="button" data-member="group"' : ''}><i>${glyph('galaxy')}</i>EXO</${tag}>`;
  const m = ctx.byId[id]; if (!m) return '';
  return `<${tag} class="mchip"${tag === 'button' ? ` type="button" data-member="${m.id}"` : ''} style="--mc:${m.color}"><i><img src="${esc(m.thumb)}" alt="" loading="lazy"></i>${esc(m.en)}</${tag}>`;
}).join('');

/* ---------- ticker ---------- */
export function initTicker(ctx) {
  const tickerEl = $('#ticker');
  if (!tickerEl) return;
  const parts = ['<span>We are one<b>EXO</b></span>', ...ctx.members.map(m => `<span>${glyph(m.id)}${esc(m.en)}<b>${esc(m.power.en)}</b></span>`), `<span>${glyph('galaxy')}EXO, 사랑하자<b>EXO-L</b></span>`].join('');
  tickerEl.innerHTML = parts + parts;
}

/* ---------- now ---------- */
export function initNow(ctx, { openMember, focusEvent }) {
  const nowEl = $('#now'), card = $('#next-card');
  if (!nowEl || !card) return;
  const refMs = nowMs();
  const ongoingList = ctx.events
    .filter(e => isConfirmed(e) && eventState(e, refMs).isOngoing)
    .sort((a, b) => (a.endDate || a.date).localeCompare(b.endDate || b.date));
  const cands = ctx.events
    .filter(e => isConfirmed(e) && eventState(e, refMs).isUpcoming && ['演唱会', '粉丝见面', '发行'].includes(e.category))
    .sort((a, b) => (a.date + (a.timeKST || '23:59')).localeCompare(b.date + (b.timeKST || '23:59')));
  const next = cands[0] || null, after = cands.slice(1, 4);

  const ongoingHTML = ongoingList.length ? `<div class="next__ongoing" aria-label="正在进行的已确认事项">
    ${ongoingList.map(o => `<div class="ongoing-bar">
      <div class="ongoing-bar__head"><span class="kicker">ONGOING · 正在进行</span>${badge(o.verification)}${phaseBadge(o)}<span class="tag">${esc(o.category)}</span></div>
      <div class="ongoing-bar__body">
        <div>
          <h4>${esc(o.title)}</h4>
          ${o.summary ? `<details class="ongoing-fold"><summary>展开预售版本与渠道细则 ↓</summary><p>${esc(o.summary)}</p></details>` : ''}
        </div>
        <div class="ongoing-bar__act">
          ${o.ticket?.url ? `<a class="cbtn cbtn--sm" href="${esc(safeUrl(o.ticket.url))}" target="_blank" rel="noopener noreferrer">前往官方入口 ↗</a>` : ''}
          <button class="link" type="button" data-event="${esc(o.id)}">在行程里查看</button>
        </div>
      </div>
    </div>`).join('')}
  </div>` : '';

  if (next) {
    const hasTime = !!next.timeKST;
    const when = hasTime ? `${fullDate(next.date)} ${weekday(next.date)} · 首尔 ${next.timeKST} / 北京 ${cst(next.timeKST)}` : `${dateRange(next)} ${weekday(next.date)}${next.timeLocal ? ' · ' + next.timeLocal : ' · 具体时刻待公布'}`;
    card.innerHTML = `
      ${ongoingHTML}
      <div class="next__main">
        <p class="next__k"><span class="kicker">NEXT STAGE · 下一场公开节点</span>${badge(next.verification)}${phaseBadge(next)}${detailBadges(next)}<span class="tag">${esc(next.category)}</span></p>
        <h3 class="next__title">${esc(next.title)}</h3>
        <p class="next__meta">${memberChips(ctx, next.members, 'button')}${next.city || next.venue ? `<span>${icon('pin')}${esc([next.city, next.venue].filter(Boolean).join(' · '))}</span>` : ''}</p>
        <p class="next__sum">${esc(next.summary)}</p>
        <p class="next__foot">${sources(next.sources)}<button class="link" type="button" data-event="${esc(next.id)}">在行程里查看</button></p>
      </div>
      <div class="next__side"><i class="next__ring"></i><i class="next__ring"></i>
        <div class="count" id="count" role="timer" aria-label="倒计时"></div>
        <p class="next__when">${esc(when)}</p>
      </div>
      ${after.length ? `<div class="next__after">${after.map(e => `<a href="#schedule" data-event="${esc(e.id)}"><time datetime="${e.date}">${md(e.date)}</time><b>${esc(e.title)}</b><small>${eventState(e, refMs).dateChip} · ${esc(e.category)} · ${VERIF_SHORT(e.verification)}</small></a>`).join('')}</div>` : ''}`;
    const el = $('#count'); const target = instant(next.date, next.timeKST);
    const pad = n => String(n).padStart(2, '0');
    const draw = () => {
      let s = Math.max(0, Math.floor((target - nowMs()) / 1000));
      const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
      el.innerHTML = hasTime
        ? `<div><b>${d}</b><span>天</span></div><i>:</i><div><b>${pad(h)}</b><span>时</span></div><i>:</i><div><b>${pad(m)}</b><span>分</span></div><i>:</i><div><b>${pad(s)}</b><span>秒</span></div>`
        : `<div><b>${Math.max(0, dayDiff(next.date))}</b><span>天后</span></div>`;
    };
    draw(); if (hasTime) setInterval(draw, 1000);
  } else {
    card.innerHTML = `${ongoingHTML}<div class="next__main"><p class="next__k"><span class="kicker">NEXT STAGE · 下一节点</span></p><h3 class="next__title">暂无已确认的新增演出或发行</h3><p class="next__sum">公开渠道发布新通告并完成信源核验后将同步至此。</p></div>`;
  }

  const item = n => {
    const [, m, d] = n.date.split('-');
    const long = (n.summary || '').length > 56 || !!n.missing;
    return `<li class="item rv">
      <div class="item__date"><b>${d}</b><span>${+m} 月</span></div>
      <div class="item__tags">${badge(n.verification)}${n.channel ? `<span class="tag">${esc(n.channel)}</span>` : ''}${memberChips(ctx, n.members, 'button')}</div>
      <h4>${esc(n.title)}</h4>
      ${long
        ? `<details class="item__fold"><summary><span>${esc(n.summary)}</span><i>展开全文 ↓</i></summary><p>${esc(n.summary)}</p>${n.missing ? `<p class="item__miss"><b>待补齐凭据</b>${esc(n.missing)}</p>` : ''}<div class="item__src"><span>来源</span>${sources(n.sources)}</div></details>`
        : `<p>${esc(n.summary)}</p><div class="item__src"><span>来源</span>${sources(n.sources)}</div>`}
    </li>`;
  };
  const lane = (el, list, emptyText, limit) => {
    if (!list.length) { el.innerHTML = `<li class="lane__empty">${emptyText}</li>`; return; }
    let expanded = false;
    const renderLane = () => {
      const slice = expanded ? list : list.slice(0, limit);
      el.innerHTML = slice.map(item).join('');
      reveal(el);
    };
    renderLane();
    if (list.length > limit) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'fold-btn lane__more';
      const syncBtn = () => { more.textContent = expanded ? `收起其余 ${list.length - limit} 条消息 ↑` : `展开其余 ${list.length - limit} 条消息 ↓`; };
      syncBtn();
      more.addEventListener('click', () => { expanded = !expanded; renderLane(); syncBtn(); });
      el.after(more);
    }
  };
  const official = ctx.news.filter(n => n.verification !== 'unverified');
  const rumor = [...ctx.news.filter(n => n.verification === 'unverified')];
  const isMob = window.matchMedia('(max-width: 720px)').matches;
  const offLane = $('#lane-official'), rumLane = $('#lane-rumor');
  if (offLane) lane(offLane, official, '最近没有新的正式消息。', isMob ? 2 : 2);
  if (rumLane) lane(rumLane, rumor, '目前没有在流传的未证实消息。', isMob ? 1 : 2);
  const offCount = $('[data-count=official]'); if (offCount) offCount.textContent = official.length || '';
  const rumCount = $('[data-count=rumor]'); if (rumCount) rumCount.textContent = rumor.length || '';
  animateDetails(nowEl);

  nowEl.addEventListener('click', e => {
    const ev = e.target.closest('[data-event]'); if (ev) { e.preventDefault(); focusEvent(ev.dataset.event); return; }
    const m = e.target.closest('button[data-member]'); if (m && m.dataset.member !== 'group') openMember(m.dataset.member, m);
  });
}

const VERIF_SHORT = v => (v === 'official' ? '官方' : v === 'media' ? '媒体' : '待核实');

/* ---------- members: Horizontal Character Band + Jelly Spring Physics + 9 Superpower Hover FX ---------- */
export function initMembers(ctx, { focusEvent, filterMember }) {
  const dex = $('#dex');
  if (!dex) return { openMember: id => { location.href = 'member.html?id=' + encodeURIComponent(id); } };
  const sec = $('#members');
  const activePersonal = id => ctx.events.filter(e => eventState(e).isActive && e.members.includes(id)).sort((a, b) => a.date.localeCompare(b.date));
  const activeGroup = () => ctx.events.filter(e => eventState(e).isActive && e.members.includes('group')).sort((a, b) => a.date.localeCompare(b.date));
  const memberNewsOf = id => ctx.news.filter(n => n.members.includes(id) || n.members.includes('group')).sort((a, b) => b.date.localeCompare(a.date));
  const memberVarietyOf = id => (ctx.archive?.variety || []).filter(v => (v.members || []).includes(id) || (v.cat === 'group' && (v.members || []).includes('exo')));

  // Inject View Switcher + Superpower FX Hint above #dex
  const barWrap = document.createElement('div');
  barWrap.className = 'mstrip-bar';
  barWrap.innerHTML = `
    <p class="mstrip-bar__hint"><i class="mstrip-bar__dot"></i>鼠标滑过任一成员激发专属超能力粒子与果冻展开动效 · 点选右上缩略图可切换多时期官方画报</p>
    <div class="seg mstrip-bar__seg" role="group" aria-label="成员展示视图">
      <button type="button" data-mview="strip" aria-pressed="true">横向画报人物带</button>
      <button type="button" data-mview="grid" aria-pressed="false">九宫档案网格</button>
    </div>`;
  dex.before(barWrap);
  enhanceSegs(barWrap);

  const groupUp = activeGroup();

  // Build Horizontal Character Band (.mstrip) + Grid Fallback (.mgrid)
  const stripHTML = `<div class="mstrip" id="mstrip" role="list" aria-label="九位成员横向画报人物带">
    ${ctx.members.map((m, i) => {
      const pUp = activePersonal(m.id);
      const works = m.works?.length ? m.works : (m.solo || []).map(s => ({ kind: '作品', title: s, year: '', detail: '' }));
      const varList = memberVarietyOf(m.id);
      const schedCount = pUp.length || groupUp.length;
      const gallery = m.gallery?.length ? m.gallery : [m.photo, m.photo2].filter(Boolean).map((src, k) => ({ src, era: [m.photoEra, m.photo2Era][k] || '' }));
      const unitTags = (m.units || []).map(u => `<span class="mcard__unit">${esc(u)}</span>`).join('');
      return `<article class="mpanel" role="listitem" tabindex="0" data-mpanel="${m.id}" data-idx="${i}" style="--mc:${m.color};--mc2:${m.color2};--fw:1">
        <div class="mpanel__card">
          <div class="mpanel__media">
            <img class="mpanel__img is-active" src="${esc(gallery[0].src)}" alt="${esc(m.en)} ${esc(m.zh)}" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async">
            <img class="mpanel__img mpanel__img--back" src="${esc(gallery[0].src)}" alt="" aria-hidden="true">
          </div>
          <div class="mpanel__shade" aria-hidden="true"></div>
          ${glyph(m.id, 'glyph mpanel__watermark')}

          <!-- Top Strip Spine: Planet No + Official Superpower Emblem + Multi-Era Photo Switcher -->
          <div class="mpanel__top">
            <span class="mpanel__no"><b>${m.no}</b><small>${esc(m.power.en)}</small></span>
            <span class="mpanel__badge" title="${esc(m.power.zh)} · ${esc(m.power.en)}">${glyph(m.id)}<em>${esc(m.power.zh)}</em></span>
          </div>

          ${gallery.length > 1 ? `<div class="mpanel__looks" role="group" aria-label="${esc(m.en)} 多时期画报切换">
            ${gallery.map((g, k) => `<button type="button" class="mpanel__look${k === 0 ? ' is-on' : ''}" data-mlook="${k}" data-msrc="${esc(g.src)}" data-mera="${esc(g.era)}" title="${esc(g.era || '造型 ' + (k + 1))}"><img src="${esc(g.src)}" alt="" loading="lazy"></button>`).join('')}
          </div>` : ''}

          <!-- Collapsed Vertical Identity (smoothly crossfades when expanded) -->
          <div class="mpanel__compact" aria-hidden="true">
            <b>${esc(m.en)}</b>
            <span>${esc(m.zh)}</span>
          </div>

          <!-- Fixed-Width Expanded Editorial Reveal (zero text-reflow during spring stretch!) -->
          <div class="mpanel__reveal">
            <div class="mpanel__era" data-era-label>${esc(gallery[0].era || 'OFFICIAL CONCEPT PHOTO')}</div>
            <div class="mpanel__head">
              <div>
                <h3 class="mpanel__en"><a href="member.html?id=${encodeURIComponent(m.id)}">${esc(m.en)}</a></h3>
                <p class="mpanel__zh">${esc(m.zh)} · <span>${esc(m.ko)}</span> · <i>${esc(m.role)}</i></p>
              </div>
              ${unitTags ? `<div class="mpanel__units">${unitTags}</div>` : ''}
            </div>
            <p class="mpanel__st">${esc(m.status || '')}</p>
            <ul class="mpanel__stats" aria-label="收录统计">
              <li><b>${works.length}</b>代表作</li>
              <li><b>${varList.length}</b>综艺档案</li>
              <li><b>${schedCount}</b>${pUp.length ? '个人日程' : '团体日程'}</li>
            </ul>
            <div class="mpanel__acts">
              <button class="mpanel__btn mpanel__btn--solid jelly-press" type="button" data-quick="${m.id}">速览档案</button>
              <a class="mpanel__btn mpanel__btn--ghost jelly-press" href="member.html?id=${encodeURIComponent(m.id)}">单人专栏 →</a>
            </div>
          </div>
        </div>
      </article>`;
    }).join('')}
  </div>`;

  const gridHTML = `<div class="dex-grid" id="dex-grid" hidden>
    ${ctx.members.map((m, i) => {
      const pUp = activePersonal(m.id);
      const works = m.works?.length ? m.works : (m.solo || []).map(s => ({ kind: '作品', title: s, year: '', detail: '' }));
      const mNews = ctx.news.filter(n => n.members.includes(m.id));
      const schedCount = pUp.length || groupUp.length;
      const schedLabel = pUp.length
        ? `${pUp.some(e => eventState(e).isOngoing) ? '含进行中 · ' : ''}个人/分队日程 ${pUp.length}`
        : `团体日程 ${groupUp.length}`;
      const unitTags = (m.units || []).map(u => `<span class="mcard__unit">${esc(u)}</span>`).join('');
      return `<article class="mcard rv is-in" data-member="${m.id}" style="--mc:${m.color};--mc2:${m.color2};--i:${i % 3}">
        <a class="mcard__pic" href="member.html?id=${encodeURIComponent(m.id)}" aria-label="打开 ${esc(m.en)} ${esc(m.zh)} 单人专栏">
          <img src="${esc(m.photo)}" alt="${esc(m.en)}" loading="lazy" decoding="async">
        </a>
        <div class="mcard__body">${glyph(m.id, 'glyph mcard__mark')}
          <div class="mcard__top"><span class="mcard__no">NO. ${m.no}</span><span class="type">${glyph(m.id)}${esc(m.power.zh)}<small>${esc(m.power.en)}</small></span></div>
          <h3 class="mcard__en"><a href="member.html?id=${encodeURIComponent(m.id)}">${esc(m.en)}</a></h3>
          <p class="mcard__zh">${esc(m.zh)}<span>${esc(m.ko)}</span><i>${esc(m.role)}</i></p>
          ${unitTags ? `<div class="mcard__units">${unitTags}</div>` : ''}
          <p class="mcard__st">${esc(m.status || '')}</p>
          <ul class="mcard__metrics" aria-label="专栏收录内容概览">
            <li><b>${works.length}</b>代表作</li>
            <li><b>${mNews.length || memberNewsOf(m.id).length}</b>动态</li>
            <li><b>${schedCount}</b>${pUp.length ? '个人日程' : '团体日程'}</li>
          </ul>
          <div class="mcard__actions">
            <button class="mcard__quick jelly-press" type="button" data-quick="${m.id}" aria-label="页内速览 ${esc(m.zh)} 档案">速览档案</button>
            <a class="mcard__go jelly-press" href="member.html?id=${encodeURIComponent(m.id)}">单人专栏<b>${esc(schedLabel)}</b></a>
          </div>
        </div></article>`;
    }).join('')}
  </div>`;

  dex.classList.add('dex--upgraded');
  dex.innerHTML = stripHTML + gridHTML;

  const stripEl = $('#mstrip', dex);
  const gridEl = $('#dex-grid', dex);
  const panels = $$('.mpanel', stripEl);
  const cards = panels.map(p => $('.mpanel__card', p));
  const powerFX = createPowerStripFX();

  // Continuous Damped Harmonic Spring Physics (60fps silky jelly expansion, zero snap/reflow)
  const N = panels.length;
  const curFlex = new Array(N).fill(1);
  const velFlex = new Array(N).fill(0);
  const curJelly = new Array(N).fill(0); // squash/stretch impulse (-0.04 .. +0.05)
  const velJelly = new Array(N).fill(0);
  let activeIdx = -1;
  let springRaf = 0;
  let lastT = performance.now();
  const isDesktopStrip = () => window.innerWidth > 920 && !gridEl.offsetParent;

  function stepSpring(now) {
    const dt = Math.min(0.032, Math.max(0.004, (now - lastT) / 1000));
    lastT = now;
    let moving = false;

    const kFlex = 178, dFlex = 19.5;   // slightly underdamped for organic elastic settle
    const kJelly = 260, dJelly = 14.5; // tactile jelly bounce on card surface

    for (let i = 0; i < N; i++) {
      let target = 1;
      if (activeIdx >= 0 && isDesktopStrip()) {
        const dist = Math.abs(i - activeIdx);
        target = dist === 0 ? 4.55 : dist === 1 ? 1.14 : 0.88;
      }
      const fAcc = (target - curFlex[i]) * kFlex - velFlex[i] * dFlex;
      velFlex[i] += fAcc * dt;
      curFlex[i] += velFlex[i] * dt;

      const jAcc = (0 - curJelly[i]) * kJelly - velJelly[i] * dJelly;
      velJelly[i] += jAcc * dt;
      curJelly[i] += velJelly[i] * dt;

      if (Math.abs(target - curFlex[i]) > 0.002 || Math.abs(velFlex[i]) > 0.004 || Math.abs(curJelly[i]) > 0.0008 || Math.abs(velJelly[i]) > 0.003) {
        moving = true;
      } else {
        curFlex[i] = target;
        velFlex[i] = 0;
        curJelly[i] = 0;
        velJelly[i] = 0;
      }

      if (isDesktopStrip()) {
        panels[i].style.flexGrow = curFlex[i].toFixed(4);
      } else {
        panels[i].style.flexGrow = '';
      }
      const sx = 1 + curJelly[i];
      const sy = 1 - curJelly[i] * 0.62;
      const lift = (i === activeIdx) ? -4 : 0;
      cards[i].style.transform = (Math.abs(curJelly[i]) > 0.0005 || lift !== 0)
        ? `translate3d(0, ${lift}px, 0) scale3d(${sx.toFixed(4)}, ${sy.toFixed(4)}, 1)`
        : '';
    }

    if (moving && !reduced) {
      springRaf = requestAnimationFrame(stepSpring);
    } else {
      springRaf = 0;
      for (let i = 0; i < N; i++) {
        panels[i].style.willChange = '';
        cards[i].style.willChange = '';
      }
    }
  }

  function kickSpring() {
    if (reduced) {
      for (let i = 0; i < N; i++) {
        panels[i].style.flexGrow = (activeIdx === i && isDesktopStrip()) ? '4.55' : '1';
      }
      return;
    }
    if (!springRaf) {
      for (let i = 0; i < N; i++) {
        panels[i].style.willChange = 'flex-grow';
        cards[i].style.willChange = 'transform';
      }
      lastT = performance.now();
      springRaf = requestAnimationFrame(stepSpring);
    }
  }

  function setActivePanel(idx) {
    if (idx === activeIdx) return;
    const prev = activeIdx;
    activeIdx = idx;
    panels.forEach((p, i) => p.classList.toggle('is-open', i === activeIdx));
    stripEl.classList.toggle('has-open', activeIdx >= 0);

    if (idx >= 0) {
      // Inject tactile jelly impulse on newly activated card & gentle counter-wave on neighbors
      velJelly[idx] += 0.34;
      if (idx > 0) velJelly[idx - 1] -= 0.14;
      if (idx < N - 1) velJelly[idx + 1] -= 0.14;
      powerFX.attach(cards[idx], panels[idx].dataset.mpanel);
      if (!reduced) {
        const rev = $('.mpanel__reveal', panels[idx]);
        rev?.animate?.(
          [{ opacity: 0.45, transform: 'translate3d(0, 8px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
          { duration: 280, easing: 'cubic-bezier(.22, 1, .36, 1)' }
        );
      }
    } else {
      if (prev >= 0) velJelly[prev] -= 0.18;
      powerFX.stop();
    }
    kickSpring();
  }

  // Seamless pointer tracking across the horizontal band
  stripEl.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const p = e.target.closest('.mpanel');
    if (p) setActivePanel(+p.dataset.idx);
  });
  stripEl.addEventListener('pointermove', e => {
    const p = e.target.closest('.mpanel');
    if (!p) return;
    if (e.pointerType !== 'touch' && +p.dataset.idx !== activeIdx) setActivePanel(+p.dataset.idx);
    const card = cards[+p.dataset.idx];
    const r = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / Math.max(1, r.width);
    const ny = (e.clientY - r.top) / Math.max(1, r.height);
    card.style.setProperty('--px', `${(nx * 100).toFixed(1)}%`);
    card.style.setProperty('--py', `${(ny * 100).toFixed(1)}%`);
    powerFX.pointer(nx, ny);
  }, { passive: true });
  stripEl.addEventListener('pointerleave', e => {
    if (e.pointerType === 'touch') return;
    setActivePanel(-1);
  });
  stripEl.addEventListener('focusin', e => {
    const p = e.target.closest('.mpanel');
    if (p) setActivePanel(+p.dataset.idx);
  });

  // Switch multi-era photos smoothly on look-chip hover or click + support mobile tap-to-open
  const switchPanelLook = btn => {
    const p = btn.closest('.mpanel');
    if (!p) return;
    const src = btn.dataset.msrc, era = btn.dataset.mera;
    const mainImg = $('.mpanel__img.is-active', p);
    const backImg = $('.mpanel__img--back', p);
    if (mainImg && mainImg.getAttribute('src') !== src) {
      if (backImg) backImg.src = mainImg.src;
      mainImg.classList.remove('is-swapping');
      void mainImg.offsetWidth;
      mainImg.src = src;
      mainImg.classList.add('is-swapping');
    }
    $$('.mpanel__look', p).forEach(b => b.classList.toggle('is-on', b === btn));
    const eraLbl = $('[data-era-label]', p);
    if (eraLbl && era) eraLbl.textContent = era;
  };

  stripEl.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const look = e.target.closest('.mpanel__look');
    if (look) switchPanelLook(look);
  });
  stripEl.addEventListener('click', e => {
    const look = e.target.closest('.mpanel__look');
    if (look) { e.preventDefault(); e.stopPropagation(); switchPanelLook(look); return; }
    const p = e.target.closest('.mpanel');
    if (!p) return;
    const idx = +p.dataset.idx;
    // On mobile/tablet where hover doesn't pre-expand, first tap opens superpower card, buttons inside work normally
    if (!isDesktopStrip() && activeIdx !== idx && !e.target.closest('a, button')) {
      e.preventDefault();
      setActivePanel(idx);
      p.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  });

  // View Mode Switcher (Horizontal Band vs 9-Card Grid)
  barWrap.addEventListener('click', e => {
    const vBtn = e.target.closest('[data-mview]');
    if (!vBtn) return;
    const mode = vBtn.dataset.mview;
    $$('[data-mview]', barWrap).forEach(b => b.setAttribute('aria-pressed', String(b === vBtn)));
    const showGrid = mode === 'grid';
    stripEl.hidden = showGrid;
    gridEl.hidden = !showGrid;
    if (showGrid) setActivePanel(-1);
    window.ScrollTrigger?.refresh();
  });

  const sheet = $('#sheet'), panel = $('#sheet-panel');
  function openMember(id) {
    const m = ctx.byId[id]; if (!m) return;
    if (!sheet || !panel) { location.href = 'member.html?id=' + encodeURIComponent(m.id); return; }
    const pUp = activePersonal(m.id), gUp = activeGroup();
    const combinedUp = [...pUp, ...gUp.filter(g => !pUp.some(p => p.id === g.id))].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    const recentNews = memberNewsOf(m.id).slice(0, 3);
    const works = m.works?.length ? m.works : (m.solo || []).map(s => ({ kind: '个人作品', title: s, year: '', detail: '' }));
    const mVarieties = memberVarietyOf(m.id).slice(0, 6);
    const gallery = m.gallery?.length ? m.gallery : [m.photo, m.photo2].filter(Boolean).map((src, k) => ({ src, era: [m.photoEra, m.photo2Era][k] || '' }));
    const links = (m.channels || []).filter(c => safeUrl(c.url));
    panel.style.setProperty('--mc', m.color); panel.style.setProperty('--mc2', m.color2);
    panel.innerHTML = `
      <header class="sheet__hero">
        <img src="${esc(gallery[0].src)}" alt="${esc(m.en)} ${esc(gallery[0].era || '')}" id="sheet-img">
        ${gallery.length > 1 ? `<div class="sheet__looks" role="group" aria-label="切换多时期官方画报">${gallery.map((g, i) => `<button type="button" data-look="${i}" aria-pressed="${i === 0}" aria-label="${esc(g.era || '照片 ' + (i + 1))}"><img src="${esc(g.src)}" alt=""></button>`).join('')}</div>` : ''}
        <button class="iconbtn sheet__x" type="button" data-close aria-label="关闭">${icon('close')}</button>
        <div class="sheet__name">
          <p class="sheet__code">PLANET ${m.no} // ${esc(m.role)}${m.units?.length ? ' · ' + esc(m.units.join(' / ')) : ''}</p>
          <span class="type">${glyph(m.id)}${esc(m.power.zh)}<small>${esc(m.power.en)}</small></span>
          <h2>${esc(m.en)}</h2>
          <p>${esc(m.zh)} · ${esc(m.ko)} · ${esc(m.koReal)}</p>
        </div>
        <span class="sheet__era" id="sheet-era">${esc(gallery[0].era || '')}${gallery[0].era ? ' · © SM Entertainment' : ''}</span>
      </header>
      <div class="sheet__body">
        <div class="sheet__cta-bar">
          <a class="cbtn jelly-press" href="member.html?id=${encodeURIComponent(m.id)}">打开 ${esc(m.en)} 完整单人专栏 →</a>
          <button class="cbtn cbtn--ghost jelly-press" type="button" data-filter-member="${m.id}">在行程中筛选他</button>
          <button class="cbtn cbtn--ghost jelly-press" type="button" data-set-power="${m.id}">${currentPower() === m.id ? '当前已是该超能力主题' : `设为全站主题「${esc(m.power.zh)}」`}</button>
        </div>
        <section class="sheet__power">${glyph(m.id)}<p>${esc(m.power.line)}</p></section>
        <section><h3>01 · 实时近况</h3><p class="sheet__status">${esc(m.status || '')}</p>
          ${m.statusSources?.length ? `<div class="item__src" style="margin-top:12px"><span>信源</span>${sources(m.statusSources)}</div>` : ''}</section>
        <section><h3>02 · 基础档案</h3><dl class="facts">
          <div><dt>出生日期</dt><dd>${esc(fullDate(m.birth))}</dd></div><div><dt>团内定位</dt><dd>${esc(m.role)}${m.units?.length ? ` · ${esc(m.units.join(' / '))}` : ''}</dd></div>
          <div><dt>经纪与合约状态</dt><dd>${esc(m.agency || '—')}</dd></div><div><dt>近期发行与企划</dt><dd>${esc(m.latest || '—')}</dd></div></dl></section>
        <section><h3>03 · 进行中与待办日程（含团体）</h3>${combinedUp.length ? `<ul class="sheet__list">${combinedUp.map(e => {
          const isGrp = e.members.includes('group') && !e.members.includes(m.id);
          return `<li data-sheet-ev="${esc(e.id)}"><time datetime="${e.date}">${md(e.date)}${e.endDate && e.endDate !== e.date ? `<small>–${md(e.endDate)}</small>` : ''}</time>
            <div><b>${esc(e.title)}</b><small>${isGrp ? '【团体共同】' : '【个人/分队】'} · ${esc(e.category)}${e.city ? ' · ' + esc(e.city) : ''}</small></div>
            <div class="sheet__badges">${badge(e.verification, { compact: true })}${phaseBadge(e)}</div></li>`;
        }).join('')}</ul>`
          : `<p class="sheet__none">当前暂无未结束的公开日程。</p>`}</section>
        <section><h3>04 · 个人与小分队代表作</h3><ul class="sheet__works">${works.map(w => `<li><div class="sheet__work-top"><span class="tag">${esc(w.kind)}</span>${w.year ? `<time>${esc(w.year)}</time>` : ''}</div><b>${esc(w.title)}</b>${w.detail ? `<p>${esc(w.detail)}</p>` : ''}</li>`).join('')}</ul></section>
        ${mVarieties.length ? `<section><h3>05 · 代表综艺与团综精选</h3><ul class="sheet__works">${mVarieties.map(v => `<li><div class="sheet__work-top"><span class="tag">${esc(v.p)}</span><time>${esc(v.y)}</time></div><b>${esc(v.zh)}</b>${v.note ? `<p>${esc(v.note)}</p>` : ''}</li>`).join('')}</ul></section>` : ''}
        ${recentNews.length ? `<section><h3>06 · 近期相关动态</h3><ul class="sheet__news">${recentNews.map(n => `<li><div class="sheet__work-top">${badge(n.verification, { compact: true })}<span>${fullDate(n.date)} · ${esc(n.channel)}</span></div><b>${esc(n.title)}</b></li>`).join('')}</ul></section>` : ''}
        <section><h3>07 · 已核实官方入口</h3>${links.length ? `<div class="sheet__links">${links.map(c => `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}${icon('arrow')}</a>`).join('')}</div>` : ''}
          ${m.channelsNote ? `<p class="sheet__none" style="margin-top:${links.length ? 10 : 0}px;font-size:13px">${esc(m.channelsNote)}</p>` : ''}</section>
      </div>`;
    panel.scrollTop = 0;
    overlay.open(sheet, { focus: $('.sheet__x', panel) });
  }
  if (panel) panel.addEventListener('click', e => {
    const look = e.target.closest('[data-look]');
    if (look) { const i = +look.dataset.look; const b = $$('[data-look]', panel); b.forEach((x, k) => x.setAttribute('aria-pressed', String(k === i))); $('#sheet-img').src = $('img', look).src; $('#sheet-era').textContent = (look.getAttribute('aria-label') || '') + ' · © SM Entertainment'; return; }
    const sp = e.target.closest('[data-set-power]');
    if (sp) { const r = sp.getBoundingClientRect(); setPower(sp.dataset.setPower, { x: r.left + r.width / 2, y: r.top + r.height / 2 }); sp.textContent = '当前已是该超能力主题'; return; }
    const fm = e.target.closest('[data-filter-member]');
    if (fm) { overlay.close(sheet); filterMember(fm.dataset.filterMember); return; }
    const sev = e.target.closest('[data-sheet-ev]');
    if (sev && focusEvent) { overlay.close(sheet); focusEvent(sev.dataset.sheetEv); }
  });
  dex.addEventListener('click', e => {
    const q = e.target.closest('[data-quick]');
    if (q) { e.preventDefault(); openMember(q.dataset.quick, q); }
  });
  return { openMember };
}

/* ---------- channels ---------- */
const COV = { live: ['已纳入核对', 100], partial: ['逐步覆盖中', 55], planned: ['计划中', 12] };
const TIER = { official: '官方', retail: '商家 · 票务', media: '媒体', fan: '粉丝' };
export function initChannels(ctx) {
  const chanHost = $('#chan');
  if (!chanHost) return;
  const cardsHTML = ctx.channels.map((c, i) => {
    const [label, w] = COV[c.coverage] || COV.planned; const u = safeUrl(c.url); const tag = u ? 'a' : 'div';
    return `<${tag} class="ch rv" style="--i:${i % 4}"${u ? ` href="${esc(u)}" target="_blank" rel="noopener noreferrer"` : ''}>
      <div class="ch__top"><small>${esc(TIER[c.tier] || '')} · ${esc(c.zh)}</small><span class="cov cov--${c.coverage}"><i style="--w:${w}%"></i>${label}</span></div>
      <h3>${esc(c.name)}</h3><p class="ch__use">${esc(c.use)}</p><p class="ch__how">${esc(c.how)}</p>
      ${u ? `<svg class="ch__go" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-arrow"/></svg>` : ''}</${tag}>`;
  }).join('');
  const chanParent = chanHost.parentElement;
  chanHost.outerHTML = `<details class="chan-fold"><summary><span>展开全部 ${ctx.channels.length} 类常用渠道细则与核验覆盖度（Weverse / 官网 / 微博镜像 / 票务等）</span><i>展开 ↓</i></summary><div class="chan" id="chan">${cardsHTML}</div></details>`;
  reveal(chanParent || document);
  animateDetails(chanParent || document);
  const ev = ctx.events, nw = ctx.news;
  const un = ev.filter(e => e.verification === 'unverified').length + nw.filter(n => n.verification === 'unverified').length;
  const links = (ctx.meta.groupChannels || []).filter(g => safeUrl(g.url));
  const checkedEl = $('#checked');
  if (checkedEl) {
    checkedEl.innerHTML = `<span>最近一次人工核对：<b>${esc(fullDate(ctx.meta.checkedAt))}</b></span><span>收录 <b>${ev.length}</b> 条行程、<b>${nw.length}</b> 条消息</span><span>其中待核实 <b>${un}</b> 条，单独标注</span>
      ${links.length ? `<span style="flex-basis:100%;display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">${links.map(g => `<a class="pill" href="${esc(g.url)}" target="_blank" rel="noopener noreferrer" title="${esc(g.use || '')}">${esc(g.name)}</a>`).join('')}</span>` : ''}`;
  }

  // image credits
  const list = $('#credits-list');
  if (list) {
    const credits = (ctx.meta.credits || []).filter(c => safeUrl(c.sourcePage));
    list.innerHTML = `<p>成员照片为 EXIST《Cream Soda》（2023）与 REVERXE《Crown》（2026）官方概念照，专辑封面为各专辑官方数字封面，版权均归 SM Entertainment 及原权利人所有。本站为粉丝自制，仅作交流展示，不作商业用途。照片对应的成员以来源页面的文件名与说明为准。</p>
      ${credits.length ? `<ul style="margin-top:14px">${credits.map(c => `<li>${esc(c.title || c.file)} — ${esc(c.credit || '')} · <a class="src" href="${esc(c.sourcePage)}" target="_blank" rel="noopener noreferrer">来源页${icon('arrow')}</a></li>`).join('')}</ul>` : ''}`;
  }
  $$('[data-open-credits]').forEach(b => b.addEventListener('click', () => { const cr = $('#credits'); if (cr) overlay.open(cr); }));
}
