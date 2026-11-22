// 单人专栏 — member.html?id=kai. One page per member, in the same two editions as the home page.
// In 银河 the universe and particles switch to his power (without changing the visitor's saved theme),
// and the hero carries an aura drawn for that power.
import { $, $$, esc, glyph, icon, badge, phaseBadge, detailBadges, sources, safeUrl, reduced, todayStr, dayDiff, fullDate, md, eventTimeLabel, eventState, enhanceSegs, animateDetails } from './util.js';
import { lazyUniverse } from './lazyuni.js';
import { initThemes, setPower } from './themes.js';
import { initMode } from './mode.js';
import { shareMember, exportMemberPoster } from './share.js'; /* share */
import { initSubscribe } from './subscribe.js';

const load = name => fetch(`data/${name}.json?v=5`).then(r => { if (!r.ok) throw new Error(name); return r.json(); });

async function boot() {
  const [members, events, news, archive, meta] = await Promise.all(['members', 'events', 'news', 'archive', 'meta'].map(load));
  const byId = Object.fromEntries(members.map(m => [m.id, m]));
  const id = new URLSearchParams(location.search).get('id') || (location.pathname.match(/\/m\/([a-z0-9-]+)\/?(?:index\.html)?$/i) || [])[1]; /* ?id= or /m/<id>/ */
  const m = byId[id] || members[0], idx = members.indexOf(m);
  document.title = `${m.en} ${m.zh} · 单人专栏 · EXO 星球`;

  /* universe + power: show his power here, but keep the visitor's own saved theme */
  let uni = null; try { uni = lazyUniverse($('#universe'), { reduced }); } catch {}
  let saved = null; try { saved = localStorage.getItem('exo-power'); } catch {}
  initThemes(members, uni);
  setPower(m.id, { quiet: true });
  try { saved == null ? localStorage.removeItem('exo-power') : localStorage.setItem('exo-power', saved); } catch {}
  initMode({ uni });
  document.addEventListener('visibilitychange', () => { if (!uni) return; document.hidden || document.documentElement.dataset.mode !== 'galaxy' ? uni.stop() : uni.start(); });
  if (uni && !reduced) addEventListener('pointermove', e => { if (e.pointerType === 'mouse') uni.pointer((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2); }, { passive: true });

  /* numbers */
  const today = todayStr(), [by, bm, bd] = m.birth.split('-').map(Number), [ty] = today.split('-').map(Number);
  let nb = `${ty}-${m.birth.slice(5)}`; if (nb < today) nb = `${ty + 1}-${m.birth.slice(5)}`;
  const dd = dayDiff(nb), age = ty - by - (today.slice(5) < m.birth.slice(5) ? 1 : 0);

  /* what belongs to him — personal/unit + group context so every promised deliverable is complete */
  const isPersonal = x => (x.members || []).includes(m.id);
  const isGroup = x => (x.members || []).includes('group') && !isPersonal(x);
  const personalEvs = events.filter(isPersonal);
  const allEvs = events.filter(x => isPersonal(x) || isGroup(x));

  const pActive = personalEvs.filter(e => eventState(e).isActive).sort((a, b) => a.date.localeCompare(b.date));
  const allActive = allEvs.filter(e => eventState(e).isActive).sort((a, b) => a.date.localeCompare(b.date));
  const pPast = personalEvs.filter(e => eventState(e).isDone).sort((a, b) => b.date.localeCompare(a.date));
  const allPast = allEvs.filter(e => eventState(e).isDone).sort((a, b) => b.date.localeCompare(a.date));

  const myNews = news.filter(x => isPersonal(x) || isGroup(x)).sort((a, b) => b.date.localeCompare(a.date));
  const personalNewsCount = news.filter(isPersonal).length;

  const personalRoad = (archive.road || []).filter(r => r.who === m.id || (r.who === 'unit' && (r.s + r.t).includes(m.zh))).sort((a, b) => a.d.localeCompare(b.d));
  const fullRoad = (archive.road || []).filter(r => r.who === 'exo' || r.who === m.id || (r.who === 'unit' && (r.s + r.t).includes(m.zh))).sort((a, b) => a.d.localeCompare(b.d));

  const CBX = ['xiumin', 'baekhyun', 'chen'];
  const SC = ['chanyeol', 'sehun'];
  const variety = (archive.variety || []).filter(v => (v.members || []).includes(m.id) || (v.members || []).includes('exo') || v.who === '全员' || v.who.includes(m.en) || (v.who.includes('CBX') && CBX.includes(m.id)));
  const unitSongs = (archive.songs || []).filter(s => (s.u === 'CBX' && CBX.includes(m.id)) || (s.u === 'SC' && SC.includes(m.id)));
  const works = m.works?.length ? m.works : (m.solo || []).map(s => { const i = s.lastIndexOf(' · '); return { kind: '个人作品', title: i > 0 ? s.slice(0, i) : s, year: i > 0 ? s.slice(i + 3) : '', detail: '' }; });
  const looks = m.gallery?.length ? m.gallery.map(g => [g.src, g.era]) : [[m.photo2, m.photo2Era], [m.photo, m.photoEra]].filter(x => x[0]);
  const links = (m.channels || []).filter(c => safeUrl(c.url));
  const agency = String(m.agency || '').split(/[（(]/)[0].trim();

  const evCard = e => {
    const es = eventState(e);
    const grp = isGroup(e);
    const timeStr = eventTimeLabel(e);
    const tUrl = safeUrl(e.ticket?.url);
    return `<li class="mp-ev${es.isDone ? ' is-past' : ''}${es.isOngoing ? ' is-ongoing' : ''}" data-scope="${grp ? 'group' : 'personal'}">
      <time datetime="${e.date}"><b>${md(e.date)}</b><span>${e.date.slice(0, 4)}${e.endDate && e.endDate !== e.date ? ` – ${md(e.endDate)}` : ''}</span></time>
      <div>
        <p class="mp-ev__k">${badge(e.verification)}${phaseBadge(e)}${detailBadges(e)}<span class="tag">${grp ? '团体共同' : '个人/分队'} · ${esc(e.category)}</span></p>
        <h3>${esc(e.title)}</h3>
        ${timeStr || e.city || e.venue ? `<p class="mp-ev__w">${timeStr ? `<span>${icon('cal')}${esc(timeStr)}</span>` : ''}${e.city || e.venue ? `<span>${icon('pin')}${esc([e.city, e.venue].filter(Boolean).join(' · '))}</span>` : ''}</p>` : ''}
        ${e.summary ? `<p class="mp-ev__sum">${esc(e.summary)}</p>` : ''}
        ${e.missing ? `<p class="item__miss"><b>待补齐凭据</b>${esc(e.missing)}</p>` : ''}
        <div class="item__src"><span>信源</span>${sources(e.sources?.slice(0, 3))}${tUrl ? `<a class="src" href="${esc(tUrl)}" target="_blank" rel="noopener noreferrer">官方票务/预售页${icon('arrow')}</a>` : ''}</div>
      </div>
    </li>`;
  };
  const sec = (key, no, kicker, title, body, lead = '') => body ? `<section class="sec mp-sec mp-sec--${key}" aria-labelledby="mp-${key}">
    <header class="sec__head"><p class="sec__no">${no}</p><div><p class="kicker">${kicker}</p><h2 class="sec__h" id="mp-${key}">${title}</h2></div>${lead ? `<p class="sec__lead">${lead}</p>` : ''}</header>${body}</section>` : '';

  const roadScopeDefault = personalRoad.length >= 2 ? 'personal' : 'all';
  let roadScope = roadScopeDefault, roadExpanded = false, varietyExpanded = false;
  let currentLookIdx = 0;
  const renderRoadHTML = () => {
    const src = roadScope === 'personal' ? personalRoad : fullRoad;
    const LIMIT = 8;
    const vis = (!roadExpanded && src.length > LIMIT) ? src.slice(0, LIMIT) : src;
    const listHtml = vis.length
      ? `<ol class="mp-road">${vis.map(r => {
          const isGrpRoad = r.who === 'exo';
          return `<li style="--pc:${m.color}"><time datetime="${r.d}">${r.approx || r.d.replace(/-/g, '.')}</time><div><b>${isGrpRoad ? `<span class="tag" style="margin-right:8px">团体</span>` : ''}${esc(r.t)}</b><span>${esc(r.s)}</span></div></li>`;
        }).join('')}</ol>`
      : `<p class="mp-none">当前范围暂无记录。</p>`;
    const foldHtml = src.length > LIMIT
      ? `<button type="button" class="fold-btn" data-road-fold>${roadExpanded ? `收起至前 ${LIMIT} 项 ↑` : `展开全部 ${src.length} 项编年节点（余 ${src.length - LIMIT} 项） ↓`}</button>`
      : '';
    return listHtml + foldHtml;
  };
  const renderVarietyHTML = () => {
    const LIMIT = 8;
    const vis = (!varietyExpanded && variety.length > LIMIT) ? variety.slice(0, LIMIT) : variety;
    const listHtml = `<ol class="mp-variety">${vis.map(v => `<li><span>${esc(v.y)}</span><b>${esc(v.zh)}</b><small>${esc(v.p)}${v.note ? ` · ${esc(v.note)}` : ''}</small><a href="https://search.bilibili.com/all?keyword=${encodeURIComponent('EXO ' + v.t)}" target="_blank" rel="noopener noreferrer">B 站检索 ↗</a></li>`).join('')}</ol>`;
    const foldHtml = variety.length > LIMIT
      ? `<button type="button" class="fold-btn" data-variety-fold>${varietyExpanded ? `收起至前 ${LIMIT} 档 ↑` : `展开全部 ${variety.length} 档综艺记录（余 ${variety.length - LIMIT} 档） ↓`}</button>`
      : '';
    return listHtml + foldHtml;
  };

  $('#mp').innerHTML = `
  <section class="mp-hero" style="--mc:${m.color};--mc2:${m.color2 || m.color}">
    <div class="mp-hero__aura" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="mp-hero__text">
      <p class="eyebrow"><span>PLANET ${m.no} / ${String(members.length).padStart(2, '0')}</span><i></i><span>${esc(m.role)}</span>${m.units?.length ? `<i></i><span>${esc(m.units.join(' · '))}</span>` : ''}</p>
      <h1 class="mp-hero__name" style="--len:${m.en.length}">${esc(m.en)}</h1>
      <p class="mp-hero__real">${esc(m.zh)} · ${esc(m.ko)} · ${esc(m.koReal)}</p>
      <div class="mp-power">${glyph(m.id, 'glyph mp-power__glyph')}
        <div><p class="mp-power__t"><b>${esc(m.power.zh)}</b><span>${esc(m.power.en)}</span></p><p class="mp-power__line">${esc(m.power.line)}</p></div></div>
      <dl class="mp-stats">
        <div><dt>出生日期</dt><dd>${fullDate(m.birth)}<small>${age} 岁</small></dd></div>
        <div class="is-hot"><dt>距下次生日</dt><dd>${dd === 0 ? '今天' : 'D-' + dd}<small>${md(nb)} 生日</small></dd></div>
        <div><dt>代表作收录</dt><dd>${works.length} 项${unitSongs.length ? `<small>含分队曲 ${unitSongs.length} 首</small>` : '<small>个人及企划</small>'}</dd></div>
        <div><dt>所属经纪</dt><dd title="${esc(m.agency)}">${esc(agency)}</dd></div>
      </dl>
      <div class="mp-btns"><button class="cbtn" type="button" data-keep-power>将全站主题设为「${esc(m.power.zh)}」</button><a class="cbtn cbtn--ghost" href="studio.html?card=${m.id}#card">制作他的纪念卡 →</a><button class="cbtn cbtn--ghost" type="button" data-subscribe="member" data-member-id="${m.id}" data-title="${esc(m.zh)} · 单人日程">订阅他的日历</button><!-- share:begin --><button class="cbtn cbtn--ghost" type="button" data-export-poster>导出专栏海报 ↓</button><button class="cbtn cbtn--ghost" type="button" data-share-member>复制链接</button><!-- share:end --></div>
    </div>
    <figure class="mp-hero__ph">
      <img src="${esc(looks[0][0])}" alt="${esc(m.en)} 概念照" id="mp-img" style="view-transition-name:member-portrait">
      ${looks.length > 1 ? `<div class="mp-looks" role="group" aria-label="切换照片">${looks.map((l, i) => `<button type="button" data-look="${i}" aria-pressed="${i === 0}" aria-label="${esc(l[1])}"><img src="${esc(l[0])}" alt="" loading="lazy" decoding="async"></button>`).join('')}</div>` : ''}
      <figcaption id="mp-era">${esc(looks[0][1] || '')} · © SM Entertainment</figcaption>
    </figure>
  </section>

  ${sec('now', '01', 'SEC. 01 // CURRENT STATUS · 实时近况', `近期动向与<em>合约/作品状态</em>`, `<div class="mp-now">
    <div><p class="mp-now__s">${esc(m.status || '')}</p><p class="mp-now__agency"><b>经纪与合约说明：</b>${esc(m.agency || '—')}</p></div>
    ${m.latest ? `<p class="mp-now__l"><span>近期发行与企划</span>${esc(m.latest)}</p>` : ''}
    ${m.statusSources?.length ? `<div class="item__src"><span>核实信源</span>${sources(m.statusSources)}</div>` : ''}</div>`)}

  ${sec('sched', '02', 'SEC. 02 // SCHEDULE · 进行中与待办日程', `个人与团体<em>行程坐标</em>`, `
    <div class="mp-scope-bar">
      <div class="seg" role="group" aria-label="日程范围" id="mp-sched-scope">
        <button type="button" data-ev-scope="all" aria-pressed="true">含团体共同日程<em>${allActive.length}</em></button>
        <button type="button" data-ev-scope="personal" aria-pressed="false">仅个人与分队<em>${pActive.length}</em></button>
      </div>
      <span class="mp-scope-note">双轴状态独立标注：核实度（已确认 / 待核实）× 时间进度（进行中 / 即将开始 / 已结束）</span>
    </div>
    <div id="mp-sched-active">${allActive.length ? `<ol class="mp-evs">${allActive.map(evCard).join('')}</ol>` : `<p class="mp-none">当前暂无未结束的公开日程。</p>`}</div>
    ${allPast.length ? `<details class="mp-past"><summary>查看近期已结束或逾期日程（含团体共 ${allPast.length} 条，个人/分队 ${pPast.length} 条）</summary><ol class="mp-evs">${allPast.map(evCard).join('')}</ol></details>` : ''}`, '韩国时间（KST）自动并列北京时间（CST），海外场次保留当地时间。')}

  ${sec('news', '03', 'SEC. 03 // BULLETIN · 相关动态', `已确认公告与<em>待核实传闻</em>`, myNews.length ? `<ol class="mp-news">${myNews.map(n => {
    const grp = isGroup(n);
    return `<li class="${n.verification === 'unverified' ? 'is-rumor' : ''}">
      <p class="mp-ev__k">${badge(n.verification)}<span class="tag">${grp ? '团体公告' : '个人/分队'} · ${esc(n.channel)}</span><span>${fullDate(n.date)}</span></p>
      <h3>${esc(n.title)}</h3>
      <p>${esc(n.summary)}</p>
      ${n.missing ? `<p class="item__miss"><b>待补齐凭据</b>${esc(n.missing)}</p>` : ''}
      ${n.sources?.length ? `<div class="item__src"><span>信源</span>${sources(n.sources)}</div>` : ''}
    </li>`;
  }).join('')}</ol>` : '', `共收录个人及小分队直接相关动态 ${personalNewsCount} 条，并同步关联团体重要通告。`)}

  <div class="mp-cols">
  ${sec('works', '04', 'SEC. 04 // DISCOGRAPHY · 代表作', `个人与小分队<em>作品集</em>`, `<ol class="mp-works-cards">${works.map(w => `<li>
      <div class="mp-work__top"><span class="tag">${esc(w.kind)}</span>${w.year ? `<time>${esc(w.year)}</time>` : ''}</div>
      <b>${esc(w.title)}</b>
      ${w.detail ? `<p>${esc(w.detail)}</p>` : ''}
    </li>`).join('')}</ol>
    ${unitSongs.length ? `<p class="mp-unit-note">站内曲库另收录其所属小分队曲目 <b>${unitSongs.length}</b> 首（可在首页「入坑纪念卡」中检索选曲）。</p>` : ''}`)}
  ${sec('ch', '05', 'SEC. 05 // VERIFIED CHANNELS · 官方入口', `已核实第一方<em>渠道</em>`, `${links.length ? `<div class="mp-links">${links.map(c => `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.name)}${icon('arrow')}</a>`).join('')}</div>` : ''}${m.channelsNote ? `<p class="mp-none" style="margin-top:${links.length ? '14px' : '0'}">${esc(m.channelsNote)}</p>` : ''}`)}
  </div>

  ${sec('road', '06', 'SEC. 06 // MILESTONES · 编年节点', `个人与团体<em>关键节点</em>`, fullRoad.length ? `
    <div class="mp-scope-bar">
      <div class="seg" role="group" aria-label="里程碑范围" id="mp-road-scope">
        <button type="button" data-road-scope="personal" aria-pressed="${roadScope === 'personal'}">个人与分队专属<em>${personalRoad.length}</em></button>
        <button type="button" data-road-scope="all" aria-pressed="${roadScope === 'all'}">含团体完整编年<em>${fullRoad.length}</em></button>
      </div>
      <span class="mp-scope-note">默认聚焦个人与分队节点，可随时展开完整团体编年。</span>
    </div>
    <div id="mp-road-wrap">${renderRoadHTML()}</div>` : '', `含个人首秀、小分队及团体重大里程碑（其中个人/分队专属节点 ${personalRoad.length} 项）。`)}

  ${sec('variety', '07', 'SEC. 07 // VARIETY · 综艺记录', `常驻与团体<em>综艺</em>`, variety.length ? `<div id="mp-variety-wrap">${renderVarietyHTML()}</div>` : '')}`;

  /* other members: names and powers only, no second wall of photos */
  const prev = members[(idx + members.length - 1) % members.length], next = members[(idx + 1) % members.length];
  $('.mp__roster').innerHTML = `<p class="kicker">PLANETARY ROSTER · 切换其他成员专栏</p><div class="mp__grid">${members.map(x => `<a href="member.html?id=${x.id}"${x.id === m.id ? ' aria-current="page"' : ''} style="--mc:${x.color}">${glyph(x.id)}<b>${esc(x.en)}</b><span>${esc(x.zh)} · ${esc(x.power.zh)}</span></a>`).join('')}</div>
    <nav class="mp__pn"><a href="member.html?id=${prev.id}">← ${esc(prev.en)} ${esc(prev.zh)}</a><a href="index.html#members">返回全部成员</a><a href="member.html?id=${next.id}">${esc(next.en)} ${esc(next.zh)} →</a></nav>`;
  if (meta.checkedAt) $('[data-checked]').textContent = `人工核验基准日 ${fullDate(meta.checkedAt)}`;
  enhanceSegs();
  animateDetails();

  $('#mp').addEventListener('click', e => {
    const look = e.target.closest('[data-look]');
    if (look) { currentLookIdx = +look.dataset.look; $$('[data-look]').forEach((b, k) => b.setAttribute('aria-pressed', String(k === currentLookIdx))); $('#mp-img').src = looks[currentLookIdx][0]; $('#mp-era').textContent = `${looks[currentLookIdx][1] || ''} · © SM Entertainment`; return; }
    const sc = e.target.closest('[data-ev-scope]');
    if (sc) {
      const mode = sc.dataset.evScope;
      $$('[data-ev-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === sc)));
      const targetList = mode === 'personal' ? pActive : allActive;
      $('#mp-sched-active').innerHTML = targetList.length
        ? `<ol class="mp-evs">${targetList.map(evCard).join('')}</ol>`
        : `<p class="mp-none">当前暂无未结束的个人/分队专属日程；可切换至「含团体共同日程」查看团体节点。</p>`;
      enhanceSegs();
      animateDetails();
      return;
    }
    const rs = e.target.closest('[data-road-scope]');
    if (rs) {
      roadScope = rs.dataset.roadScope;
      roadExpanded = false;
      $$('[data-road-scope]').forEach(b => b.setAttribute('aria-pressed', String(b === rs)));
      $('#mp-road-wrap').innerHTML = renderRoadHTML();
      enhanceSegs();
      animateDetails();
      return;
    }
    if (e.target.closest('[data-road-fold]')) { roadExpanded = !roadExpanded; $('#mp-road-wrap').innerHTML = renderRoadHTML(); return; }
    if (e.target.closest('[data-variety-fold]')) { varietyExpanded = !varietyExpanded; $('#mp-variety-wrap').innerHTML = renderVarietyHTML(); return; }
    const expBtn = e.target.closest('[data-export-poster]');
    if (expBtn) {
      expBtn.disabled = true;
      exportMemberPoster(m, { age, dd, worksCount: works.length, photoSrc: looks[currentLookIdx]?.[0], photoEra: looks[currentLookIdx]?.[1] || '' })
        .finally(() => { expBtn.disabled = false; });
      return;
    }
    if (e.target.closest('[data-share-member]')) { shareMember(m); return; } /* share */
    const kp = e.target.closest('[data-keep-power]');
    if (kp) { try { localStorage.setItem('exo-power', m.id); } catch {} kp.textContent = `全站已保存为「${m.power.zh}」主题`; }
  });
  document.documentElement.classList.add('is-ready');
}

initSubscribe();
boot().catch(err => { console.error(err); const p = $('.mp__loading'); if (p) p.textContent = '专栏没有加载出来，请刷新再试。'; });
