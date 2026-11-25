/* 来时路、时期画廊与综艺合集 */
import { $, $$, esc, glyph, todayStr, reduced, dragScroll, overlay, icon } from './util.js';

const VAR_CATS = {
  all: '全部综艺',
  group: '团体专属团综',
  guest: '精选嘉宾期',
  unit: '小分队 / 双人',
  solo: '成员个人常驻',
  appearances: '历年出演',
  extended: '访谈与音乐节目',
};

const ROAD_KINDS = { release: '作品发行', appearance: '出席活动', credit: '创作署名' };

export function initRoad(ctx) {
  const sec = $('#road'); if (!sec) return;
  const A = ctx.archive || {}, road = A.road || [], eraGallery = A.eraGallery || [];
  const supplementalRoad = A.supplement?.road || [];
  const variety = [...(A.variety || []), ...(A.supplement?.variety || [])];
  const list = $('#road-list', sec), vlist = $('#variety-list', sec), filters = $('.road__filters', sec);
  const who = w => w === 'exo'
    ? { label: 'EXO', color: 'var(--ac)' }
    : w === 'unit'
      ? { label: '小分队', color: 'var(--ac-2)' }
      : { label: ctx.byId[w]?.en || w, color: ctx.byId[w]?.color || 'var(--ac)', id: w };

  // Lightbox helper for era & milestone photos
  let lb = $('#era-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'era-lightbox';
    lb.className = 'credits era-lb';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '高清画报预览');
    lb.innerHTML = `
      <div class="credits__scrim" data-close></div>
      <figure class="era-lb__panel">
        <button class="iconbtn era-lb__x" type="button" data-close aria-label="关闭">${icon('close')}</button>
        <img id="era-lb-img" src="" alt="">
        <figcaption><b id="era-lb-title"></b><span id="era-lb-sub"></span></figcaption>
      </figure>`;
    document.body.appendChild(lb);
  }
  const openLightbox = (src, title, sub = 'Photo © SM Entertainment') => {
    if (!src) return;
    $('#era-lb-img', lb).src = src;
    $('#era-lb-img', lb).alt = title || '';
    $('#era-lb-title', lb).textContent = title || '';
    $('#era-lb-sub', lb).textContent = sub;
    overlay.open(lb, { focus: $('.era-lb__x', lb) });
  };

  // 0. Inject Editorial Era Filmstrip Gallery at the top of #road so fans have rich visual storytelling
  if (eraGallery.length && !$('.era-reel', sec)) {
    const reelWrap = document.createElement('div');
    reelWrap.className = 'era-reel-wrap';
    reelWrap.innerHTML = `
      <div class="era-reel__bar">
        <span class="kicker">ERA PHOTOBOOK · 2012–2026 历代团体概念画报长廊（可左右拖拽 · 点击放大）</span>
        <div class="era-reel__arrows">
          <button type="button" class="iconbtn iconbtn--sm" data-reel-dir="-1" aria-label="向左翻阅">‹</button>
          <button type="button" class="iconbtn iconbtn--sm" data-reel-dir="1" aria-label="向右翻阅">›</button>
        </div>
      </div>
      <div class="era-reel" id="era-reel" role="region" aria-label="历代团体概念照画廊">
        ${eraGallery.map(g => `
          <button type="button" class="era-shot jelly-press" data-lb-src="${esc(g.img)}" data-lb-title="${esc(g.era + ' — ' + g.title)}">
            <div class="era-shot__img">
              <img src="${esc(g.img)}" alt="${esc(g.era)}" loading="lazy" decoding="async">
              ${g.cover ? `<img class="era-shot__cov" src="${esc(g.cover)}" alt="" loading="lazy" decoding="async">` : ''}
            </div>
            <div class="era-shot__cap">
              <span>${esc(g.era)}</span>
              <b>${esc(g.title)}</b>
            </div>
          </button>
        `).join('')}
      </div>`;
    const tabsEl = $('.road__tabs', sec);
    tabsEl.before(reelWrap);
    const reel = $('#era-reel', reelWrap);
    dragScroll(reel);
    reelWrap.addEventListener('click', e => {
      const dirBtn = e.target.closest('[data-reel-dir]');
      if (dirBtn) {
        reel.scrollBy({ left: (+dirBtn.dataset.reelDir) * 380, behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      const shot = e.target.closest('[data-lb-src]');
      if (shot) openLightbox(shot.dataset.lbSrc, shot.dataset.lbTitle);
    });
  }

  // Update tab counts so users immediately see how rich both archives are
  const roadTabBtn = $('[data-tab="road"]', sec);
  const varTabBtn = $('[data-tab="variety"]', sec);
  if (roadTabBtn) roadTabBtn.innerHTML = `大事编年 <i>${road.length + supplementalRoad.length}</i>`;
  if (varTabBtn) varTabBtn.innerHTML = `综艺合集 <i>${variety.length}</i>`;

  // 1. Road Chronology Filters & List
  filters.innerHTML = [['all', '全部节点'], ['exo', '团体里程碑'], ['unit', '小分队']].map(([k, l]) =>
    `<button class="pill jelly-pill" type="button" data-f="${k}" aria-pressed="${k === 'all'}">${k === 'exo' ? glyph('galaxy') : ''}${l}</button>`
  ).join('') + ctx.members.map(m =>
    `<button class="pill pill--m jelly-pill" type="button" data-f="${m.id}" aria-pressed="false" style="--mc:${m.color}">${glyph(m.id)}${esc(m.en)}</button>`
  ).join('');

  let f = 'all', expandedRoad = false;
  const yearSelect = $('#road-year', sec), kindSelect = $('#road-kind', sec);
  const queryInput = $('#road-query', sec), roadCount = $('#road-count', sec);
  for (const [kind, label] of Object.entries(ROAD_KINDS)) {
    if (supplementalRoad.some(r => r.kind === kind)) kindSelect.add(new Option(label, kind));
  }
  const currentRoad = () => kindSelect.value === 'milestone' ? road : supplementalRoad.filter(r => r.kind === kindSelect.value);
  function syncRoadYears() {
    const previous = yearSelect.value;
    const years = [...new Set(currentRoad().map(r => r.d.slice(0, 4)))].sort();
    yearSelect.length = 1;
    for (const year of years) yearSelect.add(new Option(`${year} 年`, year));
    yearSelect.value = years.includes(previous) ? previous : '';
  }
  syncRoadYears();
  kindSelect.addEventListener('change', () => { syncRoadYears(); expandedRoad = false; renderRoad(); });
  yearSelect.addEventListener('change', () => { expandedRoad = false; renderRoad(); });
  queryInput.addEventListener('input', () => { expandedRoad = false; renderRoad(); });

  const roadToggle = document.createElement('button');
  roadToggle.type = 'button';
  roadToggle.className = 'fold-btn jelly-press';
  roadToggle.id = 'road-more';
  roadToggle.hidden = true;
  list.after(roadToggle);
  roadToggle.addEventListener('click', () => { expandedRoad = !expandedRoad; renderRoad(); });

  const MILESTONE_WHISPERS = [
    {
      match: r => r.d === '2012-04-08' || /MAMA.*出道|正式出道/.test(r.t),
      tag: '初遇之日 · 2012.04.08',
      note: '「We Are One! 大家好，我们是 EXO！」—— 从未知行星降落的少年们，在这一天推开了十四年银河的大门。',
    },
    {
      match: r => /咆哮|Growl|XOXO.*百万/.test(r.t + ' ' + r.s),
      tag: '咆哮奇迹 · 2013',
      note: '街头巷尾都在循环的《Growl》，时隔 12 年重新为歌坛推开百万销量时代的大门，也成了无数爱丽青春的 BGM。',
    },
    {
      match: r => r.d === '2014-08-05' || /EXO-L/.test(r.t),
      tag: '银海有了名字 · 2014.08.05',
      note: 'L 是介于 K 与 M 之间的字母，也是 LOVE —— 从这一天起，台下那片银海拥有了专属的名字「EXO-L」。',
    },
    {
      match: r => /EXODUS/.test(r.t) && !/约定|LOVE ME RIGHT/i.test(r.t + ' ' + r.s),
      tag: '黄金时代 · 2015《EXODUS》',
      note: '十人十色金砖封面与《CALL ME BABY》横扫 18 座打歌一位，开启正规一辑与二辑连续突破百万销量的黄金时代。',
    },
    {
      match: r => /约定|Promise/i.test(r.t + ' ' + r.s),
      tag: '银海暗号 · 《约定 (EXO 2014)》',
      note: '张艺兴作曲、金钟大填词、朴灿烈写下 Rap。「谢谢你，对不起，我爱你」—— 每次安可灯光暗下全场清唱，总有人在银海里红了眼眶。',
    },
    {
      match: r => /TEMPO|千万销量/i.test(r.t + ' ' + r.s),
      tag: '千万殿堂 · 2018',
      note: '那段无伴奏阿卡贝拉一出来，全场屏住呼吸。2000 年后出道艺人中首个突破累计千万张销量的传奇。',
    },
    {
      match: r => /EXIST|Cream Soda/i.test(r.t + ' ' + r.s),
      tag: '盛夏重逢 · 2023',
      note: '经历漫长等待后的夏日回归，《Cream Soda》里游刃有余的高音与笑眼，证明无论过多久他们依然最耀眼。',
    },
    {
      match: r => /REVERXE|EXhOrizon|I'm Home/i.test(r.t + ' ' + r.s),
      tag: '十四年新章 · 2026',
      note: '全员军毕合流后的正规八辑《REVERXE》与第六次巡演《EXhOrizon》—— 只要九颗行星还在转，我们的故事就永远在写下一页。',
    },
  ];

  // Quick Milestone Bookmark Bar above road-list so fans can jump straight to MAMA / Growl / Promise / REVERXE
  if (!$('.road-bookmarks', sec)) {
    const bmBar = document.createElement('div');
    bmBar.className = 'road-bookmarks';
    bmBar.setAttribute('aria-label', '十四年高光纪念书签');
    const BOOKMARKS = [
      { year: '2012', label: '2012 ·《MAMA》初遇' },
      { year: '2013', label: '2013 ·《咆哮》百万奇迹' },
      { year: '2014', label: '2014 · EXO-L 命名日' },
      { year: '2015', label: '2015 ·《约定》银海合唱' },
      { year: '2018', label: '2018 ·《Tempo》千万殿堂' },
      { year: '2023', label: '2023 ·《EXIST》盛夏重逢' },
      { year: '2026', label: '2026 ·《REVERXE》重披王冠' },
    ];
    bmBar.innerHTML = `<span class="road-bookmarks__k">关键年份直达</span>` +
      BOOKMARKS.map(b => `<button type="button" class="road-bm jelly-press" data-bm-year="${b.year}">${b.label}</button>`).join('');
    list.before(bmBar);
    bmBar.addEventListener('click', e => {
      const btn = e.target.closest('[data-bm-year]');
      if (!btn) return;
      const y = btn.dataset.bmYear;
      if (kindSelect.value !== 'milestone') {
        kindSelect.value = 'milestone';
        syncRoadYears();
      }
      expandedRoad = true;
      renderRoad();
      const targetYearEl = [...$$('.ry', list)].find(el => $('.ry__y', el)?.textContent.trim() === y);
      if (targetYearEl) {
        targetYearEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        targetYearEl.classList.add('is-bm-flash');
        setTimeout(() => targetYearEl.classList.remove('is-bm-flash'), 1600);
      }
    });
  }

  function renderRoad() {
    const t = todayStr();
    const year = yearSelect.value;
    const query = queryInput.value.trim().toLowerCase();
    const rows = currentRoad().filter(r => {
      if (year && !r.d.startsWith(year)) return false;
      if (query && !`${r.t} ${r.s} ${r.subject || ''} ${ctx.byId[r.who]?.zh || ''}`.toLowerCase().includes(query)) return false;
      return f === 'all' || r.who === f || r.members?.includes(f) || (r.who === 'unit' && ctx.byId[f] && (r.s + r.t).includes(ctx.byId[f].zh));
    }).sort((a, b) => a.d.localeCompare(b.d));

    const allYears = [...new Set(rows.map(r => r.d.slice(0, 4)))];
    const KEY_YEARS = new Set(['2012', '2013', '2014', '2015']);
    const recentYears = kindSelect.value === 'milestone'
      ? allYears.filter((y, idx) => KEY_YEARS.has(y) || idx >= allYears.length - 3)
      : allYears.slice(-4);
    const canFold = !year && !query && allYears.length > recentYears.length;
    const visibleYears = canFold && !expandedRoad ? recentYears : allYears;
    const hiddenCount = rows.filter(r => !recentYears.includes(r.d.slice(0, 4))).length;
    const shownCount = canFold && !expandedRoad ? rows.length - hiddenCount : rows.length;
    roadCount.textContent = shownCount === rows.length
      ? `${rows.length} 条记录 · ${allYears.length} 个年份`
      : `精选核心里程碑与近年动态 ${shownCount} / ${rows.length} 条 · ${allYears[0]}–${allYears.at(-1)}`;
    roadToggle.hidden = !canFold;
    roadToggle.textContent = expandedRoad ? '收起其余年份（保留核心里程碑与近年） ↑' : `展开其余年份完整记录（+${hiddenCount} 条） ↓`;

    list.innerHTML = visibleYears.map(y => {
      const yRows = rows.filter(r => r.d.startsWith(y));
      return `<li class="ry rv is-in">
        <div class="ry__head">
          <p class="ry__y">${y}</p>
          <span class="ry__cnt">${yRows.length} 项记录</span>
        </div>
        <ol class="ry__items">${yRows.map(r => {
          const w = r.who === 'collab' ? { color: 'var(--ac-2)' } : who(r.who);
          const fut = r.d.length === 10 && r.d > t;
          const date = r.approx || r.d.slice(5).replace('-', '.');
          const source = r.src
            ? `<a href="${esc(r.src)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(r.t)} · ${esc(r.srcLabel || '来源')}">${esc(r.srcLabel || '查看来源')}</a>`
            : r.basis ? `资料依据 · ${esc(r.basis)} · 待复核` : '待补来源';
          const label = esc(r.subject || w.label);
          const tag = w.id ? `<a class="rd__who" href="member.html?id=${w.id}"><i></i>${label}</a>` : `<span class="rd__who"><i></i>${label}</span>`;
          const thumb = r.img ? `<button type="button" class="rd__thumb jelly-press" data-lb-src="${esc(r.img)}" data-lb-title="${esc(y + '.' + date + ' · ' + r.t)}" aria-label="查看 ${esc(r.t)} 时期配图"><img src="${esc(r.img)}" alt="" loading="lazy" decoding="async"></button>` : '';
          const mw = kindSelect.value === 'milestone' ? MILESTONE_WHISPERS.find(m => m.match(r)) : null;
          return `<li class="rd rd--${r.kind}${fut ? ' rd--future' : ''}${r.img ? ' rd--has-img' : ''}${mw ? ' rd--heart' : ''}" style="--pc:${w.color}">
            <time datetime="${r.d}">${date}</time>
            ${tag}
            <span class="rd__t">
              <b>${esc(r.t)}</b>
              <small>${esc(r.s)}</small>
              ${mw ? `<span class="rd__whisper"><em>✦ ${esc(mw.tag)}</em>${esc(mw.note)}</span>` : ''}
              <small class="rd__source">${source}${r.status ? ` · ${esc(r.status)}` : ''}</small>
            </span>
            ${thumb}
          </li>`;
        }).join('')}</ol>
      </li>`;
    }).join('') || '<li class="road__note">这一筛选下暂无编年记录。</li>';
  }

  list.addEventListener('click', e => {
    const th = e.target.closest('[data-lb-src]');
    if (th) openLightbox(th.dataset.lbSrc, th.dataset.lbTitle);
  });
  filters.addEventListener('click', e => {
    const b = e.target.closest('[data-f]');
    if (!b || b.dataset.f === f) return;
    f = b.dataset.f;
    expandedRoad = false;
    $$('[data-f]', filters).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (document.startViewTransition && !reduced) document.startViewTransition(renderRoad); else renderRoad();
  });
  renderRoad();

  // 2. Variety Archive Filter Bar + Rich Cards
  const varPane = $('[data-pane="variety"]', sec);
  const VAR_PAGE_SIZE = 14;
  let vfCat = 'all', vfMem = 'all', vfQuery = '', vfYear = '', varLimit = VAR_PAGE_SIZE;

  const varTools = document.createElement('div');
  varTools.className = 'var-tools';
  varTools.innerHTML = `
    <div class="var-tools__top">
      <div class="seg var-cats" role="group" aria-label="按综艺类型筛选">
        ${Object.entries(VAR_CATS).map(([k, label]) => `<button type="button" data-vcat="${k}" aria-pressed="${k === 'all'}">${label}</button>`).join('')}
      </div>
      <label class="field field--search var-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-search"/></svg>
        <input type="search" id="var-q" placeholder="搜节目、集数或成员" autocomplete="off" aria-label="搜索综艺">
      </label>
      <label class="road__year">播出年份
        <select id="var-year"><option value="">全部年份</option></select>
      </label>
    </div>
    <div class="chips var-mems" role="group" aria-label="按参与成员筛选综艺">
      <button class="pill jelly-pill" type="button" data-vmem="all" aria-pressed="true">全部成员</button>
      ${ctx.members.map(m => `<button class="pill pill--m jelly-pill" type="button" data-vmem="${m.id}" aria-pressed="false" style="--mc:${m.color}">${glyph(m.id)}${esc(m.en)}</button>`).join('')}
    </div>
    <p class="var-meta"><span id="var-count"></span><button type="button" class="link" id="var-reset" hidden>重置综艺筛选</button></p>
  `;
  vlist.before(varTools);
  const varYear = $('#var-year', varTools);
  const varYearStr = v => String(v.y ?? v.year ?? '');
  const varTitle = v => String(v.zh ?? v.title ?? '');
  const varWho = v => String(v.who ?? ((v.members || []).map(id => ctx.byId[id]?.zh || id).join(' · ')));
  const varCat = v => v.cat || (v.members?.length === 1 && v.members[0] !== 'group' ? 'solo' : 'group');
  const programYears = v => varYearStr(v).match(/\d{4}/g) || [];
  for (const year of [...new Set(variety.flatMap(programYears))].sort()) varYear.add(new Option(year + ' 年', year));
  function resetVarPage() { varLimit = VAR_PAGE_SIZE; renderVariety(); }
  varYear.addEventListener('change', () => { vfYear = varYear.value; resetVarPage(); });

  const varToggle = document.createElement('button');
  varToggle.type = 'button';
  varToggle.className = 'fold-btn jelly-press';
  vlist.after(varToggle);

  function matchVariety(v) {
    const cat = varCat(v), who = varWho(v), zh = varTitle(v), y = varYearStr(v);
    if (vfCat !== 'all' && cat !== vfCat) return false;
    if (vfYear && !programYears(v).includes(vfYear)) return false;
    if (vfMem !== 'all') {
      const mems = v.members || [];
      if (v.programType && !mems.includes(vfMem)) return false;
      const mObj = ctx.byId[vfMem];
      const textHit = mObj && (who.includes(mObj.en) || who.includes(mObj.zh));
      if (!mems.includes(vfMem) && !mems.includes('exo') && !textHit) return false;
      // When filtering a specific member + solo/unit, prefer exact participation; in 'all' include full-group shows too, or mark clearly
      if (vfCat === 'solo' && !mems.includes(vfMem)) return false;
    }
    if (vfQuery) {
      const hay = `${zh} ${v.t || ''} ${who} ${v.p || ''} ${v.note || ''} ${y} ${v.d || ''}`.toLowerCase();
      if (!hay.includes(vfQuery)) return false;
    }
    return true;
  }

  function renderVariety() {
    const filtered = variety.filter(matchVariety);
    const shownV = filtered.slice(0, varLimit);
    $('#var-count', varTools).textContent = `显示 ${shownV.length} / ${filtered.length} 条记录`;
    $('#var-reset', varTools).hidden = vfCat === 'all' && vfMem === 'all' && !vfQuery && !vfYear;

    vlist.innerHTML = shownV.map((v, i) => {
      const cat = varCat(v), zh = varTitle(v), y = varYearStr(v), who = varWho(v);
      const q = `https://search.bilibili.com/all?keyword=${encodeURIComponent((cat === 'solo' ? '' : 'EXO ') + zh.split('（')[0])}`;
      const sameYear = i > 0 && varYearStr(shownV[i - 1]) === y;
      const sources = v.sources?.map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">资料链接${v.sources.length > 1 ? ` ${index + 1}` : ''}</a>`).join(' · ');
      const provenance = [sources, v.status ? esc(v.status) : ''].filter(Boolean).join(' · ');
      return `<li class="vr${sameYear ? ' is-same' : ''}${v.img ? ' vr--illustrated' : ''}" data-vcat-item="${esc(cat)}">
        <span class="vr__y">${esc(y)}</span>
        <div class="vr__main">
          ${v.img ? `<button type="button" class="vr__pic jelly-press" data-lb-src="${esc(v.img)}" data-lb-title="${esc(zh + (v.t ? ' · ' + v.t : ''))}" aria-label="预览图片"><img src="${esc(v.img)}" alt="" loading="lazy" decoding="async"></button>` : ''}
          <div class="vr__t">
            <div class="vr__badges">
              <span class="vtag vtag--${esc(cat)}">${esc(v.programType || v.kind || VAR_CATS[cat] || '综艺')}</span>
              <span class="vr__plat">${esc([v.p, v.d].filter(Boolean).join(' · '))}</span>
            </div>
            <b>${esc(zh)}</b>
            ${v.t ? `<span class="vr__en">${esc(v.t)}</span>` : ''}
            ${v.note ? `<p class="vr__note">${esc(v.note)}</p>` : ''}
            ${provenance ? `<small class="rd__source">${provenance}</small>` : ''}
          </div>
        </div>
        <span class="vr__m"><b>${esc(who)}</b></span>
        <a class="vr__go jelly-press" href="${q}" target="_blank" rel="noopener noreferrer">去 B 站补档 ↗</a>
      </li>`;
    }).join('') || `<li class="vr vr--empty"><p class="road__note">没有找到匹配的综艺，试试切换上方分类或清空关键词。</p></li>`;

    const remaining = filtered.length - shownV.length;
    varToggle.hidden = shownV.length <= VAR_PAGE_SIZE && !remaining;
    varToggle.textContent = remaining ? `再看 ${Math.min(VAR_PAGE_SIZE, remaining)} 条 ↓` : '收起其余记录 ↑';
  }

  vlist.addEventListener('click', e => {
    const pic = e.target.closest('[data-lb-src]');
    if (pic) openLightbox(pic.dataset.lbSrc, pic.dataset.lbTitle);
  });

  varTools.addEventListener('click', e => {
    const cBtn = e.target.closest('[data-vcat]');
    if (cBtn) {
      vfCat = cBtn.dataset.vcat;
      $$('[data-vcat]', varTools).forEach(b => b.setAttribute('aria-pressed', String(b === cBtn)));
      resetVarPage();
      return;
    }
    const mBtn = e.target.closest('[data-vmem]');
    if (mBtn) {
      vfMem = mBtn.dataset.vmem;
      $$('[data-vmem]', varTools).forEach(b => b.setAttribute('aria-pressed', String(b === mBtn)));
      resetVarPage();
      return;
    }
    if (e.target.closest('#var-reset')) {
      vfCat = 'all'; vfMem = 'all'; vfQuery = ''; vfYear = '';
      varYear.value = '';
      const qIn = $('#var-q', varTools); if (qIn) qIn.value = '';
      $$('[data-vcat]', varTools).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vcat === 'all')));
      $$('[data-vmem]', varTools).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vmem === 'all')));
      resetVarPage();
    }
  });
  $('#var-q', varTools)?.addEventListener('input', e => {
    vfQuery = e.target.value.trim().toLowerCase();
    resetVarPage();
  });
  varToggle.addEventListener('click', () => {
    varLimit = varLimit < variety.filter(matchVariety).length ? varLimit + VAR_PAGE_SIZE : VAR_PAGE_SIZE;
    renderVariety();
  });
  renderVariety();

  const tabs = $$('[data-tab]', sec), panes = $$('[data-pane]', sec);
  tabs.forEach(b => b.addEventListener('click', () => {
    tabs.forEach(x => { x.setAttribute('aria-selected', String(x === b)); x.setAttribute('aria-pressed', String(x === b)); });
    panes.forEach(p => (p.hidden = p.dataset.pane !== b.dataset.tab));
    window.ScrollTrigger?.refresh();
  }));
}
