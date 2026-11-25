// Discography: a draggable shelf of sleeves + one stage that re-skins itself for the selected album.
import { $, $$, esc, icon, reduced, overlay, dragScroll, fullDate, store, clamp, animateDetails, sources, safeUrl } from './util.js';
import { createAlbumFx } from './albumfx.js';

const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
const norm = s => s.toLowerCase().replace(/[’']/g, "'").replace(/\s*[\(（].*$/, '').trim();

const ERA_MEMORY_NOTES = {
  mama: {
    tag: '2012.04.08 · 起点手记',
    text: '「We Are One! 大家好，我们是 EXO！」—— 从百日预告到未知行星降临的那一天，十二道超能力光芒亮起，写下了十四年银海的第一页。',
  },
  xoxo: {
    tag: '2013 · 咆哮奇迹手记',
    text: '街头巷尾都在放的《Growl（咆哮）》与时隔十二年重开的韩国百万销量时代。穿着校服在仓库里一镜到底的少年们，把整个夏天变成了属于 EXO 的奇迹。',
  },
  'miracles-in-december': {
    tag: '2013.12 · 初雪冬专手记',
    text: '从此每一年下第一场雪的时候，爱丽的耳机里都会准时响起《初雪（The First Snow）》。十年后它依然在每个冬天逆袭回音源榜首。',
  },
  overdose: {
    tag: '2014 · 迷宫印记手记',
    text: 'Someone call the doctor —— 极具辨识度的开场人体生命之树与迷宫六边形，也是同年 8 月 5 日「EXO-L」正式拥有名字的那一年。',
  },
  exodus: {
    tag: '2015 · 《约定》共鸣手记',
    text: '收录由张艺兴作曲、金钟大填词、朴灿烈写下 Rap 的《约定（EXO 2014）》。「谢谢你，对不起，我爱你」—— 每次演唱会安可全场大合唱，银海里总有人红着眼眶。',
  },
  'love-me-right': {
    tag: '2015 · 漫游银河手记',
    text: '把整条银河装进复古放克鼓点里，《Love Me Right》与高尺巨蛋首唱一起，成了每次演唱会全场蹦得最高、最快乐的狂欢时刻。',
  },
  exact: {
    tag: '2016 · 双生封神手记',
    text: '《Monster》与《Lucky One》双主打齐发，拿下年度专辑大赏四连冠。舞台最后伯贤领衔的那段走位与眼神，至今仍是韩流舞台教科书。',
  },
  'the-war': {
    tag: '2017 · 盛夏雷鬼手记',
    text: '《Ko Ko Bop》的夏日南风与前奏响起就让人起鸡皮疙瘩的《前夜（The Eve）》，开启四张正规专辑连续突破百万张的黄金纪录。',
  },
  dmumt: {
    tag: '2018 · 千万销量手记',
    text: '《Tempo》后半段那段无伴奏阿卡贝拉一出来，全场瞬间屏住呼吸。出道第七年达成累计专辑销量突破一千万张，实力从不需要解释。',
  },
  'love-shot': {
    tag: '2018.12 · 经典红西装手记',
    text: '红色丝绒西装与《Love Shot》标志性的副歌律动，YouTube 突破数亿播放，成为无数后辈翻跳、路人一秒认出的传奇舞台。',
  },
  dftf: {
    tag: '2021 · 军白期特辑手记',
    text: '在成员接力服役的军白期里，像收到一封来自宇宙航母的家书。听见熟悉的声音合在一起，就知道他们一直把爱丽放在心上。',
  },
  exist: {
    tag: '2023 · 夏日重逢手记',
    text: '久违的完整体打歌舞台与《Cream Soda》里游刃有余的真假音转换。十年过去，少年成了气场全开的成熟歌者，看向台下的眼神却一点没变。',
  },
  reverxe: {
    tag: '2026 · 十四年归来手记',
    text: '全员军毕合流后的第八张正规专辑，张艺兴再度参与全专录音。从冬日先行曲《I\'m Home》的温柔归家到《Crown》重披王冠——只要九颗行星还在运转，银海就永远亮着。',
  },
};

/* 荣誉: year-end awards and music-show wins for this album (data/new/awards.json) */
const VER = { official: '官方', media: '媒体', wiki: '百科' };
function honorsHTML(a) {
  const aw = a.awards; if (!aw) return '';
  const ye = aw.yearEnd || [], sw = aw.showWins || {}, dae = ye.filter(x => x.daesang).length, total = sw.total || 0;
  if (!ye.length && !total) return `<div class="honors honors--none"><p class="honors__h">荣誉</p><p class="honors__none">暂未收录这张专辑的获奖记录。</p></div>`;
  const bySong = Object.entries(sw.bySong || {}).filter(([, n]) => n > 0);
  const src = u => u ? ` <a href="${esc(u)}" target="_blank" rel="noopener noreferrer" aria-label="来源">↗</a>` : '';
  return `<details class="honors">
    <summary><span class="honors__h">荣誉</span>
      ${dae ? `<span class="honors__n honors__n--dae"><b>${dae}</b>大赏</span>` : ''}
      ${ye.length ? `<span class="honors__n"><b>${ye.length}</b>年终奖项</span>` : ''}
      ${total ? `<span class="honors__n"><b>${total}</b>音乐节目一位</span>` : ''}
      <i class="honors__more">展开</i></summary>
    ${ye.length ? `<ul class="honors__list">${ye.slice().sort((x, y) => (y.daesang - x.daesang) || (x.year - y.year)).map(x => `<li${x.daesang ? ' class="is-dae"' : ''}><span class="honors__y">${x.year}</span><span><b>${esc(x.ceremony)}</b>${esc(x.category)}${x.song ? ` · ${esc(x.song)}` : ''}${x.daesang ? '<em>大赏</em>' : ''}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span><span class="honors__src">${VER[x.verification] || ''}${src(x.source)}</span></li>`).join('')}</ul>` : ''}
    ${total ? `<p class="honors__shows">音乐节目一位 <b>${total}</b> 次${bySong.length ? '：' + bySong.map(([t, n]) => `《${esc(t)}》${n} 次`).join('，') : ''}${sw.note ? `<small>${esc(sw.note)}</small>` : ''}${src(sw.source)}</p>` : ''}
  </details>`;
}

export function initAlbums(ctx, { initialAlbum } = {}) {
  const allAlbums = ctx.albums, shelf = $('#shelf'), track = $('#shelf-track'), stage = $('#stage');
  let albums = allAlbums;
  if (!shelf || !track || !stage) return { go() {}, openMV() {} };
  const filters = $('#album-filters'), memberFilter = $('#album-member'), resultCount = $('#album-count'), empty = $('#album-empty');
  let scope = store.get('exo-album-scope', 'all'), member = store.get('exo-album-member', 'all');
  if (!['all', 'group', 'solo', 'unit', 'project'].includes(scope)) scope = 'all';
  if (member !== 'all' && !ctx.byId[member]) member = 'all';
  if (initialAlbum && allAlbums.some(a => a.slug === initialAlbum)) {
    const match = a => (scope === 'all' || (a.scope || 'group') === scope) && (member === 'all' || (a.members || ['group']).includes(member));
    const target = allAlbums.find(a => a.slug === initialAlbum);
    if (!match(target)) { scope = 'all'; member = 'all'; }
  }
  if (memberFilter) memberFilter.innerHTML = '<option value="all">全部成员</option>' + ctx.members.map(m => `<option value="${m.id}">${esc(m.en)} · ${esc(m.zh)}</option>`).join('');
  const renderShelf = () => {
    track.innerHTML = albums.map((a, i) => `<button class="sleeve" type="button" role="tab" id="tab-${a.slug}" aria-label="${esc(a.artist || 'EXO')} · ${esc(a.title)}" aria-selected="false" aria-controls="stage" data-i="${i}" tabindex="-1">
      <img src="${esc(a.thumb || a.cover)}" alt="${esc(a.title)} 封面" loading="lazy" draggable="false"><span>${a.date.slice(0, 4)}</span><small>${esc(a.title)}</small><small class="sleeve__artist">${esc(a.artist || 'EXO')}</small></button>`).join('');
  };
  dragScroll(shelf);

  // Allow mouse wheel / trackpad vertical scroll to smoothly scroll the album shelf horizontally
  shelf.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && shelf.scrollWidth > shelf.clientWidth) {
      shelf.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  stage.innerHTML = `<canvas class="stage__fx" aria-hidden="true"></canvas><div class="stage__glow" aria-hidden="true"></div><span class="stage__no" aria-hidden="true"></span>
    <div class="stage__art"><div class="disc" aria-hidden="true"></div><div class="cover"><img alt="" decoding="async"></div></div>
    <div class="stage__info"></div>
    <div class="stage__nav"><button type="button" data-step="-1" aria-label="上一张">←</button><button type="button" data-step="1" aria-label="下一张">→</button></div>`;
  const fx = createAlbumFx($('.stage__fx', stage));
  const art = $('.stage__art', stage), cover = $('.cover', stage), img = $('img', cover), info = $('.stage__info', stage), glow = $('.stage__glow', stage), no = $('.stage__no', stage);
  let cur = -1, changeTween = null;
  const albumDate = a => a.datePrecision === 'year' || a.date.length === 4 ? a.date.slice(0, 4) : fullDate(a.date);

  const infoHTML = a => {
    const leads = (a.lead || '').split(' · ').filter(Boolean).map(norm);
    const isLead = t => leads.length > 0 && !/instrumental|\binst\.?\b|remix|orchestra/i.test(t) && leads.some(l => norm(t) === l || norm(t).startsWith(l + ' '));
    const q = encodeURIComponent(`${a.artist || 'EXO'} ${(a.lead || a.title).split(' · ')[0]} MV`);
    const showZh = Boolean(a.lead || (a.zh && a.zh !== (a.artist || 'EXO')));
    const showTag = Boolean(a.tagline && a.tagline !== `${a.artist || 'EXO'} · ${a.type}`);
    return `<p class="stage__k"><span>${albumDate(a)}</span><i></i><span>${esc(a.type)}</span>${a.tracks.length ? `<i></i><span>${a.tracks.length} 首</span>` : ''}</p>
      <p class="stage__artist">${esc(a.artist || 'EXO')}</p>
      <h3 class="stage__title">${esc(a.title)}</h3>
      ${showZh ? `<p class="stage__zh">${a.zh && a.zh !== (a.artist || 'EXO') ? esc(a.zh) : ''}${a.lead ? `<span>主打 · ${esc(a.lead)}</span>` : ''}</p>` : ''}
      ${showTag ? `<p class="stage__tag">${esc(a.tagline)}</p>` : ''}
      ${a.concept ? `<p class="stage__concept">${esc(a.concept)}</p>` : ''}
      ${a.motif || a.tags?.length ? `<p class="stage__era">${a.motif ? `<b>${esc(a.motif)}</b>` : ''}${(a.tags || []).map(t => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
      ${ERA_MEMORY_NOTES[a.slug] ? `<aside class="stage__memory" aria-label="礼盒夹页手记"><span class="stage__memory-k">BOX INSERT NOTE · ${esc(ERA_MEMORY_NOTES[a.slug].tag)}</span><p>${esc(ERA_MEMORY_NOTES[a.slug].text)}</p></aside>` : ''}
      ${a.lyric ? `<blockquote class="stage__lyric"><p lang="ko">${esc(a.lyric[0])}</p><p>${esc(a.lyric[1])}</p></blockquote>` : ''}
      <div class="stage__cta">
        ${a.bv ? `<button class="abtn abtn--main" type="button" data-mv>${icon('play')}看 MV<small>${a.bvKind === 'official' ? 'Bilibili · SMTOWN' : a.bvKind === 'fan' ? 'Bilibili · 粉丝上传' : 'Bilibili'}</small></button>` : a.lead ? `<a class="abtn" href="https://search.bilibili.com/all?keyword=${q}" target="_blank" rel="noopener noreferrer">${icon('play')}在 B 站找 MV</a>` : ''}
        ${safeUrl(a.listenUrl) ? `<a class="abtn${a.bv ? '' : ' abtn--main'}" href="${esc(a.listenUrl)}" target="_blank" rel="noopener noreferrer">${icon('play')}收听专辑<small>Apple Music</small></a>` : ''}
        ${a.yt ? `<a class="abtn" href="https://www.youtube.com/watch?v=${esc(a.yt)}" target="_blank" rel="noopener noreferrer">YouTube<small>外链</small></a>` : ''}
      </div>
      ${a.tracks.length ? `<details class="tracks-fold"><summary><span>${esc(a.tracklistLabel || '完整曲目单')} · ${a.tracks.length} 首${a.lead ? `（主打《${esc(a.lead)}》）` : ''}</span><i>展开 ↓</i></summary><ol class="tracks">${a.tracks.map(t => `<li${isLead(t) ? ' class="is-lead"' : ''}><span>${esc(t)}</span></li>`).join('')}</ol></details>` : ''}
      ${(a.editions || []).map(e => `<details class="tracks-fold"><summary><span>${esc(e.name)} · ${e.tracks.length} 首</span><i>展开 ↓</i></summary>${e.note ? `<p class="stage__edition-note">${esc(e.note)}</p>` : ''}<ol class="tracks">${e.tracks.map(t => `<li><span>${esc(t)}</span></li>`).join('')}</ol>${e.sources?.length ? `<div class="stage__sources">${sources(e.sources)}</div>` : ''}</details>`).join('')}
      ${a.tracklistNote ? `<p class="stage__edition-note">${esc(a.tracklistNote)}</p>` : ''}
      ${a.sources?.length ? `<div class="stage__sources"><span>发行资料</span>${sources(a.sources)}</div>` : ''}
      ${honorsHTML(a)}`;

  };

  function centerSleeve(i, smooth = true) {
    const b = track.children[i];
    if (!b) return;
    const left = Math.max(0, b.offsetLeft + b.offsetWidth / 2 - shelf.clientWidth / 2);
    shelf.scrollTo({ left, behavior: smooth && !reduced ? 'smooth' : 'instant' });
  }

  function sampleCoverAccent(imageEl, fallbackHex) {
    try {
      const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      const ctx2 = cv.getContext('2d', { willReadFrequently: true });
      ctx2.drawImage(imageEl, 0, 0, 16, 16);
      const d = ctx2.getImageData(0, 0, 16, 16).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        const sat = mx ? (mx - mn) / mx : 0;
        const wt = 0.25 + sat * 2.2;
        r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
      }
      if (!w) return fallbackHex;
      return `rgb(${Math.round(r / w)}, ${Math.round(g / w)}, ${Math.round(b / w)})`;
    } catch { return fallbackHex; }
  }

  function select(i, { scroll = true, quiet = false, smooth = true } = {}) {
    if (!albums.length) return;
    i = (i + albums.length) % albums.length; if (i === cur) { if (scroll) centerSleeve(i, smooth && !quiet); return; }
    changeTween?.kill();
    const prev = cur;
    const dir = cur < 0 ? 1 : (i > cur ? 1 : -1); cur = i; const a = albums[i], s = a.skin, light = lum(s.bg) > 0.55;
    $$('.sleeve', track).forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    if (scroll) centerSleeve(i, smooth && !quiet && prev >= 0 && Math.abs(i - prev) <= 8);
    stage.style.setProperty('--a-bg', s.bg); stage.style.setProperty('--a-bg2', s.bg2); stage.style.setProperty('--a-fg', s.fg); stage.style.setProperty('--a-ac', s.ac); stage.style.setProperty('--a-ac2', s.ac2 || s.ac);
    stage.dataset.face = a.face; stage.dataset.tone = light ? 'light' : 'dark'; stage.dataset.len = a.title.length > 12 ? 'long' : 'short';
    stage.setAttribute('aria-labelledby', `tab-${a.slug}`);
    const soloMember = a.members?.length === 1 && a.members[0] !== 'group' ? a.members[0] : '';
    const activeFx = soloMember ? `power_${soloMember}` : a.fx;
    fx.set(activeFx, s, light);
    glow.style.backgroundImage = `url("${a.thumb || a.cover}")`; no.textContent = a.no;
    const applyCoverTint = () => {
      const tint = sampleCoverAccent(img, s.ac);
      stage.style.setProperty('--a-bg2', `color-mix(in srgb, ${tint} 42%, ${s.bg2})`);
      fx.set(activeFx, { ...s, ac: tint }, light);
    };
    const g = window.gsap, swap = () => {
      img.onload = applyCoverTint;
      img.src = a.cover;
      img.alt = `${a.title} 专辑封面`;
      if (img.complete) applyCoverTint();
      info.innerHTML = infoHTML(a); animateDetails(info);
    };
    if (g && !reduced && !quiet) {
      g.killTweensOf([cover, info.children]);
      changeTween = g.timeline()
        .to(cover, { rotateY: 90 * dir, duration: 0.28, ease: 'power2.in' })
        .to(info, { opacity: 0, x: -14 * dir, duration: 0.22, ease: 'power2.in' }, 0)
        .add(swap)
        .set(info, { opacity: 1, x: 0 })
        .fromTo(cover, { rotateY: -90 * dir }, { rotateY: 0, duration: 0.7, ease: 'expo.out', clearProps: 'transform' })
        .add(() => g.from(info.children, { opacity: 0, y: 22, duration: 0.7, stagger: 0.055, ease: 'expo.out', clearProps: 'opacity,transform' }), '<');
    } else {
      if (g) { g.set(cover, { clearProps: 'transform' }); g.set(info, { opacity: 1, x: 0 }); }
      swap();
    }
    store.set('exo-album', a.slug);
  }

  track.addEventListener('click', e => { const b = e.target.closest('.sleeve'); if (b) select(+b.dataset.i); });
  track.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k && e.key !== 'Home' && e.key !== 'End') return; e.preventDefault();
    select(e.key === 'Home' ? 0 : e.key === 'End' ? albums.length - 1 : cur + k); track.children[cur].focus({ preventScroll: true });
  });
  stage.addEventListener('click', e => {
    const st = e.target.closest('[data-step]'); if (st) { select(cur + +st.dataset.step); return; }
    if (e.target.closest('[data-mv]')) openMV(albums[cur]);
  });
  // swipe on the stage (touch)
  let tx = 0, ty = 0; stage.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) select(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  // cover tilt with smooth Lerp rAF damping
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    const LERP = 0.14;
    const cur = { rx: 0, ry: 0 };
    const target = { rx: 0, ry: 0 };
    let tiltRaf = 0;

    const writeTilt = () => {
      cover.style.setProperty('--rx', `${cur.rx.toFixed(3)}deg`);
      cover.style.setProperty('--ry', `${cur.ry.toFixed(3)}deg`);
    };

    const tickTilt = () => {
      const dx = target.rx - cur.rx;
      const dy = target.ry - cur.ry;
      cur.rx += dx * LERP;
      cur.ry += dy * LERP;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        cur.rx = target.rx;
        cur.ry = target.ry;
        writeTilt();
        tiltRaf = 0;
        if (target.rx === 0 && target.ry === 0) cover.style.willChange = '';
        return;
      }
      writeTilt();
      tiltRaf = requestAnimationFrame(tickTilt);
    };

    const kickTilt = () => {
      if (!tiltRaf) {
        cover.style.transition = 'none';
        cover.style.willChange = 'transform';
        tiltRaf = requestAnimationFrame(tickTilt);
      }
    };

    art.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = art.getBoundingClientRect();
      const nx = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
      const ny = clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1);
      target.ry = (nx - 0.5) * 16;
      target.rx = (0.5 - ny) * 12;
      kickTilt();
    });
    art.addEventListener('pointerleave', () => {
      target.rx = 0;
      target.ry = 0;
      kickTilt();
    });
  }

  /* ---- MV lightbox ---- */
  const mv = $('#mv'), frame = $('#mv-frame'), cap = $('#mv-cap');
  function openMV(a) {
    if (!a.bv) return;
    frame.innerHTML = `<iframe src="https://player.bilibili.com/player.html?bvid=${encodeURIComponent(a.bv)}&autoplay=1&high_quality=1&danmaku=0" title="${esc(a.lead)} MV" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen referrerpolicy="no-referrer"></iframe>`;
    cap.innerHTML = `<b>${esc(a.lead)}</b><span>${esc(a.title)} · ${a.date.slice(0, 4)}${a.bvKind === 'fan' ? ' · 此视频为粉丝上传，非官方频道' : a.bvKind === 'official' ? ' · SMTOWN 上传' : ''}</span><a class="src" href="https://www.bilibili.com/video/${esc(a.bv)}" target="_blank" rel="noopener noreferrer">在 Bilibili 打开${icon('arrow')}</a>${a.yt ? `<a class="src" href="https://www.youtube.com/watch?v=${esc(a.yt)}" target="_blank" rel="noopener noreferrer">YouTube${icon('arrow')}</a>` : ''}`;
    overlay.open(mv, { focus: $('.mv__x', mv) });
  }
  mv.addEventListener('overlay:closed', () => { frame.innerHTML = ''; });

  function applyFilters(prefer = store.get('exo-album', null)) {
    changeTween?.kill();
    if (scope === 'group') member = 'all';
    albums = allAlbums.filter(a => (scope === 'all' || (a.scope || 'group') === scope) && (member === 'all' || (a.members || ['group']).includes(member)));
    cur = -1; renderShelf();
    if (filters) $$('[data-album-scope]', filters).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.albumScope === scope)));
    if (memberFilter) { memberFilter.value = member; memberFilter.disabled = scope === 'group'; }
    if (resultCount) resultCount.textContent = `${member !== 'all' ? ctx.byId[member].zh + ' · ' : ''}${albums.length} 张专辑${scope === 'all' && member === 'all' ? ' · 团体 / 个人 / 分队 / 企划' : ''}`;
    shelf.hidden = stage.hidden = !albums.length;
    if (empty) { empty.hidden = !!albums.length; empty.innerHTML = `<p>这个分类暂未收录专辑。单曲、OST 和专辑内个人曲另见成员作品页，不计入专辑数量。</p>${member !== 'all' ? `<a href="member.html?id=${encodeURIComponent(member)}#mp-works">查看${esc(ctx.byId[member].zh)}的作品 →</a>` : ''}<button type="button" data-album-reset>查看全部专辑</button>`; }
    store.set('exo-album-scope', scope); store.set('exo-album-member', member);
    if (albums.length) { const start = albums.findIndex(a => a.slug === prefer); select(start >= 0 ? start : albums.length - 1, { quiet: true, scroll: false }); requestAnimationFrame(() => centerSleeve(cur, false)); }
  }
  filters?.addEventListener('click', e => { const b = e.target.closest('[data-album-scope]'); if (!b) return; scope = b.dataset.albumScope; applyFilters(); });
  memberFilter?.addEventListener('change', () => { member = memberFilter.value; applyFilters(); });
  empty?.addEventListener('click', e => { if (!e.target.closest('[data-album-reset]')) return; scope = member = 'all'; applyFilters(); });
  applyFilters(initialAlbum || store.get('exo-album', null));

  const go = slug => { if (!allAlbums.some(a => a.slug === slug)) return; if (!albums.some(a => a.slug === slug)) { scope = member = 'all'; applyFilters(slug); } else select(albums.findIndex(a => a.slug === slug), { smooth: false }); const sec = $('#albums'); ctx.lenis ? ctx.lenis.scrollTo(sec, { offset: -30, duration: 1.2 }) : sec.scrollIntoView(); };
  return { go, openMV };
}
