// Top-right structured search box & anchored popover: filter by Member + Time Window + Keyword.
import { $, $$, esc, glyph, icon, badge, phaseBadge, md, dayDiff, eventState } from './util.js';

const TIME_OPTS = [
  ['all', '全部时间'],
  ['ongoing', '进行中'],
  ['30d', '近 30 天'],
  ['upcoming', '即将开始'],
  ['done', '已结束'],
  ['2026', '2026 年'],
  ['2027', '2027 年'],
  ['archive', '2012–2025'],
];

const SECTION_PAGE = {
  now: 'index.html',
  members: 'index.html',
  schedule: 'index.html',
  albums: 'index.html',
  road: 'archive.html',
  channels: 'archive.html',
  maker: 'studio.html',
};

export function initSearch(ctx, api = {}) {
  const pal = $('#palette'), input = $('#palette-q'), out = $('#palette-results');
  const memWrap = $('#ts-members'), timeWrap = $('#ts-times'), clearBtn = $('#ts-clear'), statusBadge = $('[data-ts-badge]');
  if (!pal || !input || !out) return { open: () => {} };

  const navSection = id => (api.goSection ? api.goSection(id) : (location.href = `${SECTION_PAGE[id] || 'index.html'}#${encodeURIComponent(id)}`));
  const navMember = id => (api.openMember ? api.openMember(id) : (location.href = `member.html?id=${encodeURIComponent(id)}`));
  const navEvent = id => (api.focusEvent ? api.focusEvent(id) : (location.href = `index.html?event=${encodeURIComponent(id)}#schedule`));
  const navAlbum = slug => (api.goAlbum ? api.goAlbum(slug) : (location.href = `index.html?album=${encodeURIComponent(slug)}#albums`));
  const navSchedule = payload => {
    if (api.searchSchedule) { api.searchSchedule(payload); return; }
    const p = new URLSearchParams({ sched: '1' });
    if (payload?.q) p.set('q', payload.q);
    if (payload?.member && payload.member !== 'all') p.set('member', payload.member);
    if (payload?.time && payload.time !== 'all') p.set('time', payload.time);
    location.href = `index.html?${p.toString()}#schedule`;
  };

  const st = { q: '', member: 'all', time: 'all' };
  const idx = [];
  const CBX = ['xiumin', 'baekhyun', 'chen'], SC = ['chanyeol', 'sehun'], KASE = ['kai', 'sehun'];

  for (const m of ctx.members) {
    idx.push({
      group: '成员专栏',
      title: `${m.en} · ${m.zh}`,
      sub: `${m.power.zh} ${m.power.en} · ${m.role}`,
      hay: `${m.en} ${m.zh} ${m.ko} ${m.koReal} ${m.power.zh} ${m.power.en} ${(m.units || []).join(' ')}`.toLowerCase(),
      members: [m.id],
      date: null,
      phase: 'always',
      img: m.thumb,
      badgeHTML: `<span class="tag">NO. ${m.no}</span>`,
      run: () => navMember(m.id),
    });
  }

  for (const e of (ctx.calendar || ctx.events)) {
    const es = eventState(e);
    idx.push({
      group: '行程与票务',
      title: e.title,
      sub: `${e.date.slice(0, 4)}.${md(e.date)}${e.endDate && e.endDate !== e.date ? '–' + md(e.endDate) : ''} · ${e.category}${e.city ? ' · ' + e.city : ''}`,
      hay: `${e.title} ${e.summary || ''} ${e.city || ''} ${e.venue || ''} ${e.category || ''} ${e.ticket?.platform || ''} ${(e.members || []).map(i => i === 'group' ? 'exo 团体 全员' : `${ctx.byId[i]?.en} ${ctx.byId[i]?.zh}`).join(' ')}`.toLowerCase(),
      members: e.members || [],
      date: e.date,
      endDate: e.endDate || e.date,
      phase: es.phase,
      diff: dayDiff(e.date),
      fig: `<b>${md(e.date)}</b>`,
      badgeHTML: `${badge(e.verification, { compact: true })}${phaseBadge(e)}`,
      run: () => navEvent(e.id),
    });
  }

  for (const n of ctx.news) {
    idx.push({
      group: '近期动态',
      title: n.title,
      sub: `${n.date.replace(/-/g, '.')} · ${n.channel}`,
      hay: `${n.title} ${n.summary || ''} ${n.channel || ''} ${(n.members || []).map(i => i === 'group' ? 'exo 团体' : `${ctx.byId[i]?.en} ${ctx.byId[i]?.zh}`).join(' ')}`.toLowerCase(),
      members: n.members || [],
      date: n.date,
      phase: 'done',
      diff: dayDiff(n.date),
      fig: `<b>${md(n.date)}</b>`,
      badgeHTML: badge(n.verification, { compact: true }),
      run: () => navSection('now'),
    });
  }

  for (const a of ctx.albums) {
    idx.push({
      group: '团体专辑',
      title: `${a.title}（${a.zh}）`,
      sub: `${a.date.replace(/-/g, '.')} · 主打《${a.lead}》`,
      hay: `${a.title} ${a.zh} ${a.lead} ${a.tagline} ${a.concept} ${(a.tracks || []).join(' ')}`.toLowerCase(),
      members: ['group'],
      date: a.date,
      phase: 'archive',
      img: a.thumb,
      badgeHTML: `<span class="tag">${a.date.slice(0, 4)}</span>`,
      run: () => navAlbum(a.slug),
    });
  }

  for (const r of (ctx.archive?.road || [])) {
    const mems = r.who === 'exo' ? ['group']
      : r.who === 'unit' ? (r.t.includes('CBX') ? CBX : r.t.includes('SC') ? SC : r.t.includes('KASE') ? KASE : ['group'])
      : [r.who];
    idx.push({
      group: '编年节点',
      title: r.t,
      sub: `${r.d.replace(/-/g, '.')} · ${r.s}`,
      hay: `${r.t} ${r.s} ${r.d}`.toLowerCase(),
      members: mems,
      date: r.d,
      phase: dayDiff(r.d) >= 0 ? 'upcoming' : 'archive',
      diff: dayDiff(r.d),
      fig: `<b>${r.d.slice(2, 7).replace('-', '.')}</b>`,
      badgeHTML: `<span class="tag">编年</span>`,
      run: () => navSection('road'),
    });
  }

  if (memWrap) {
    memWrap.innerHTML = [
      `<button class="ts-chip" type="button" data-ts-m="all" aria-pressed="true">全部成员</button>`,
      `<button class="ts-chip" type="button" data-ts-m="group" aria-pressed="false">${glyph('galaxy')}EXO 团体</button>`,
      ...ctx.members.map(m => `<button class="ts-chip" type="button" data-ts-m="${m.id}" aria-pressed="false" style="--mc:${m.color}"><img src="${esc(m.thumb)}" alt="" loading="lazy">${esc(m.en)}</button>`),
    ].join('');
  }
  if (timeWrap) {
    timeWrap.innerHTML = TIME_OPTS.map(([k, l], i) => `<button class="ts-chip" type="button" data-ts-t="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('');
  }

  function matchMember(it) {
    if (st.member === 'all') return true;
    if (st.member === 'group') return it.members.includes('group');
    return it.members.includes(st.member);
  }

  function matchTime(it) {
    if (st.time === 'all') return true;
    if (!it.date) return false;
    const yr = +it.date.slice(0, 4);
    if (st.time === 'ongoing') return it.phase === 'ongoing';
    if (st.time === '30d') return it.phase === 'ongoing' || (it.phase === 'upcoming' && it.diff >= 0 && it.diff <= 30);
    if (st.time === 'upcoming') return it.phase === 'ongoing' || it.phase === 'upcoming';
    if (st.time === 'done') return it.phase === 'done';
    if (st.time === '2026') return yr === 2026 || (it.endDate && +it.endDate.slice(0, 4) === 2026);
    if (st.time === '2027') return yr === 2027 || (it.endDate && +it.endDate.slice(0, 4) === 2027);
    if (st.time === 'archive') return yr >= 2012 && yr <= 2025;
    return true;
  }

  let items = [], sel = 0;
  const mark = (s, terms) => {
    let h = esc(s);
    for (const t of terms) {
      if (!t) continue;
      const re = new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      h = h.replace(re, m => `<mark>${m}</mark>`);
    }
    return h;
  };
  const row = (it, i, terms) => `<button class="palette__item${i === sel ? ' is-sel' : ''}" type="button" data-i="${i}" role="option" aria-selected="${i === sel}">
    <figure>${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy">` : (it.fig || '')}</figure>
    <div class="palette__item-main"><b>${mark(it.title, terms)}</b><small>${esc(it.sub || '')}</small></div>
    <span class="palette__item-badges">${it.badgeHTML || ''}</span>
  </button>`;

  function syncTriggerBadge() {
    const activeCount = (st.member !== 'all' ? 1 : 0) + (st.time !== 'all' ? 1 : 0) + (st.q ? 1 : 0);
    if (statusBadge) {
      statusBadge.hidden = !activeCount;
      const mLabel = st.member === 'all' ? '' : (st.member === 'group' ? 'EXO' : ctx.byId[st.member]?.en || '');
      const tLabel = st.time === 'all' ? '' : (TIME_OPTS.find(x => x[0] === st.time)?.[1] || '');
      statusBadge.textContent = [mLabel, tLabel].filter(Boolean).join(' · ') || `${activeCount}`;
    }
    if (clearBtn) clearBtn.hidden = !activeCount;
  }

  function render() {
    st.q = input.value.trim();
    const alias = { '咆哮': 'growl', '狼': 'wolf', '上瘾': 'overdose', '蝴蝶少女': "don't go" };
    const terms = st.q.toLowerCase().split(/\s+/).filter(Boolean).map(t => alias[t] || t);
    sel = 0; items = [];
    syncTriggerBadge();

    if (memWrap) $$('[data-ts-m]', memWrap).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tsM === st.member)));
    if (timeWrap) $$('[data-ts-t]', timeWrap).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tsT === st.time)));

    const filtered = idx.filter(it => {
      if (!matchMember(it) || !matchTime(it)) return false;
      return terms.every(t => it.hay.includes(t));
    });

    const GROUPS = ['行程与票务', '近期动态', '团体专辑', '编年节点', '成员专栏'];
    const hasFilter = st.member !== 'all' || st.time !== 'all' || terms.length > 0;
    let html = '';

    if (hasFilter) {
      const mName = st.member === 'all' ? '全部成员' : (st.member === 'group' ? 'EXO 团体' : ctx.byId[st.member]?.en || st.member);
      const tName = TIME_OPTS.find(x => x[0] === st.time)?.[1] || '全部时间';
      const hasSched = !!document.getElementById('sched-list');
      const syncAct = {
        title: `${hasSched ? '在下方行程表中筛选' : '前往首页行程表筛选'}「${mName} · ${tName}${st.q ? ' · ' + st.q : ''}」`,
        sub: '同步成员、时间段与关键词至行程坐标模块',
        fig: icon('cal'),
        badgeHTML: '<span class="pbadge pbadge--upcoming">联动行程 →</span>',
        run: () => navSchedule({ q: st.q, member: st.member, time: st.time }),
      };
      html += row(syncAct, items.length, []);
      items.push(syncAct);
    } else {
      html += `<div class="palette__quick-tip">直接点选上方<b>成员</b>与<b>时间范围</b>即可组合检索，也可输入关键词：</div>`;
    }

    for (const g of GROUPS) {
      const limit = hasFilter ? 8 : (g === '行程与票务' ? 4 : g === '成员专栏' ? 3 : 0);
      if (!limit) continue;
      const allGroup = filtered.filter(x => x.group === g);
      const list = allGroup
        .sort((a, b) => (a.phase === 'ongoing' ? -1 : 1) - (b.phase === 'ongoing' ? -1 : 1) || String(a.date || '').localeCompare(String(b.date || '')))
        .slice(0, limit);
      if (!list.length) continue;
      html += `<p class="palette__group">${g}<em>${allGroup.length}</em></p>`;
      for (const it of list) {
        html += row(it, items.length, terms);
        items.push(it);
      }
    }

    if (hasFilter && items.length <= 1) {
      html = `<p class="palette__empty">该「成员 + 时间 + 关键词」组合暂无匹配项，可切换时间范围或点右上角重置。</p>` + html;
    }
    out.innerHTML = html;
    out.scrollTop = 0;
  }

  function open(q) {
    if (typeof q === 'string') input.value = q;
    pal.hidden = false;
    pal.classList.remove('is-out');
    $$('[data-open-search]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    render();
    requestAnimationFrame(() => input.focus({ preventScroll: true }));
  }

  function close() {
    if (pal.hidden) return;
    pal.hidden = true;
    $$('[data-open-search]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  }

  const move = d => {
    if (!items.length) return;
    sel = (sel + d + items.length) % items.length;
    $$('.palette__item', out).forEach((b, i) => {
      const on = i === sel;
      b.classList.toggle('is-sel', on);
      b.setAttribute('aria-selected', String(on));
      if (on) b.scrollIntoView({ block: 'nearest' });
    });
  };
  const run = i => {
    const it = items[i]; if (!it) return;
    close();
    setTimeout(() => it.run(), 40);
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  memWrap?.addEventListener('click', e => {
    const b = e.target.closest('[data-ts-m]'); if (!b) return;
    st.member = st.member === b.dataset.tsM && b.dataset.tsM !== 'all' ? 'all' : b.dataset.tsM;
    render();
  });
  timeWrap?.addEventListener('click', e => {
    const b = e.target.closest('[data-ts-t]'); if (!b) return;
    st.time = st.time === b.dataset.tsT && b.dataset.tsT !== 'all' ? 'all' : b.dataset.tsT;
    render();
  });
  clearBtn?.addEventListener('click', () => {
    st.q = ''; st.member = 'all'; st.time = 'all'; input.value = '';
    render(); input.focus();
  });
  out.addEventListener('click', e => {
    const b = e.target.closest('.palette__item');
    if (b) run(+b.dataset.i);
  });
  out.addEventListener('pointermove', e => {
    const b = e.target.closest('.palette__item');
    if (b && +b.dataset.i !== sel) {
      sel = +b.dataset.i;
      $$('.palette__item', out).forEach((x, i) => x.classList.toggle('is-sel', i === sel));
    }
  });

  $$('[data-open-search]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    pal.hidden ? open() : close();
  }));
  document.addEventListener('pointerdown', e => {
    if (pal.hidden) return;
    if (e.target.closest('#palette .palette__panel') || e.target.closest('[data-open-search]')) return;
    close();
  });
  document.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); pal.hidden ? open() : close();
    } else if (e.key === '/' && !typing) {
      e.preventDefault(); open();
    } else if (e.key === 'Escape' && !pal.hidden) {
      e.preventDefault(); close();
    }
  });

  return { open, close };
}
