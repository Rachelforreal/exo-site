// Schedule + ticketing: dual-axis state (verification × lifecycle), tour grouping, favourites, calendar export.
import { $, $$, esc, glyph, icon, badge, phaseBadge, detailBadges, sources, safeUrl, reveal, store, toast, md, weekday, dayDiff, eventTimeLabel, instant, eventState, isConfirmed, hasTicketInfo, enhanceSegs, animateDetails, reduced } from './util.js';
import { memberChips } from './sections.js?v=27';

const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const WHEN_LABELS = { active: '进行中与即将', ongoing: '进行中', upcoming: '即将开始', done: '已结束', all: '全部时间' };
const VERIF_LABELS = { all: '全部来源', confirmed: '已确认（官方+媒体）', official: '仅官方' };

export function initSchedule(ctx, { openMember }) {
  // Default merge same-tour stops (series: true) and fold long list to keep home page compact!
  const st = { q: '', when: 'active', verif: 'all', year: '', days30: false, members: new Set(), cats: new Set(), ticket: false, series: true, star: false, showAll: false };
  const stars = new Set(store.get('exo-stars', []));
  const list = $('#sched-list'), qEl = $('#sched-q'), applied = $('#sched-applied'), verifEl = $('#sched-verif'), seriesEl = $('#sched-series');
  if (!list) return { focusEvent() {}, filterMember() {}, search() {} };
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button'; moreBtn.className = 'fold-btn'; moreBtn.id = 'sched-more'; moreBtn.hidden = true;
  list.after(moreBtn);
  moreBtn.addEventListener('click', () => { st.showAll = !st.showAll; render(); });
  const allRows = ctx.calendar || ctx.events;
  const hay = new Map(allRows.map(e => [e.id, [e.title, e.summary, e.city, e.venue, e.category, e.channel, e.series, e.detailNote, e.ticket?.platform, e.ticket?.note,
    ...(e.members || []).map(id => (id === 'group' ? 'EXO 团体 全员' : `${ctx.byId[id]?.en} ${ctx.byId[id]?.zh} ${ctx.byId[id]?.ko}`))].filter(Boolean).join(' ').toLowerCase()]));

  /* ---- chips ---- */
  const countFor = id => allRows.filter(e => eventState(e).isActive && e.members.includes(id)).length;
  $('#sched-members').innerHTML = `<button class="pill pill--m" type="button" data-m="group" aria-pressed="false" style="--mc:#d6dcff">${glyph('galaxy')}EXO 团体<em>${countFor('group') || ''}</em></button>` +
    ctx.members.map(m => `<button class="pill pill--m" type="button" data-m="${m.id}" aria-pressed="false" style="--mc:${m.color}"><img src="${esc(m.thumb)}" alt="" loading="lazy">${esc(m.en)}<em>${countFor(m.id) || ''}</em></button>`).join('');
  const cats = [...new Set(allRows.map(e => e.category))];
  $('#sched-cats').innerHTML = cats.map(c => `<button class="pill" type="button" data-c="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('');

  /* ---- one event ---- */
  const ticketHTML = e => {
    const t = e.ticket; if (!t || !(t.platform || t.url || t.onSale || t.note)) return '';
    const u = safeUrl(t.url);
    return `<p class="ev__ticket">${icon('ticket')}${t.platform ? `<b>${esc(t.platform)}</b>` : '<b>票务 / 预售</b>'}${t.onSale ? `<span>${/演唱会|见面|票务/.test(e.category || '') ? '开票' : '开售'} ${esc(t.onSale)}</span>` : ''}${t.note ? `<span>${esc(t.note)}</span>` : ''}${u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">前往页面${icon('arrow')}</a>` : ''}</p>`;
  };
  const CITY_IATA = [
    [/首尔|KSPO|高尺|蚕室|YES24|INSPIRE|仁川/, 'SEL'],
    [/澳门|MACAU/i, 'MFM'],
    [/香港|HONG KONG/i, 'HKG'],
    [/台北|高雄|台湾|TAIPEI/i, 'TPE'],
    [/东京|横滨|日本|TOKYO/i, 'TYO'],
    [/大阪|神户|OSAKA/i, 'OSA'],
    [/曼谷|BANGKOK/i, 'BKK'],
    [/雅加达|JAKARTA/i, 'CGK'],
    [/新加坡|SINGAPORE/i, 'SIN'],
    [/马尼拉|MANILA/i, 'MNL'],
    [/吉隆坡|KUALA/i, 'KUL'],
    [/北京/, 'PEK'],
    [/上海/, 'SHA'],
    [/青岛/, 'TAO'],
    [/广州|深圳/, 'CAN'],
  ];
  const getGateCode = e => {
    const loc = `${e.city || ''} ${e.venue || ''} ${e.title || ''}`;
    for (const [re, code] of CITY_IATA) if (re.test(loc)) return code;
    return /发行|预售|专辑/.test(e.category || '') ? 'REL' : 'EXO';
  };
  const evHTML = (e, i) => {
    const [yr, mNo, d] = e.date.split('-');
    const es = eventState(e);
    const first = (e.members || []).find(id => id !== 'group'); const mc = first && e.members.length === 1 ? ctx.byId[first]?.color : '';
    const time = eventTimeLabel(e);
    const range = e.endDate && e.endDate !== e.date ? `${+mNo}.${d} – ${md(e.endDate)}` : weekday(e.date);
    const hasDetails = !!(e.summary || e.detailNote || e.missing || (e.ticket && (e.ticket.platform || e.ticket.url || e.ticket.onSale || e.ticket.note)) || (e.sources && e.sources.length));
    const gate = getGateCode(e);
    const seatNo = `${yr.slice(2)}${mNo}-${d}`;
    return `<article class="ev rv${es.isDone ? ' is-done' : ''}${es.isOngoing ? ' is-ongoing' : ''}${e.verification === 'unverified' ? ' is-rumor' : ''}" id="ev-${esc(e.id)}" data-id="${esc(e.id)}" style="--i:${Math.min(i, 5)}${mc ? `;--mc:${mc}` : ''}">
      <div class="ev__date"><span class="ev__gate">${gate}</span><b>${d}</b><span>${esc(range)}</span><em class="is-${es.subphase === 'unconfirmed_past' ? 'stale' : es.phase}">${esc(es.dateChip)}</em></div>
      <div class="ev__body">
        <div class="ev__tags">${badge(e.verification)}${phaseBadge(e)}${detailBadges(e)}<span class="tag">${esc(e.category)}</span>${memberChips(ctx, e.members, 'button')}</div>
        <h4>${esc(e.title)}</h4>
        <p class="ev__meta">${time ? `<span>${icon('cal')}${esc(time)}</span>` : ''}${e.city || e.venue ? `<span>${icon('pin')}${esc([e.city, e.venue].filter(Boolean).join(' · '))}</span>` : ''}</p>
        ${hasDetails ? `<details class="ev__more">
          <summary><span>查看票务细则与核验信源${e.ticket?.platform ? ` · <b>${esc(e.ticket.platform)}</b>` : ''}</span><i>展开票根 ↓</i></summary>
          <div class="ev__more-in">
            ${e.summary ? `<p class="ev__sum">${esc(e.summary)}</p>` : ''}
            ${e.detailNote ? `<p class="ev__detail-note">${esc(e.detailNote)}</p>` : ''}
            ${ticketHTML(e)}
            ${e.missing ? `<p class="item__miss"><b>待补齐凭据</b>${esc(e.missing)}</p>` : ''}
            <div class="ev__src"><span>信源</span>${sources(e.sources) || '<span>档案常驻条目</span>'}</div>
          </div>
        </details>` : ''}
      </div>
      <div class="ev__side">
        <span class="ev__barcode" aria-hidden="true"><i></i><small>NO.${seatNo}</small></span>
        <span class="ev__stamp ev__stamp--${esc(e.verification)}" aria-hidden="true">${e.verification === 'official' ? 'OFFICIAL · 官方印鉴' : e.verification === 'media' ? 'MEDIA · 媒体报道' : 'RUMOR · 待核线索'}</span>
        <button class="star tear-stub-btn" type="button" data-star="${esc(e.id)}" aria-pressed="${stars.has(e.id)}" aria-label="收藏这条行程">${icon('star')}<span>${stars.has(e.id) ? '已存票夹' : '撕下存根'}</span></button>
      </div>
    </article>`;
  };

  const seriesGroupHTML = (seriesName, items, i) => {
    const firstEv = items[0], lastEv = items[items.length - 1];
    const [, , d] = firstEv.date.split('-');
    const firstMember = (firstEv.members || []).find(id => id !== 'group');
    const mc = firstMember ? ctx.byId[firstMember]?.color : '';
    const cities = [...new Set(items.map(x => x.city).filter(Boolean))].join(' · ');
    const hasOfficial = items.some(x => x.verification === 'official');
    const anyOngoing = items.some(x => eventState(x).isOngoing);
    return `<article class="ev ev--series rv" style="--i:${Math.min(i, 5)}${mc ? `;--mc:${mc}` : ''}">
      <div class="ev__date"><span class="ev__gate">TOUR</span><b>${d}</b><span>${md(firstEv.date)} – ${md(lastEv.endDate || lastEv.date)}</span><em class="is-${anyOngoing ? 'ongoing' : 'upcoming'}">共 ${items.length} 站</em></div>
      <div class="ev__body">
        <div class="ev__tags">${badge(hasOfficial ? 'official' : firstEv.verification)}<span class="pbadge pbadge--${anyOngoing ? 'ongoing' : 'upcoming'}">${anyOngoing ? '巡演进行中' : '多站巡演合集'}</span><span class="tag">${esc(firstEv.category)}</span>${memberChips(ctx, firstEv.members, 'button')}</div>
        <h4>${esc(seriesName)}</h4>
        ${cities ? `<p class="ev__meta"><span>${icon('pin')}途经城市：${esc(cities)}</span></p>` : ''}
        <details class="ev__stops">
          <summary>展开查看全部 ${items.length} 个场次、当地时间与票务状态</summary>
          <ol class="ev__stops-list">
            ${items.map(s => {
              const tUrl = safeUrl(s.ticket?.url);
              const tText = s.timeKST ? `${s.timeKST} KST` : (s.timeLocal || '具体时刻待公布');
              return `<li id="ev-${esc(s.id)}">
                <div class="ev__stop-main">
                  <b>${md(s.date)}${s.endDate && s.endDate !== s.date ? `–${md(s.endDate)}` : ''} · ${esc(s.city || s.title)}</b>
                  <span>${esc(s.venue || '场馆待公布')} · ${esc(tText)}</span>
                  ${s.ticket?.platform || s.ticket?.note ? `<small>${esc([s.ticket.platform, s.ticket.note].filter(Boolean).join(' · '))}</small>` : (s.detailNote ? `<small>${esc(s.detailNote)}</small>` : '')}
                </div>
                <div class="ev__stop-side">
                  ${badge(s.verification, { compact: true })}${phaseBadge(s)}
                  ${tUrl ? `<a class="src" href="${esc(tUrl)}" target="_blank" rel="noopener noreferrer">票务页${icon('arrow')}</a>` : ''}
                  <button class="star" type="button" data-star="${esc(s.id)}" aria-pressed="${stars.has(s.id)}" aria-label="收藏 ${esc(s.title)}">${icon('star')}</button>
                </div>
              </li>`;
            }).join('')}
          </ol>
        </details>
      </div>
    </article>`;
  };

  /* ---- filter + render ---- */
  let shown = [];
  const matchWhen = (es, w) => (
    w === 'active' ? es.isActive :
    w === 'ongoing' ? es.isOngoing :
    w === 'upcoming' ? es.isUpcoming :
    w === 'done' ? es.isDone : true
  );
  const matchVerif = (e, v) => (
    v === 'confirmed' ? isConfirmed(e) :
    v === 'official' ? e.verification === 'official' : true
  );
  function baseFiltered({ ignoreWhen = false, ignoreVerif = false } = {}) {
    const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean);
    return allRows.filter(e => {
      const es = eventState(e);
      if (!ignoreWhen && !matchWhen(es, st.when)) return false;
      if (!ignoreVerif && !matchVerif(e, st.verif)) return false;
      if (st.year) {
        const y1 = e.date.slice(0, 4), y2 = (e.endDate || e.date).slice(0, 4);
        if (st.year === 'archive' ? (+y1 > 2025) : (y1 !== st.year && y2 !== st.year)) return false;
      }
      if (st.days30) {
        const dDiff = dayDiff(e.date);
        if (!es.isOngoing && (dDiff < -1 || dDiff > 30)) return false;
      }
      if (st.members.size && !e.members.some(id => st.members.has(id))) return false;
      if (st.cats.size && !st.cats.has(e.category)) return false;
      if (st.ticket && !hasTicketInfo(e)) return false;
      if (st.star && !stars.has(e.id)) return false;
      const h = hay.get(e.id); return terms.every(t => h.includes(t));
    });
  }
  function filtered() {
    return baseFiltered().sort((a, b) => (st.when === 'done' ? -1 : 1) * (a.date + (a.timeKST || '')).localeCompare(b.date + (b.timeKST || '')));
  }
  function updateTabCounts() {
    const forWhen = baseFiltered({ ignoreWhen: true });
    $$('#sched-when button').forEach(b => {
      const w = b.dataset.when;
      const n = forWhen.filter(e => matchWhen(eventState(e), w)).length;
      const baseText = { active: '进行中与即将', ongoing: '进行中', upcoming: '即将开始', done: '已结束', all: '全部' }[w] || b.textContent;
      b.innerHTML = `${baseText}<em>${n}</em>`;
    });
    if (verifEl) {
      const forVerif = baseFiltered({ ignoreVerif: true });
      $$('button', verifEl).forEach(b => {
        const v = b.dataset.verif;
        const n = forVerif.filter(e => matchVerif(e, v)).length;
        const baseText = { all: '全部来源', confirmed: '已确认', official: '仅官方' }[v] || b.textContent;
        b.innerHTML = `${baseText}<em>${n}</em>`;
      });
    }
  }
  function buildUnits(rows) {
    if (!st.series) return rows.map(e => ({ kind: 'single', e, items: [e] }));
    const bySeries = new Map();
    for (const e of rows) {
      if (e.series) {
        if (!bySeries.has(e.series)) bySeries.set(e.series, []);
        bySeries.get(e.series).push(e);
      }
    }
    const emitted = new Set();
    const units = [];
    for (const e of rows) {
      if (e.series && bySeries.get(e.series)?.length > 1) {
        if (emitted.has(e.series)) continue;
        emitted.add(e.series);
        units.push({ kind: 'series', name: e.series, items: bySeries.get(e.series) });
      } else {
        units.push({ kind: 'single', e, items: [e] });
      }
    }
    return units;
  }
  const renderUnits = units => units.map((u, idx) => (u.kind === 'series' ? seriesGroupHTML(u.name, u.items, idx) : evHTML(u.e, idx))).join('');
  const countEvents = units => units.reduce((s, u) => s + u.items.length, 0);
  let hasRendered = false;
  function render() {
    updateTabCounts();
    shown = filtered();
    const userFiltering = st.q || st.members.size || st.cats.size || st.ticket || st.star || st.when !== 'active' || st.verif !== 'all' || st.year || st.days30;
    const active = userFiltering || !st.series;
    $('#sched-reset').hidden = !active;
    const selected = [];
    if (st.when !== 'active') selected.push(['when', '', `进度：${WHEN_LABELS[st.when]}`]);
    if (st.verif !== 'all') selected.push(['verif', '', `核实：${VERIF_LABELS[st.verif]}`]);
    if (st.year) selected.push(['year', '', `年份：${st.year === 'archive' ? '2012–2025' : st.year}`]);
    if (st.days30) selected.push(['days30', '', '近 30 天']);
    if (st.q) selected.push(['q', '', `搜索：${st.q}`]);
    st.members.forEach(id => selected.push(['member', id, id === 'group' ? 'EXO 团体' : (ctx.byId[id]?.en || id)]));
    st.cats.forEach(cat => selected.push(['category', cat, cat]));
    if (st.ticket) selected.push(['ticket', '', '有票务/预售入口']);
    if (!st.series) selected.push(['series', '', '已展开全部巡演单站']);
    if (st.star) selected.push(['star', '', '我的收藏']);
    applied.hidden = !selected.length;
    applied.innerHTML = selected.map(([kind, value, label]) => `<button class="pill" type="button" data-clear="${esc(kind)}" data-value="${esc(value)}" aria-label="移除 ${esc(label)}">${esc(label)} ×</button>`).join('');
    const og = shown.filter(e => eventState(e).isOngoing).length;
    $('#sched-count').textContent = shown.length
      ? `共 ${shown.length} 条${og ? ` · ${og} 条进行中` : ''}`
      : '共 0 条';
    $('#sched-ics').hidden = !shown.length;
    if (!shown.length) {
      moreBtn.hidden = true;
      list.innerHTML = `<div class="sched__empty"><b>${st.star && !stars.size ? '尚未收藏任何行程' : '当前筛选组合下没有匹配行程'}</b>${st.star && !stars.size ? '点击任意行程右侧星标即可保存在本机浏览器。' : '可移除上方部分筛选标签，或点击「清除筛选」查看全部日程。'}</div>`;
      enhanceSegs(list.closest('#schedule') || document);
      hasRendered = true;
      return;
    }

    // Group series BEFORE folding so multi-stop tours never split across the fold limit.
    const DEFAULT_UNITS = window.matchMedia('(max-width: 720px)').matches ? 3 : 4;
    let html = '';
    if (st.when === 'active') {
      const ongoingUnits = buildUnits(shown.filter(e => eventState(e).isOngoing));
      const upcomingUnits = buildUnits(shown.filter(e => !eventState(e).isOngoing));
      const totalUnits = ongoingUnits.length + upcomingUnits.length;
      const canFold = !userFiltering && totalUnits > DEFAULT_UNITS;
      let visOngoing = ongoingUnits, visUpcoming = upcomingUnits;
      if (canFold && !st.showAll) {
        const keepUpcoming = Math.max(2, DEFAULT_UNITS - ongoingUnits.length);
        visUpcoming = upcomingUnits.slice(0, keepUpcoming);
      }
      const hiddenCount = countEvents(ongoingUnits) + countEvents(upcomingUnits) - countEvents(visOngoing) - countEvents(visUpcoming);
      moreBtn.hidden = !canFold;
      if (canFold) {
        moreBtn.textContent = st.showAll
          ? `收起后续行程（仅显示近期 ${DEFAULT_UNITS} 组） ↑`
          : `展开其余 ${hiddenCount} 条远期行程与纪念日 ↓`;
      }
      if (visOngoing.length) {
        html += `<div class="month month--ongoing rv"><h3>ONGOING<small>正在进行 · 跨日预售与当日活动</small></h3><span>${countEvents(visOngoing)} 条</span></div>`;
        html += renderUnits(visOngoing);
      }
      if (st.series) {
        if (visUpcoming.length) {
          html += `<div class="month rv"><h3>UPCOMING<small>即将开始 · 同巡演已完整合并</small></h3><span>${countEvents(visUpcoming)} 条</span></div>`;
          html += renderUnits(visUpcoming);
        }
      } else {
        const flatUpcoming = visUpcoming.flatMap(u => u.items);
        let cur = '', i = 0;
        for (const e of flatUpcoming) {
          const ym = e.date.slice(0, 7);
          if (ym !== cur) {
            cur = ym; i = 0; const [y, m] = ym.split('-'); const n = flatUpcoming.filter(x => x.date.startsWith(ym)).length;
            html += `<div class="month rv"><h3>${MONTH_EN[+m - 1]}<small>${y} 年 ${+m} 月</small></h3><span>${n} 条</span></div>`;
          }
          html += evHTML(e, i++);
        }
      }
    } else if (st.series) {
      const units = buildUnits(shown);
      const canFold = !userFiltering && units.length > DEFAULT_UNITS;
      const vis = (canFold && !st.showAll) ? units.slice(0, DEFAULT_UNITS) : units;
      moreBtn.hidden = !canFold;
      if (canFold) {
        moreBtn.textContent = st.showAll
          ? `收起其余条目 ↑`
          : `展开其余 ${countEvents(units) - countEvents(vis)} 条行程 ↓`;
      }
      html += renderUnits(vis);
    } else {
      const canFold = !userFiltering && shown.length > DEFAULT_UNITS;
      const displayRows = (canFold && !st.showAll) ? shown.slice(0, DEFAULT_UNITS) : shown;
      moreBtn.hidden = !canFold;
      if (canFold) {
        moreBtn.textContent = st.showAll
          ? `收起其余条目 ↑`
          : `展开其余 ${shown.length - displayRows.length} 条行程 ↓`;
      }
      let cur = '', i = 0;
      for (const e of displayRows) {
        const ym = e.date.slice(0, 7);
        if (ym !== cur) {
          cur = ym; i = 0; const [y, m] = ym.split('-'); const n = displayRows.filter(x => x.date.startsWith(ym)).length;
          html += `<div class="month rv"><h3>${MONTH_EN[+m - 1]}<small>${y} 年 ${+m} 月</small></h3><span>${n} 条</span></div>`;
        }
        html += evHTML(e, i++);
      }
    }
    list.innerHTML = html; reveal(list);
    enhanceSegs(list.closest('#schedule') || document);
    animateDetails(list);
    if (hasRendered && !reduced) {
      $$('.ev', list).slice(0, 8).forEach((el, idx) => {
        el.classList.remove('rv');
        el.classList.add('is-in');
        el.animate?.(
          [{ opacity: 0, transform: 'translate3d(0, 10px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
          { duration: 300, delay: idx * 28, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' }
        );
      });
    }
    hasRendered = true;
  }
  const sync = () => {
    $$('#sched-when button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.when === st.when)));
    if (verifEl) $$('button', verifEl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.verif === st.verif)));
    $$('#sched-members .pill').forEach(b => b.setAttribute('aria-pressed', String(st.members.has(b.dataset.m))));
    $$('#sched-cats .pill').forEach(b => b.setAttribute('aria-pressed', String(st.cats.has(b.dataset.c))));
    $('#sched-ticket').checked = st.ticket;
    if (seriesEl) seriesEl.checked = st.series;
    $('#sched-star').checked = st.star;
    if (qEl.value !== st.q) qEl.value = st.q;
    render();
  };

  let qt; qEl.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { st.q = qEl.value.trim(); render(); }, 120); });
  $('#sched-when').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.when = b.dataset.when; sync(); } });
  if (verifEl) verifEl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { st.verif = b.dataset.verif; sync(); } });
  $('#sched-members').addEventListener('click', e => { const b = e.target.closest('.pill'); if (!b) return; st.members.has(b.dataset.m) ? st.members.delete(b.dataset.m) : st.members.add(b.dataset.m); sync(); });
  $('#sched-cats').addEventListener('click', e => { const b = e.target.closest('.pill'); if (!b) return; st.cats.has(b.dataset.c) ? st.cats.delete(b.dataset.c) : st.cats.add(b.dataset.c); sync(); });
  $('#sched-ticket').addEventListener('change', e => { st.ticket = e.target.checked; render(); });
  if (seriesEl) seriesEl.addEventListener('change', e => { st.series = e.target.checked; render(); });
  $('#sched-star').addEventListener('change', e => { st.star = e.target.checked; render(); });
  const reset = () => { st.q = ''; st.when = 'active'; st.verif = 'all'; st.year = ''; st.days30 = false; st.members.clear(); st.cats.clear(); st.ticket = st.star = false; st.series = true; st.showAll = false; sync(); };
  $('#sched-reset').addEventListener('click', reset);
  applied.addEventListener('click', e => {
    const b = e.target.closest('[data-clear]'); if (!b) return;
    if (b.dataset.clear === 'when') st.when = 'active';
    if (b.dataset.clear === 'verif') st.verif = 'all';
    if (b.dataset.clear === 'year') st.year = '';
    if (b.dataset.clear === 'days30') st.days30 = false;
    if (b.dataset.clear === 'q') st.q = '';
    if (b.dataset.clear === 'member') st.members.delete(b.dataset.value);
    if (b.dataset.clear === 'category') st.cats.delete(b.dataset.value);
    if (b.dataset.clear === 'ticket') st.ticket = false;
    if (b.dataset.clear === 'series') st.series = true;
    if (b.dataset.clear === 'star') st.star = false;
    sync();
    (qEl || $('#sched-reset')).focus({ preventScroll: true });
  });

  list.addEventListener('click', e => {
    const s = e.target.closest('[data-star]');
    if (s) {
      const id = s.dataset.star; const on = !stars.has(id); on ? stars.add(id) : stars.delete(id);
      s.setAttribute('aria-pressed', String(on));
      const lbl = s.querySelector('span');
      if (lbl) lbl.textContent = on ? '已存票夹' : '撕下存根';
      s.closest('.ev')?.classList.toggle('is-kept', on);
      store.set('exo-stars', [...stars]);
      toast(on ? '已撕下票根收入个人票夹（勾选「只看收藏」可集中查看）' : '已从个人票夹移出');
      if (st.star && !on) render();
      return;
    }
    const m = e.target.closest('button[data-member]');
    if (m) {
      if (m.dataset.member === 'group') { st.members.add('group'); sync(); toast('已加入团体筛选'); }
      else openMember(m.dataset.member, m);
    }
  });

  /* ---- calendar export ---- */
  const icsEsc = s => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const fold = l => l.replace(/(.{60})/g, '$1\r\n ').replace(/\r\n $/, '');
  const stamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const plus1 = s => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, ''); };
  $('#sched-ics').addEventListener('click', () => {
    if (!shown.length) return;
    const exportable = shown.filter(e => e.verification !== 'unverified');
    if (!exportable.length) { toast('暂无可导出的已确认行程'); return; }
    const now = stamp(new Date());
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EXO Planet fan site//ZH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:EXO 行程'];
    for (const e of exportable) {
      const tag = '';
      const desc = [e.summary, !e.timeKST ? '具体时间待确认，日历中按日期占位。' : '', e.timeLocal && !e.timeKST ? `当地时间：${e.timeLocal}` : '', e.missing ? `还缺什么：${e.missing}` : '', ...(e.sources || []).map(s => `来源：${s.name || ''} ${s.url || ''}`)].filter(Boolean).join('\n');
      lines.push('BEGIN:VEVENT', `UID:${e.id}@exo-planet`, `DTSTAMP:${now}`);
      if (e.endDate && e.endDate > e.date) {
        if (e.endTimeKST) {
          const s = instant(e.date, e.timeKST || '00:00');
          const en = instant(e.endDate, e.endTimeKST);
          lines.push(`DTSTART:${stamp(s)}`, `DTEND:${stamp(en)}`);
        } else {
          lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${plus1(e.endDate)}`);
        }
      } else if (e.timeKST) {
        const s = instant(e.date, e.timeKST);
        const en = new Date(s.getTime() + 2 * 3600e3);
        lines.push(`DTSTART:${stamp(s)}`, `DTEND:${stamp(en)}`);
      } else {
        lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${plus1(e.date)}`);
      }
      lines.push(fold(`SUMMARY:${icsEsc(tag + e.title)}`));
      if (e.city || e.venue) lines.push(fold(`LOCATION:${icsEsc([e.venue, e.city].filter(Boolean).join(', '))}`));
      lines.push(fold(`DESCRIPTION:${icsEsc(desc)}`), 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'exo-schedule.ics'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`已导出 ${exportable.length} 条行程`);
  });

  /* ---- external API ---- */
  function focusEvent(id) {
    const e = allRows.find(x => x.id === id); if (!e) return;
    st.showAll = true;
    if (st.series || !shown.some(x => x.id === id)) {
      st.q = ''; st.verif = 'all'; st.year = ''; st.days30 = false; st.members.clear(); st.cats.clear(); st.ticket = st.series = st.star = false;
      st.when = eventState(e).isActive ? 'active' : 'done';
      sync();
    } else {
      render();
    }
    const el = document.getElementById(`ev-${id}`); if (!el) return;
    el.classList.add('is-in');
    const det = el.querySelector('details.ev__more'); if (det) det.open = true;
    (ctx.lenis ? ctx.lenis.scrollTo(el, { offset: -Math.max(110, innerHeight * 0.28), duration: 1.3 }) : el.scrollIntoView({ block: 'center' }));
    el.animate([{ boxShadow: '0 0 0 2px var(--ac), 0 0 60px -6px var(--ac)' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 2200, delay: 500, easing: 'ease-out' });
  }
  function filterMember(id) {
    st.q = ''; st.verif = 'all'; st.year = ''; st.days30 = false; st.cats.clear(); st.ticket = st.star = false; st.series = true; st.when = 'active'; st.members.clear(); st.members.add(id); sync();
    const sec = $('#schedule'); ctx.lenis ? ctx.lenis.scrollTo(sec, { offset: -40, duration: 1.2 }) : sec.scrollIntoView();
  }
  function search(payload) {
    reset();
    if (typeof payload === 'string') {
      st.q = payload; st.when = 'all'; st.series = false;
    } else if (payload && typeof payload === 'object') {
      st.q = payload.q || '';
      if (payload.member && payload.member !== 'all') st.members.add(payload.member);
      const t = payload.time || 'all';
      if (t === 'ongoing') st.when = 'ongoing';
      else if (t === 'upcoming') st.when = 'upcoming';
      else if (t === 'done') st.when = 'done';
      else if (t === '30d') { st.when = 'active'; st.days30 = true; }
      else if (t === '2026' || t === '2027' || t === 'archive') { st.when = 'all'; st.year = t; }
      else st.when = 'all';
      st.series = false;
    }
    sync();
  }
  sync();
  return { focusEvent, filterMember, search };
}
