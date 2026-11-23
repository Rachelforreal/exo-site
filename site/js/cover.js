/* 今日刊 — the 书刊 edition's first screen. One issue a day: the issue number is the day count
   since debut, the cover person is the member whose power is on (else the member of the day),
   the lyric follows the calendar, the cover lines say something true about today. */
import { $, $$, esc, glyph, store, todayStr, dayDiff, eventState, isConfirmed, badge, phaseBadge, md, reduced, clamp, enhanceSegs } from './util.js';
import { renderCheckin } from './checkin.js';
import { COVER_URL, STRIP_H, drawShareStrip, sizePicker, wrapLines, presentExportModal } from './share.js'; /* share */
import { plushieSVG } from './plushies.js';

const WD = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PHOTOCARD_NOTES = {
  xiumin: {
    ko: '항상 곁에 있어줘서 고마워, 우리 엘사들 ❄️',
    zh: '「像初雪一样干净又坚韧的大哥。无论什么时候回头看，珉锡总在舞台最稳的地方发光。」',
    tag: 'FROST · 冰结印记 · NO.99',
  },
  suho: {
    ko: '엑소 사랑하자! 영원히 함께 걸어가자, 엑소엘 🤍',
    zh: '「从练习生岁月守到十四年后的队长。只要俊勉说出那句 WE ARE ONE，大家的心就会瞬间安定下来。」',
    tag: 'WATER · 潮汐印记 · NO.01',
  },
  lay: {
    ko: '谢谢你们一直都在，我们的约定一直算数 🦄',
    zh: '「写下《约定》旋律的人。跨越山海再合流的那一刻，治愈独角兽的光依然和十二年前一模一样。」',
    tag: 'HEALING · 治愈印记 · NO.10',
  },
  baekhyun: {
    ko: '에리들아~ 오늘도 밥 잘 챙겨 먹고 행복해야 해! ✨',
    zh: '「只要伯贤拿起麦克风、眼尾弯起来，整座体育馆就会变成最温柔的游乐园。天生属于舞台的光。」',
    tag: 'LIGHT · 日冕光印记 · NO.04',
  },
  chen: {
    ko: '노래로 여러분께 작은 위로가 될 수 있다면 행복합니다 ⚡',
    zh: '「能刺破乌云的高音与最暖的笑眼。填下《约定》韩文词的钟大，每一句吟唱都像在替爱丽说话。」',
    tag: 'THUNDER · 雷电印记 · NO.21',
  },
  chanyeol: {
    ko: '죽을 때까지 엑소엘이랑 함께 음악하고 싶어요 🔥',
    zh: '「把银海写进歌词、把吉他与鼓点燃成火焰。灿烈眼里的少年气，十四年里从来没有熄灭过一秒。」',
    tag: 'FLAME · 火凤印记 · NO.61',
  },
  do: {
    ko: '늘 건강하시고, 맛있는 밥 꼭 챙겨 드세요 🐧',
    zh: '「不爱说漂亮场面话，却把每一首歌和每一个角色都唱进人心底的暻秀。平直浓眉下是最踏实的温柔。」',
    tag: 'FORCE · 大地印记 · NO.12',
  },
  kai: {
    ko: '무대 위에서 에리들을 볼 때가 세상에서 제일 행복해 🐻',
    zh: '「一个眼神就能把空间瞬间折叠的开儿。舞台上是锋利的王，一下台又变成会害羞捂脸的小熊。」',
    tag: 'TELEPORT · 瞬移印记 · NO.88',
  },
  sehun: {
    ko: '우리 엑소엘, 늘 고맙고 사랑합니다 🐥',
    zh: '「被哥哥们宠着长大的忙内，也是最讲义气、最护着团魂的风。只要世勋在，EXO 的少年感就永远在。」',
    tag: 'WIND · 旋风印记 · NO.94',
  },
};

export function initCover(ctx, { openMember, focusEvent } = {}) {
  const root = $('#cover'); if (!root) return;
  const today = todayStr(), [ty, tm, td] = today.split('-').map(Number);
  const debut = ctx.archive?.debut || ctx.meta.debut;
  const no = dayDiff(today, debut);
  const order = ctx.members;

  /* separate ongoing confirmed items from the next upcoming stage — never conflate them */
  const confirmedActive = ctx.events.filter(e => isConfirmed(e) && eventState(e).isActive);
  const ongoingList = confirmedActive.filter(e => eventState(e).isOngoing)
    .sort((a, b) => (a.endDate || a.date).localeCompare(b.endDate || b.date));
  const upcomingList = confirmedActive.filter(e => eventState(e).isUpcoming && /发行|演唱会|粉丝见面/.test(e.category))
    .sort((a, b) => a.date.localeCompare(b.date));
  const ongoingTop = ongoingList.find(e => e.members.includes('group') || e.members.length > 1) || ongoingList[0] || null;
  const nextStage = upcomingList.find(e => e.members.includes('group') || e.members.length > 1) || upcomingList[0] || null;
  const nextD = nextStage ? dayDiff(nextStage.date, today) : null;

  const sameDay = d => +d.slice(5, 7) === tm && +d.slice(8, 10) === td;
  const annivAlbum = ctx.albums.find(a => sameDay(a.date) && a.date < today);
  const bday = order.find(m => sameDay(m.birth));
  const todayParts = [];
  if (bday) todayParts.push(`今日为 ${bday.en}（${bday.zh}）生日，祝我们的行星生日快乐`);
  if (annivAlbum) todayParts.push(`今日恰逢《${annivAlbum.title}》发行 ${ty - +annivAlbum.date.slice(0, 4)} 周年`);
  const todayLine = todayParts.length
    ? todayParts.join('；') + '。'
    : '收录九位成员最新动态、演出行程、历代专辑与画报档案。';

  $('[data-issue-no]', root).textContent = no.toLocaleString('en-US');
  $('[data-issue-today]', root).innerHTML = `<b>${ty}.${String(tm).padStart(2, '0')}.${String(td).padStart(2, '0')} · ${WD[new Date(Date.UTC(ty, tm - 1, td)).getUTCDay()]}</b>自 2012.04.08 初遇第 ${no.toLocaleString('en-US')} 天。${esc(todayLine)}`;
  renderCheckin($('[data-checkin]', root), today, bday?.zh || '');
  $('[data-issue-line]', root).textContent = `NO. ${no.toLocaleString('en-US')} · ${ty}.${String(tm).padStart(2, '0')}.${String(td).padStart(2, '0')}`;

  /* lyric: the album whose anniversary is today, otherwise rotate through the eras, with interactive next button */
  const withLyric = ctx.albums.filter(a => a.lyric);
  let lyricIdx = annivAlbum?.lyric ? Math.max(0, withLyric.indexOf(annivAlbum)) : (withLyric.length ? no % withLyric.length : 0);
  const paintLyric = idx => {
    const la = withLyric[idx];
    if (!la) return;
    $('[data-lyric-ko]', root).textContent = la.lyric[0];
    $('[data-lyric-zh]', root).textContent = la.lyric[1];
    $('[data-lyric-src]', root).textContent = `${la.lead} · 《${la.title}》 · ${la.date.slice(0, 4)}`;
  };
  paintLyric(lyricIdx);
  const nextLyricBtn = $('[data-lyric-next]', root);
  if (nextLyricBtn && withLyric.length > 1) {
    nextLyricBtn.addEventListener('click', () => {
      lyricIdx = (lyricIdx + 1) % withLyric.length;
      const fig = $('.issue__lyric', root);
      if (fig) {
        fig.classList.remove('is-swapping');
        void fig.offsetWidth;
        fig.classList.add('is-swapping');
      }
      paintLyric(lyricIdx);
    });
  }

  /* cover colophon leads (below portrait, never obscuring the face/body) + table of contents */
  const official = ctx.news.filter(n => n.verification === 'official').sort((a, b) => b.date.localeCompare(a.date))[0];
  const confirmedNewsCount = ctx.news.filter(n => n.verification !== 'unverified').length;
  const nextAnniv = ctx.albums.filter(a => a.date.length === 10).map(a => { let y = ty; let d = `${y}${a.date.slice(4)}`; if (d < today) d = `${++y}${a.date.slice(4)}`; return { a, d, n: y - +a.date.slice(0, 4), dd: dayDiff(d, today) }; }).filter(x => x.n > 0).sort((x, y) => x.dd - y.dd)[0];
  const lastRoad = (ctx.archive?.road || []).filter(r => r.d <= today).slice(-1)[0];

  const toc = [
    ['members', '九人画报带', '01–09 九位成员多时期画报与单人档案'],
    ['now', '此刻星讯', official ? `${confirmedNewsCount} 条动态 · ${official.title}` : '官博、场馆与成员大吧动态'],
    ['schedule', '行程与票务', `${ongoingList.length} 项进行中 · ${confirmedActive.length - ongoingList.length} 场即将开演（KST / CST）`],
    ['albums', '历代唱片架', nextAnniv ? `${ctx.albums.length} 张唱片 · 距《${nextAnniv.a.title}》${nextAnniv.n} 周年 D-${nextAnniv.dd}` : `${ctx.albums.length} 张团体、个人与分队唱片`],
    ['explore', '编年与综艺', lastRoad ? `十四年大事编年 · 52 档综艺 · 最新：${lastRoad.t}` : '《MAMA》《咆哮》《约定》《REVERXE》档案'],
    ['explore', '官娃与工坊', '官娃贴纸 · DIY 锁屏壁纸与专属 L 卡'],
  ];
  $('[data-toc]', root).innerHTML = toc.map(([id, t, s], i) => `<li><a href="#${id}"><i>${['01', '02', '03', '04', '05', '06'][i]}</i><span><b>${t}</b><span>${esc(s)}</span></span></a></li>`).join('');

  const primaryStage = ongoingTop || nextStage;
  const secondaryStage = ongoingTop && nextStage ? nextStage : null;
  if (primaryStage) {
    const isOg = primaryStage === ongoingTop;
    $('[data-next]', root).innerHTML = `<div class="radar-card radar-card--ticket${isOg ? ' radar-card--ongoing' : ''}">
      <a class="radar-card__main" href="#schedule" data-cover-ev="${esc(primaryStage.id)}">
        <div class="radar-card__top">
          <span class="radar-card__k">${isOg ? 'LIVE TICKET · 正在进行' : 'NEXT TICKET · 下一场重逢'}</span>
          ${badge(primaryStage.verification, { compact: true })}
        </div>
        <b>${esc(primaryStage.title)}</b>
        <span class="radar-card__meta">${isOg ? phaseBadge(primaryStage) : `<span class="pbadge pbadge--upcoming">${md(primaryStage.date)} · D-${nextD}</span>`}${primaryStage.city ? `<i>${esc(primaryStage.city)}</i>` : ''}</span>
      </a>
      ${secondaryStage ? `<a class="radar-card__sub" href="#schedule" data-cover-ev="${esc(secondaryStage.id)}"><span>下一节点 · ${md(secondaryStage.date)}（D-${nextD}）</span><b>${esc(secondaryStage.title)} →</b></a>` : ''}
    </div>`;
  } else {
    $('[data-next]', root).innerHTML = '';
  }

  /* cover person — independent from global power theme */
  const pick = $('.issue__pick', root);
  const daily = no % order.length;
  const savedCover = store.get('exo-cover-subject', null);
  let ci = order.findIndex(m => m.id === savedCover);
  if (ci < 0) ci = bday ? order.indexOf(bday) : daily;

  pick.innerHTML = order.map((m, i) => `<button type="button" class="sigil-pick" data-ci="${i}" aria-label="切换封面为 ${esc(m.en)} ${esc(m.zh)}" style="--pc:${m.color}">${glyph(m.id)}<span>${m.no}</span><b>${esc(m.zh)}</b></button>`).join('');
  const img = $('[data-cover-img]', root);
  const mag = $('[data-cover]', root);
  const veil = $('.mag__veil', root);
  const ribbonNo = $('[data-ribbon-no]', root);
  if (ribbonNo) ribbonNo.textContent = `NO.${no.toLocaleString('en-US')}`;

  let firstPaint = true;
  function cover(i, persist = false, dir = 1) {
    ci = (i + order.length) % order.length; const m = order[ci];
    if (persist) store.set('exo-cover-subject', m.id);
    const era = m.photo2 ? m.photo2Era : m.photoEra;
    const g = window.gsap;

    const applyContent = () => {
      img.classList.remove('is-in'); img.onload = () => img.classList.add('is-in');
      img.src = m.photo2 || m.photo; img.alt = `${m.en} 封面 · ${era}`;
      if (img.complete && img.naturalWidth) img.classList.add('is-in');
      $('[data-cover-name]', root).textContent = m.en;
      $('[data-cover-line]', root).textContent = `${m.zh} · ${m.power.zh}（${m.power.en}）`;
      const heroEn = $('[data-cover-hero-en]', root); if (heroEn) heroEn.textContent = m.en;
      const heroZh = $('[data-cover-hero-zh]', root); if (heroZh) heroZh.textContent = `${m.zh} · ${m.power.zh}`;
      const heroGl = $('[data-cover-hero-glyph]', root); if (heroGl) heroGl.innerHTML = glyph(m.id);
      if (ribbonNo) ribbonNo.textContent = `EXO-L · NO. ${m.no}`;
      const pn = PHOTOCARD_NOTES[m.id] || { ko: 'WE ARE ONE · 엑소 사랑하자', zh: m.note || '', tag: `PLANET ${m.no}` };
      const todayEl = $('[data-issue-today]', root);
      if (todayEl) {
        todayEl.innerHTML = `${esc(m.power.zh)}印记（2012《MAMA》设定：${esc(m.power.en)}）。${esc(m.role || '')}${m.summary ? `；${esc(m.summary)}` : ` —— ${esc(pn.zh.replace(/^[「」]|[「」]$/g, ''))}`}`;
      }
      const codeEl = $('[data-cover-code]', root); if (codeEl) codeEl.textContent = `PLANET ${m.no} // ${m.power.en}`;
      const eraEl = $('[data-cover-era]', root); if (eraEl) eraEl.textContent = era || '';
      const glEl = $('[data-cover-glyph]', root); if (glEl) glEl.innerHTML = glyph(m.id);
      const plEl = $('[data-cover-plush]', root); if (plEl) plEl.innerHTML = plushieSVG(m.id, { size: 48 });
      const backEl = $('[data-cover-back]', root);
      if (backEl) {
        backEl.innerHTML = `
          <div class="mag__back-in">
            <p class="mag__back-top"><span>COLLECTOR PHOTOCARD · 小卡背面手记</span><b>${esc(pn.tag)}</b></p>
            <div class="mag__back-plush">${plushieSVG(m.id, { size: 62 })}</div>
            <p class="mag__back-ko">${esc(pn.ko)}</p>
            <p class="mag__back-zh">${esc(pn.zh)}</p>
            <div class="mag__back-meta">
              <span>${esc(m.zh)} · ${esc(m.role || '')}</span>
              <span>${esc(m.power.zh)}（${esc(m.power.en)}）</span>
            </div>
            <p class="mag__back-sign">— ${esc(m.en)} · EXOPLANET 2012–2026</p>
          </div>`;
      }
      root.style.setProperty('--pc', m.color);
      root.style.setProperty('--pc2', m.color2 || m.color);
      $('[data-cover-link]', root).href = `member.html?id=${m.id}`;
      $('[data-cover-link]', root).textContent = `进入 ${m.en} 单人专栏`;
      const qBtn = $('[data-cover-quick]', root); if (qBtn) qBtn.textContent = `速览 ${m.zh} 档案`;
      $$('[data-ci]', pick).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.ci === ci)));
    };

    if (!firstPaint && g && !reduced && mag) {
      g.killTweensOf([mag, img, veil, '.mag__cl', '.mag__ribbon', '.mag__plush']);
      const tl = g.timeline({ defaults: { ease: 'expo.out' } });
      if (veil) {
        tl.set(veil, { transformOrigin: dir > 0 ? 'left center' : 'right center', scaleX: 0, opacity: 0.92 })
          .to(veil, { scaleX: 1, duration: 0.24, ease: 'power2.in' });
      }
      tl.to(mag, { rotateY: dir * -5.5, scale: 0.985, duration: 0.22, ease: 'power2.in' }, 0)
        .add(applyContent)
        .to(mag, { rotateY: 0, scale: 1, duration: 0.72, clearProps: 'transform' });
      if (veil) {
        tl.set(veil, { transformOrigin: dir > 0 ? 'right center' : 'left center' })
          .to(veil, { scaleX: 0, opacity: 0, duration: 0.52 }, '<');
      }
      tl.fromTo(img, { scale: 1.09 }, { scale: 1, duration: 0.95, clearProps: 'transform' }, '<')
        .fromTo('.mag__cl', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, clearProps: 'transform,opacity' }, '<0.06')
        .fromTo('.mag__plush', { scale: 0.7, rotate: -10 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)', clearProps: 'transform' }, '<0.08')
        .fromTo('.mag__ribbon', { rotate: -6 }, { rotate: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)', clearProps: 'transform' }, '<');
    } else {
      applyContent();
      if (firstPaint && g && !reduced && mag) {
        g.fromTo(mag, { y: 22, opacity: 0, rotateX: 5, rotateY: -6 }, { y: 0, opacity: 1, rotateX: 0, rotateY: 0, duration: 1.05, ease: 'expo.out', clearProps: 'opacity,transform' });
        g.fromTo('.mag-orbit', { scale: 0.86, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out' });
      }
    }
    firstPaint = false;
  }

  pick.addEventListener('click', e => {
    const b = e.target.closest('[data-ci]');
    if (!b) return;
    const nextIdx = +b.dataset.ci;
    if (nextIdx === ci) return;
    cover(nextIdx, true, nextIdx > ci ? 1 : -1);
  });
  root.addEventListener('click', e => {
    const flipBtn = e.target.closest('[data-cover-flip]');
    if (flipBtn) {
      e.stopPropagation();
      const frame = $('[data-cover-frame]', root) || $('.mag__ph', root);
      if (frame) {
        const flipped = frame.classList.toggle('is-flipped');
        flipBtn.setAttribute('aria-pressed', String(flipped));
        flipBtn.textContent = flipped ? '翻回小卡正面 ↺' : '翻看小卡背面 ↺';
        const backEl = $('[data-cover-back]', root);
        if (backEl) backEl.setAttribute('aria-hidden', String(!flipped));
      }
      return;
    }
    const ce = e.target.closest('[data-cover-ev]');
    if (ce && focusEvent) { e.preventDefault(); focusEvent(ce.dataset.coverEv); return; }
    const stepBtn = e.target.closest('[data-cover-step]');
    if (stepBtn) { const d = +stepBtn.dataset.coverStep; cover(ci + d, true, d); }
  });
  const qBtn = $('[data-cover-quick]', root);
  if (qBtn) qBtn.addEventListener('click', () => openMember?.(order[ci].id, qBtn));

  // Interactive 3D tilt & silver foil sheen with smooth Lerp rAF damper on desktop pointer
  const stageEl = $('.issue__stage', root);
  const sigil = $('.mag__sigil', root);
  let hovering = false;
  if (!reduced && mag && window.matchMedia('(hover: hover)').matches) {
    const LERP = 0.14;
    const cur = { rx: 0, ry: 0, mx: 50, my: 30, px: 0, py: 0 };
    const target = { rx: 0, ry: 0, mx: 50, my: 30, px: 0, py: 0 };
    let tiltRaf = 0;
    let activeTilt = false;

    const writeTilt = () => {
      mag.style.setProperty('--mx', `${cur.mx.toFixed(2)}%`);
      mag.style.setProperty('--my', `${cur.my.toFixed(2)}%`);
      mag.style.setProperty('--ry', `${cur.ry.toFixed(3)}deg`);
      mag.style.setProperty('--rx', `${cur.rx.toFixed(3)}deg`);
      mag.style.setProperty('--px', `${cur.px.toFixed(2)}px`);
      mag.style.setProperty('--py', `${cur.py.toFixed(2)}px`);
      if (sigil) {
        sigil.style.transform = (!activeTilt && Math.abs(cur.px) < 0.01 && Math.abs(cur.py) < 0.01)
          ? ''
          : `translate3d(${(cur.px * -0.45).toFixed(2)}px, ${(cur.py * -0.45).toFixed(2)}px, 0)`;
      }
    };

    const tickTilt = () => {
      let maxD = 0;
      for (const k of ['rx', 'ry', 'mx', 'my', 'px', 'py']) {
        const d = target[k] - cur[k];
        cur[k] += d * LERP;
        const ad = Math.abs(d);
        if (ad > maxD) maxD = ad;
      }
      if (maxD < 0.01) {
        Object.assign(cur, target);
        writeTilt();
        tiltRaf = 0;
        if (!activeTilt) {
          mag.style.willChange = '';
          img.style.willChange = '';
        }
        return;
      }
      writeTilt();
      tiltRaf = requestAnimationFrame(tickTilt);
    };

    const kickTilt = () => {
      if (!tiltRaf) {
        mag.style.transition = 'box-shadow .5s var(--ease)';
        img.style.transition = 'opacity .5s';
        mag.style.willChange = 'transform';
        img.style.willChange = 'transform';
        tiltRaf = requestAnimationFrame(tickTilt);
      }
    };

    mag.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const r = mag.getBoundingClientRect();
      const nx = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1);
      const ny = clamp((e.clientY - r.top) / Math.max(1, r.height), 0, 1);
      activeTilt = true;
      target.mx = nx * 100;
      target.my = ny * 100;
      target.ry = (nx - 0.5) * 9;
      target.rx = (0.5 - ny) * 7;
      target.px = (nx - 0.5) * -10;
      target.py = (ny - 0.5) * -8;
      kickTilt();
    });
    mag.addEventListener('pointerleave', () => {
      activeTilt = false;
      target.rx = 0; target.ry = 0;
      target.px = 0; target.py = 0;
      target.mx = 50; target.my = 30;
      kickTilt();
    });
  }
  stageEl?.addEventListener('pointerenter', () => { hovering = true; });
  stageEl?.addEventListener('pointerleave', () => { hovering = false; });

  // Optional gentle auto-flip carousel (can be paused/resumed anytime)
  const autoBtn = $('[data-cover-auto]', root);
  let autoOn = !reduced;
  const syncAutoBtn = () => {
    if (!autoBtn) return;
    autoBtn.setAttribute('aria-pressed', String(autoOn));
    autoBtn.textContent = autoOn ? '自动翻阅中 · 暂停' : '开启自动翻阅';
  };
  syncAutoBtn();
  autoBtn?.addEventListener('click', () => { autoOn = !autoOn; syncAutoBtn(); });
  if (!reduced) {
    setInterval(() => {
      if (!autoOn || hovering || document.hidden || document.documentElement.dataset.mode !== 'paper') return;
      if (window.scrollY > innerHeight * 0.7) return;
      cover(ci + 1, false, 1);
    }, 5600);
  }

  let sx = null;
  mag.addEventListener('pointerdown', e => { sx = e.clientX; });
  mag.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) cover(ci + (dx < 0 ? 1 : -1), true, dx < 0 ? 1 : -1); });
  root.addEventListener('keydown', e => { if (e.key === 'ArrowRight') cover(ci + 1, true, 1); if (e.key === 'ArrowLeft') cover(ci - 1, true, -1); });
  cover(ci, false, 1);

  /* share:begin — save this issue as an image: 3:4 (default) / 1:1 / 9:16, layout re-flows, QR + URL strip */
  const saveBtn = $('#save-cover', root) || $('[data-save-cover]', root);
  const btnsHost = $('.issue__btns', root);
  const sizer = btnsHost ? sizePicker({ key: 'exo-cover-size', def: '3:4', keys: ['3:4', '1:1', '9:16'], host: btnsHost, before: saveBtn }) : null;
  if (btnsHost) enhanceSegs(btnsHost);
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    const m = order[ci], [W, H] = sizer ? sizer.dims() : [1080, 1440], sq = W === H, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    await Promise.all(['500 80px Jost', '600 80px "Noto Serif SC"', '400 30px "Cormorant Garamond"'].map(f => document.fonts.load(f, '星球今晚也在为你守住的王冠')).map(p => p.catch(() => {})));
    const ph = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = img.src; });
    const issueLine = $('[data-issue-line]', root).textContent, lyric = `「${$('[data-lyric-zh]', root).textContent}」`;
    const cover = (px, py, pw, phh, vy) => { if (!ph) return; const s = Math.max(pw / ph.width, phh / ph.height), iw = ph.width * s, ih = ph.height * s; x.save(); x.beginPath(); x.rect(px, py, pw, phh); x.clip(); x.drawImage(ph, px + (pw - iw) / 2, py + (phh - ih) * vy, iw, ih); x.restore(); };
    x.fillStyle = '#f4f2ee'; x.fillRect(0, 0, W, H); x.fillStyle = '#111';
    const stripTop = H - STRIP_H, SERIF = (w, px) => `${w} ${px}px "Noto Serif SC", serif`;
    if (!sq) {
      x.textAlign = 'center';
      x.font = '500 64px Jost, sans-serif'; x.fillText('exo', W / 2, 118);
      x.font = '600 200px "Noto Serif SC", serif'; x.fillText('星球', W / 2, 300);
      x.font = '400 30px "Cormorant Garamond", serif'; x.fillText(issueLine, W / 2, 360);
      x.font = SERIF(400, 32); const ly = wrapLines(x, lyric, W - 140);
      const lyH = ly.length * 44, px = 70, py = 400, pw = W - 140, phh = stripTop - 28 - lyH - py;
      cover(px, py, pw, phh, 0.18);
      const g = x.createLinearGradient(0, py + phh * 0.6, 0, py + phh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(px, py, pw, phh);
      x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '500 40px Jost, sans-serif'; x.fillText(m.en, px + 48, py + phh - 98);
      x.font = SERIF(400, 34); x.fillText(`—  ${m.zh} · ${m.power.zh}`, px + 48, py + phh - 44);
      x.fillStyle = '#111'; x.font = SERIF(400, 32); ly.forEach((l, i) => x.fillText(l, 70, py + phh + 56 + i * 44));
    } else {
      const pw = 470, px = W - 70 - pw, py = 70, phh = stripTop - 30 - py, cw = px - 70 - 30;
      cover(px, py, pw, phh, 0.18);
      x.textAlign = 'left'; x.font = '500 56px Jost, sans-serif'; x.fillText('exo', 70, 118);
      x.font = '600 190px "Noto Serif SC", serif'; x.fillText('星球', 66, 290);
      x.font = '400 26px "Cormorant Garamond", serif'; x.fillText(issueLine, 70, 338, cw);
      x.fillStyle = m.color; x.fillRect(70, 372, 56, 6);
      x.fillStyle = '#111'; x.font = '500 54px Jost, sans-serif'; x.fillText(m.en, 70, 450, cw);
      x.fillStyle = '#444'; x.font = SERIF(400, 30); x.fillText(`${m.zh} · ${m.power.zh}`, 70, 498, cw);
      x.fillStyle = '#111'; x.font = SERIF(400, 30); wrapLines(x, lyric, cw).slice(0, 6).forEach((l, i) => x.fillText(l, 70, 580 + i * 42));
    }
    drawShareStrip(x, { H, x0: 70, x1: W - 70, url: COVER_URL, ink: '#111', soft: '#666', dark: '#111', light: '#f4f2ee', font: (w, px) => `${w} ${px}px Jost, "Noto Serif SC", sans-serif`, lines: [issueLine, 'Photo © SM Entertainment'] });
    presentExportModal(c, { title: `EXO 星球今日刊 NO.${no} · ${m.en}`, filename: `exo-issue-${no}-${m.id}.png`, hint: '桌面端可直接点击下载，手机 / 微信浏览请长按图片保存到相册' });
  });
  /* share:end */
}
