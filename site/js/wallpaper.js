// DIY 星球壁纸工坊 — 手机锁屏 (9:16) / 平板海报 (3:4) / 电脑桌面 (16:9)
// Supports:
// 1. Custom image upload via click, drag-and-drop (on dropzone OR directly onto canvas), or clipboard paste
// 2. Multi-era official member concept portraits
// 3. Direct interactive on-canvas dragging (plushie sticker, MAMA superpower sigil, bilingual lyrics, photo pan) + wheel/slider zoom
import { $, $$, esc, glyph, store, toast, clamp } from './util.js';
import { createUniverse } from './universe.js';
import { PLUSHIES, plushieDataUrl } from './plushies.js';
import { presentExportModal } from './share.js';

const PRESET_LYRICS = [
  { ko: '조금씩 가까워져 우리의 거리', zh: '一点点拉近属于我们的距离', src: '나비소녀 (Don\'t Go) · XOXO · 2013' },
  { ko: '우주를 건너 내 맘이 너에게 닿기를', zh: '穿过整片宇宙，愿我的心抵达你身边', src: 'Universe · UNIVERSE · 2017' },
  { ko: '낡은 일기장 먼지를 털어내 문득 펼친 곳', zh: '拂去旧日记本上的灰尘，忽然翻开的那一页', src: '피터팬 (Peter Pan) · XOXO · 2013' },
  { ko: 'The way you cry, the way you smile', zh: '你的泪水与微笑，对我而言意味着一切', src: 'Sing For You · SING FOR YOU · 2015' },
  { ko: '평생 너만 바라볼게 For life', zh: '一生只望向你一人，For life', src: 'For Life · FOR LIFE · 2016' },
  { ko: '불이 꺼진 exit light', zh: '熄灭的出口灯，在暗夜里相逢', src: 'Obsession · OBSESSION · 2019' },
  { ko: '톡 쏘는 듯한 느낌 Cream Soda', zh: '气泡升腾的瞬间，沁入心底', src: 'Cream Soda · EXIST · 2023' },
  { ko: '황야 위에 다시 새긴 우리의 왕관', zh: '在荒原之上重新镌刻属于我们的王冠', src: 'Crown · REVERXE · 2026' },
];

const SIZES = {
  '9:16': [1080, 1920, '9:16 手机锁屏'],
  '3:4': [1080, 1440, '3:4 平板/海报'],
  '16:9': [1920, 1080, '16:9 电脑桌面'],
};

export function initWallpaper(ctx) {
  const canvas = $('#wp-canvas'); if (!canvas) return null;
  const c2 = canvas.getContext('2d');
  const st = {
    member: store.get('exo-wp-member', 'baekhyun'),
    lookIdx: 0,
    subject: store.get('exo-wp-subject', 'portrait'), // portrait | plush | family
    bg: store.get('exo-wp-bg', 'paper'),              // paper | galaxy | aurora | noir | custom
    prevPresetBg: 'paper',
    ratio: store.get('exo-wp-ratio', '9:16'),
    customImg: null,
    customImgName: '',
    customMode: 'backdrop', // backdrop | frame
    zoom: 1,
    dim: 0.28,
    panX: 0,
    panY: 0,
    offsets: {
      sticker: { x: 0, y: 0 },
      seal: { x: 0, y: 0 },
      lyric: { x: 0, y: 0 },
    },
    plushSticker: true,
    astrolabe: true,
    sigilSeal: true,
    clockGuide: true,
    lyricIdx: 0,
    customText: '',
  };
  if (!ctx.byId[st.member]) st.member = ctx.members[0].id;
  if (st.bg === 'custom' && !st.customImg) st.bg = 'paper';

  const picksEl = $('#wp-picks');
  const looksEl = $('#wp-looks');
  const lyricSel = $('#wp-lyric-sel');
  const dropEl = $('#wp-dropzone');
  const fileIn = $('#wp-file');
  const cardWrap = $('#wp-card-wrap') || canvas.parentElement;
  const zoomIn = $('#wp-zoom'), zoomVal = $('#wp-zoom-val');
  const dimIn = $('#wp-dim'), dimVal = $('#wp-dim-val'), dimWrap = $('#wp-dim-wrap');
  const cModeWrap = $('#wp-custom-mode-wrap');
  const clearImgBtn = $('#wp-clear-img');
  const dragHint = $('#wp-drag-hint');

  if (picksEl) {
    picksEl.innerHTML = ctx.members.map(m =>
      `<button type="button" class="pick jelly-press" data-wp-m="${m.id}" aria-pressed="${m.id === st.member}" style="--mc:${m.color}">${glyph(m.id)}<span>${esc(m.en)}</span></button>`
    ).join('');
  }
  if (lyricSel) {
    lyricSel.innerHTML = PRESET_LYRICS.map((l, i) => `<option value="${i}">${esc(l.zh)} — ${esc(l.src.split(' · ')[0])}</option>`).join('');
  }

  function getMemberGallery(m) {
    return m.gallery?.length ? m.gallery : [m.photo2, m.photo].filter(Boolean).map((src, i) => ({ src, era: [m.photo2Era, m.photoEra][i] || '' }));
  }

  function renderLookPicks() {
    if (!looksEl) return;
    const m = ctx.byId[st.member] || ctx.members[0];
    const gal = getMemberGallery(m);
    looksEl.hidden = st.subject !== 'portrait' || (st.customImg && st.customMode === 'frame');
    looksEl.innerHTML = `<span class="wp-looks__lbl">切换画报造型：</span>` + gal.map((g, i) =>
      `<button type="button" class="wp-look-chip jelly-press${i === st.lookIdx ? ' is-on' : ''}" data-wp-look="${i}" title="${esc(g.era || '')}"><img src="${esc(g.src)}" alt=""><span>0${i + 1}</span></button>`
    ).join('');
  }

  let uni = null, uCanvas = null;
  const imgCache = {};
  const loadImg = src => (imgCache[src] ||= new Promise(r => {
    const im = new Image();
    im.onload = () => r(im);
    im.onerror = () => r(null);
    im.src = src;
  }));

  // Hit-boxes in canvas coordinate space for interactive dragging
  let hitBoxes = {};
  let hoverLayer = null;
  let dragState = null;
  let renderPending = false;

  function resetPositions() {
    st.panX = 0; st.panY = 0; st.zoom = 1;
    st.offsets.sticker = { x: 0, y: 0 };
    st.offsets.seal = { x: 0, y: 0 };
    st.offsets.lyric = { x: 0, y: 0 };
    if (zoomIn) zoomIn.value = '100';
    if (zoomVal) zoomVal.textContent = '100%';
  }

  function roundRect(ctx2d, x, y, w, h, r) {
    ctx2d.beginPath();
    ctx2d.moveTo(x + r, y);
    ctx2d.arcTo(x + w, y, x + w, y + h, r);
    ctx2d.arcTo(x + w, y + h, x, y + h, r);
    ctx2d.arcTo(x, y + h, x, y, r);
    ctx2d.arcTo(x, y, x + w, y, r);
    ctx2d.closePath();
  }

  function drawHex(ctx2d, cx, cy, rad) {
    ctx2d.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a);
      i === 0 ? ctx2d.moveTo(px, py) : ctx2d.lineTo(px, py);
    }
    ctx2d.closePath();
    ctx2d.stroke();
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      ctx2d.beginPath();
      ctx2d.moveTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
      ctx2d.lineTo(cx - rad * Math.cos(a), cy - rad * Math.sin(a));
      ctx2d.stroke();
    }
  }

  function drawPannedCoverImg(ctx2d, img, boxX, boxY, boxW, boxH, defaultBiasY = 0.18) {
    const baseScale = Math.max(boxW / img.width, boxH / img.height);
    const sc = baseScale * st.zoom;
    const iw = img.width * sc, ih = img.height * sc;
    const baseX = boxX + (boxW - iw) * 0.5;
    const baseY = boxY + (boxH - ih) * defaultBiasY;
    const maxShiftX = Math.max(120, (iw - boxW) * 0.5 + 140);
    const maxShiftY = Math.max(120, (ih - boxH) * 0.5 + 140);
    const dx = clamp(st.panX, -maxShiftX, maxShiftX);
    const dy = clamp(st.panY, -maxShiftY, maxShiftY);
    ctx2d.drawImage(img, baseX + dx, baseY + dy, iw, ih);
  }

  function drawSelectionBox(box, label) {
    if (!box) return;
    c2.save();
    c2.strokeStyle = 'rgba(111, 193, 255, 0.92)';
    c2.lineWidth = 2.5;
    c2.setLineDash([10, 7]);
    roundRect(c2, box.x - 10, box.y - 10, box.w + 20, box.h + 20, 14);
    c2.stroke();
    c2.setLineDash([]);
    c2.fillStyle = 'rgba(14, 20, 38, 0.84)';
    const tagW = label.length * 20 + 28;
    roundRect(c2, box.x - 6, Math.max(16, box.y - 46), tagW, 32, 8);
    c2.fill();
    c2.fillStyle = '#ffffff';
    c2.font = '600 18px "PingFang SC", sans-serif';
    c2.textAlign = 'left';
    c2.fillText(label, box.x + 8, Math.max(38, box.y - 24));
    c2.restore();
  }

  async function render({ forExport = false } = {}) {
    const m = ctx.byId[st.member] || ctx.members[0];
    const [W, H] = SIZES[st.ratio] || SIZES['9:16'];
    const isLand = W > H, isPhone = st.ratio === '9:16';
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H;
    }
    canvas.parentElement?.style.setProperty('--wp-ar', `${W} / ${H}`);
    const nextHits = {};

    const hasCustomBackdrop = !!(st.customImg && st.bg === 'custom' && st.customMode === 'backdrop');
    const light = st.bg === 'paper' && !hasCustomBackdrop;
    const ink = light ? '#111625' : '#f6f7fb';
    const subInk = light ? 'rgba(17,22,37,0.64)' : 'rgba(246,247,251,0.76)';
    const lineCol = light ? 'rgba(17,22,37,0.14)' : 'rgba(246,247,251,0.20)';
    const ac = light ? '#1e3f7a' : m.color;

    // 1. Paint Backdrop
    if (hasCustomBackdrop) {
      c2.fillStyle = '#090c18';
      c2.fillRect(0, 0, W, H);
      drawPannedCoverImg(c2, st.customImg, 0, 0, W, H, 0.35);
      nextHits.photo = { x: 0, y: 0, w: W, h: H, label: '拖拽平移自定义底图' };
      // Soft editorial vignette + adjustable dim so text & clock stay crystal-clear
      if (st.dim > 0) {
        c2.fillStyle = `rgba(8, 11, 22, ${st.dim.toFixed(3)})`;
        c2.fillRect(0, 0, W, H);
      }
      const vg = c2.createLinearGradient(0, H * 0.55, 0, H);
      vg.addColorStop(0, 'rgba(8,11,22,0)');
      vg.addColorStop(1, `rgba(8,11,22,${Math.min(0.82, st.dim + 0.34).toFixed(3)})`);
      c2.fillStyle = vg;
      c2.fillRect(0, 0, W, H);
    } else if (st.bg === 'paper') {
      c2.fillStyle = '#f3f0e8';
      c2.fillRect(0, 0, W, H);
      const g = c2.createRadialGradient(W * 0.5, H * 0.36, 40, W * 0.5, H * 0.45, Math.max(W, H) * 0.65);
      g.addColorStop(0, m.color + '33');
      g.addColorStop(1, 'rgba(243,240,232,0)');
      c2.fillStyle = g;
      c2.fillRect(0, 0, W, H);
      c2.strokeStyle = 'rgba(17,22,37,0.04)';
      c2.lineWidth = 1;
      for (let x = 90; x < W; x += 120) { c2.beginPath(); c2.moveTo(x, 0); c2.lineTo(x, H); c2.stroke(); }
      for (let y = 90; y < H; y += 120) { c2.beginPath(); c2.moveTo(0, y); c2.lineTo(W, y); c2.stroke(); }
    } else if (st.bg === 'galaxy') {
      if (!uCanvas) {
        uCanvas = document.createElement('canvas');
        uCanvas.style.cssText = 'position:fixed;left:-20000px;top:0;width:540px;height:960px';
        document.body.append(uCanvas);
        try { uni = createUniverse(uCanvas, { reduced: true, fixedScale: 2 }); } catch { uni = null; }
      }
      c2.fillStyle = '#070a16';
      c2.fillRect(0, 0, W, H);
      if (uni?.renderOnce) {
        uni.renderOnce(m.scene, 14.2);
        c2.drawImage(uCanvas, 0, 0, W, H);
      }
      c2.fillStyle = 'rgba(6,8,18,0.34)';
      c2.fillRect(0, 0, W, H);
    } else if (st.bg === 'aurora') {
      c2.fillStyle = '#0c1022';
      c2.fillRect(0, 0, W, H);
      const g1 = c2.createRadialGradient(W * 0.25, H * 0.28, 20, W * 0.3, H * 0.3, W * 0.85);
      g1.addColorStop(0, m.color + '88');
      g1.addColorStop(1, 'transparent');
      c2.fillStyle = g1; c2.fillRect(0, 0, W, H);
      const g2 = c2.createRadialGradient(W * 0.78, H * 0.72, 20, W * 0.75, H * 0.72, W * 0.85);
      g2.addColorStop(0, (m.color2 || m.color) + '77');
      g2.addColorStop(1, 'transparent');
      c2.fillStyle = g2; c2.fillRect(0, 0, W, H);
    } else {
      const gn = c2.createLinearGradient(0, 0, 0, H);
      gn.addColorStop(0, '#14161d');
      gn.addColorStop(1, '#07080c');
      c2.fillStyle = gn;
      c2.fillRect(0, 0, W, H);
    }

    // Outer architectural frame border
    const pad = isLand ? 48 : 54;
    c2.strokeStyle = lineCol;
    c2.lineWidth = 2;
    c2.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

    // 2. Optional Astrolabe & Planetary Coordinates
    const topSafe = isPhone ? 360 : (isLand ? 105 : 130);
    const bottomSafe = isPhone ? 430 : (isLand ? 110 : 320);
    const cx = isLand ? W * 0.34 : W * 0.5;
    const cy = isLand ? H * 0.52 : (topSafe + (H - topSafe - bottomSafe) * 0.5);

    if (st.astrolabe) {
      c2.save();
      c2.strokeStyle = light ? 'rgba(30,63,122,0.16)' : 'rgba(255,255,255,0.18)';
      c2.lineWidth = 1.6;
      if (!hasCustomBackdrop) {
        const rOuter = Math.min(W, H) * (isLand ? 0.36 : 0.39);
        c2.beginPath(); c2.arc(cx, cy, rOuter, 0, Math.PI * 2); c2.stroke();
        c2.setLineDash([6, 10]);
        c2.beginPath(); c2.arc(cx, cy, rOuter * 1.12, 0, Math.PI * 2); c2.stroke();
        c2.setLineDash([]);
      }
      drawHex(c2, pad + 34, pad + 34, 18);
      c2.fillStyle = subInk;
      c2.font = '600 20px Jost, sans-serif';
      c2.textAlign = 'left';
      c2.fillText('EXOPLANET // WE ARE ONE', pad + 64, pad + 41);
      c2.textAlign = 'right';
      c2.fillText(`EST. 2012.04.08 · PLANET ${m.no}`, W - pad - 24, pad + 41);
      c2.restore();
    }

    // 3. Subject Rendering (Portrait / Custom Full-Bleed / Single Plushie / 9-Member Grid)
    if (st.subject === 'portrait') {
      if (hasCustomBackdrop) {
        // Full-bleed custom backdrop mode: keep photo clean & full-screen, only add draggable plush sticker if checked!
        if (st.plushSticker) {
          const pImg = await loadImg(plushieDataUrl(m.id));
          if (pImg) {
            const stX = (isLand ? W - 210 : W - 185) + st.offsets.sticker.x;
            const stY = (isLand ? H - 210 : H - 470) + st.offsets.sticker.y;
            c2.save();
            c2.translate(stX, stY);
            c2.rotate(0.06);
            c2.shadowColor = 'rgba(0,0,0,0.38)';
            c2.shadowBlur = 22;
            c2.drawImage(pImg, -96, -96, 192, 192);
            c2.restore();
            nextHits.sticker = { x: stX - 96, y: stY - 96, w: 192, h: 192, label: '拖拽移动官娃贴纸' };
          }
        }
      } else {
        const phW = isLand ? 500 : (isPhone ? 610 : 640);
        const phH = isLand ? 650 : (isPhone ? 730 : 760);
        const px = cx - phW / 2, py = cy - phH / 2 - (isPhone ? 16 : 0);
        const gal = getMemberGallery(m);
        const chosenSrc = (gal[st.lookIdx] || gal[0])?.src || m.photo2 || m.photo;
        const photo = (st.customImg && st.customMode === 'frame') ? st.customImg : await loadImg(chosenSrc);

        c2.save();
        c2.fillStyle = light ? '#faf9f6' : 'rgba(16,20,38,0.85)';
        c2.shadowColor = 'rgba(0,0,0,0.28)';
        c2.shadowBlur = 46;
        c2.shadowOffsetY = 20;
        roundRect(c2, px - 18, py - 18, phW + 36, phH + 74, 20);
        c2.fill();
        c2.restore();

        if (photo) {
          c2.save();
          roundRect(c2, px, py, phW, phH, 12);
          c2.clip();
          if (st.bg === 'noir') c2.filter = 'grayscale(0.85) contrast(1.12)';
          drawPannedCoverImg(c2, photo, px, py, phW, phH, 0.18);
          c2.filter = 'none';
          c2.restore();
          nextHits.photo = { x: px, y: py, w: phW, h: phH, label: '拖拽调整框内构图' };
        }

        c2.fillStyle = ink;
        c2.font = '700 28px "Schibsted Grotesk", Jost, sans-serif';
        c2.textAlign = 'left';
        c2.fillText(`${m.en}  ·  ${m.zh}`, px + 6, py + phH + 38);
        c2.fillStyle = ac;
        c2.font = '600 21px Jost, "Noto Serif SC", sans-serif';
        c2.textAlign = 'right';
        c2.fillText(`${m.power.zh} ${m.power.en}`, px + phW - 6, py + phH + 38);

        if (st.plushSticker) {
          const pImg = await loadImg(plushieDataUrl(m.id));
          if (pImg) {
            const stX = px + phW - 76 + st.offsets.sticker.x;
            const stY = py + phH - 110 + st.offsets.sticker.y;
            c2.save();
            c2.translate(stX, stY);
            c2.rotate(0.08);
            c2.shadowColor = 'rgba(0,0,0,0.25)';
            c2.shadowBlur = 18;
            c2.drawImage(pImg, -92, -92, 184, 184);
            c2.restore();
            nextHits.sticker = { x: stX - 92, y: stY - 92, w: 184, h: 184, label: '拖拽移动官娃贴纸' };
          }
        }
      }
    } else if (st.subject === 'plush') {
      const pMeta = PLUSHIES.find(x => x.id === m.id) || PLUSHIES[0];
      const pImg = await loadImg(plushieDataUrl(m.id));
      const sx = cx + st.offsets.sticker.x, sy = cy + st.offsets.sticker.y;
      c2.save();
      c2.fillStyle = light ? pMeta.bg + 'bb' : m.color + '26';
      c2.beginPath(); c2.arc(sx, sy - 10, isLand ? 230 : 280, 0, Math.PI * 2); c2.fill();
      const sz = isLand ? 410 : 500;
      if (pImg) {
        c2.drawImage(pImg, sx - sz / 2, sy - sz / 2 - 12, sz, sz);
      }
      c2.shadowColor = hasCustomBackdrop ? 'rgba(0,0,0,0.55)' : 'transparent';
      c2.shadowBlur = hasCustomBackdrop ? 12 : 0;
      c2.fillStyle = ink;
      c2.textAlign = 'center';
      c2.font = '700 40px "Noto Serif SC", serif';
      const titleTxt = pMeta.hasDoll ? `${pMeta.name} · ${m.zh}` : `${m.en} · ${m.zh}`;
      c2.fillText(titleTxt, sx, sy + (isLand ? 250 : 300));
      c2.fillStyle = subInk;
      c2.font = '500 23px Jost, "PingFang SC", sans-serif';
      c2.fillText(`PLANET ${m.no} · ${m.power.zh}（${m.power.en}）`, sx, sy + (isLand ? 292 : 344));
      c2.restore();
      nextHits.sticker = { x: sx - sz / 2, y: sy - sz / 2, w: sz, h: sz + 110, label: '拖拽移动主玩偶形象' };
    } else {
      const cols = 3, gapX = isLand ? 220 : 250, gapY = isLand ? 230 : 275;
      const startX = cx - gapX + st.offsets.sticker.x, startY = cy - gapY + st.offsets.sticker.y;
      for (let i = 0; i < PLUSHIES.length; i++) {
        const p = PLUSHIES[i];
        const col = i % cols, row = Math.floor(i / cols);
        const x = startX + col * gapX, y = startY + row * gapY;
        const pImg = await loadImg(plushieDataUrl(p.id));
        c2.save();
        if (p.hasDoll) {
          c2.fillStyle = light ? p.bg + 'cc' : 'rgba(255,255,255,0.12)';
          c2.beginPath(); c2.arc(x, y, isLand ? 78 : 92, 0, Math.PI * 2); c2.fill();
        }
        if (pImg) {
          const sz = isLand ? 150 : 182;
          c2.drawImage(pImg, x - sz / 2, y - sz / 2, sz, sz);
        }
        c2.fillStyle = ink;
        c2.textAlign = 'center';
        c2.font = '600 20px Jost, "PingFang SC", sans-serif';
        c2.fillText(ctx.byId[p.id]?.en || p.name, x, y + (isLand ? 96 : 114));
        c2.restore();
      }
      nextHits.sticker = { x: startX - 110, y: startY - 110, w: gapX * 2 + 220, h: gapY * 2 + 230, label: '拖拽移动九宫格整体' };
    }

    // 4. Official MAMA Superpower Wax Seal / Sigil (Draggable!)
    if (st.sigilSeal) {
      const sym = document.getElementById(`g-${st.subject === 'family' ? 'galaxy' : m.id}`);
      if (sym) {
        const col = light ? '#1e3f7a' : m.color;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="120" height="120" style="color:${col}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg>`;
        const gi = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
        const sx = (isLand ? W * 0.73 : W * 0.5) + st.offsets.seal.x;
        const sy = (isLand ? H * 0.34 : (H - (isPhone ? 340 : 265))) + st.offsets.seal.y;
        if (gi) {
          c2.save();
          if (hasCustomBackdrop) { c2.shadowColor = 'rgba(0,0,0,0.55)'; c2.shadowBlur = 14; }
          c2.drawImage(gi, sx - 42, sy - 42, 84, 84);
          c2.restore();
          nextHits.seal = { x: sx - 46, y: sy - 46, w: 92, h: 92, label: '拖拽移动超能力印章' };
        }
      }
    }

    // 5. Lyric / Motto Typography Block (Draggable!)
    const ly = PRESET_LYRICS[st.lyricIdx] || PRESET_LYRICS[0];
    const custom = st.customText.trim();
    const tx = (isLand ? W * 0.73 : W * 0.5) + st.offsets.lyric.x;
    const ty = (isLand ? H * 0.54 : (H - (isPhone ? 215 : 168))) + st.offsets.lyric.y;
    c2.save();
    c2.textAlign = 'center';
    if (hasCustomBackdrop) { c2.shadowColor = 'rgba(0,0,0,0.65)'; c2.shadowBlur = 16; }
    if (custom) {
      c2.fillStyle = ink;
      c2.font = '600 38px "Noto Serif SC", serif';
      c2.fillText(`「${custom}」`, tx, ty);
      c2.fillStyle = subInk;
      c2.font = '500 21px Jost, sans-serif';
      c2.fillText('EXOPLANET · WE ARE ONE', tx, ty + 48);
    } else {
      c2.fillStyle = ink;
      c2.font = '500 32px "Noto Serif SC", serif';
      c2.fillText(ly.ko, tx, ty - 14);
      c2.fillStyle = light ? '#2c344d' : 'rgba(246,247,251,0.92)';
      c2.font = '400 26px "Noto Serif SC", serif';
      c2.fillText(`「${ly.zh}」`, tx, ty + 32);
      c2.fillStyle = subInk;
      c2.font = '500 19px Jost, sans-serif';
      c2.fillText(ly.src, tx, ty + 74);
    }
    nextHits.lyric = { x: tx - 300, y: ty - 52, w: 600, h: 142, label: '拖拽移动双语歌词签' };
    hitBoxes = nextHits;

    c2.shadowBlur = 0;
    c2.fillStyle = subInk;
    c2.font = '400 17px Jost, sans-serif';
    const creditTxt = st.customImg
      ? 'EXO 星球 DIY 壁纸 · 用户自定义底图创作（本地生成）'
      : st.subject === 'portrait'
        ? 'EXO 星球 DIY 壁纸 · Photo © SM Entertainment'
        : 'EXO 星球 DIY 壁纸 · 官娃简笔画重绘 & 成员姓名印记';
    c2.fillText(creditTxt, W / 2, H - pad - 18);
    c2.restore();

    // 6. Lockscreen Clock Safe-Zone + Interactive Hover Guide (preview ONLY, hidden on PNG export!)
    if (!forExport) {
      if (st.clockGuide && isPhone) {
        c2.save();
        c2.fillStyle = light ? 'rgba(17,22,37,0.34)' : 'rgba(255,255,255,0.46)';
        c2.textAlign = 'center';
        c2.font = '600 26px "PingFang SC", sans-serif';
        c2.fillText('4月8日 星期日 · 锁屏时间预览（导出自动隐藏）', W / 2, 168);
        c2.font = '700 168px "Schibsted Grotesk", Jost, sans-serif';
        c2.fillText('04:08', W / 2, 330);
        c2.strokeStyle = light ? 'rgba(30,63,122,0.25)' : 'rgba(255,255,255,0.28)';
        c2.setLineDash([8, 8]);
        c2.strokeRect(140, 118, W - 280, 246);
        c2.restore();
      }
      const activeKey = dragState?.layer || hoverLayer;
      if (activeKey && hitBoxes[activeKey] && activeKey !== 'photo') {
        drawSelectionBox(hitBoxes[activeKey], hitBoxes[activeKey].label);
      }
    }
  }

  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      render({ forExport: false });
    });
  }

  function syncUI() {
    $$('[data-wp-m]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wpM === st.member)));
    $$('[data-wp-subj]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wpSubj === st.subject)));
    $$('[data-wp-bg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wpBg === st.bg)));
    $$('[data-wp-ratio]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wpRatio === st.ratio)));
    $$('[data-wp-cmode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.wpCmode === st.customMode)));

    const pChk = $('#wp-chk-plush'); if (pChk) pChk.checked = st.plushSticker;
    const aChk = $('#wp-chk-astro'); if (aChk) aChk.checked = st.astrolabe;
    const sChk = $('#wp-chk-seal'); if (sChk) sChk.checked = st.sigilSeal;
    const cChk = $('#wp-chk-clock'); if (cChk) { cChk.checked = st.clockGuide; cChk.disabled = st.ratio !== '9:16'; }

    const hasCustom = !!st.customImg;
    if (clearImgBtn) clearImgBtn.hidden = !hasCustom;
    if (cModeWrap) cModeWrap.hidden = !hasCustom;
    if (dimWrap) dimWrap.hidden = !(hasCustom && st.bg === 'custom' && st.customMode === 'backdrop');
    if (dropEl) {
      dropEl.classList.toggle('has-file', hasCustom);
      $('#wp-drop-title', dropEl).textContent = hasCustom
        ? `已载入自定义图片：${st.customImgName || '本地照片'}`
        : '拖拽自己的图片到这里 / 右侧画布，或点击上传底图';
      $('#wp-drop-sub', dropEl).textContent = hasCustom
        ? '可在右侧壁纸直接拖拽调整构图与贴纸位置，或点击更换其他照片'
        : '支持 JPG / PNG / WebP，也可直接 Ctrl/⌘+V 粘贴演唱会神图或自拍（纯本地处理不上传服务器）';
    }
    renderLookPicks();
    render({ forExport: false });
  }

  // Handle Custom Image File Loading (from Drop / Input / Paste)
  function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      toast('请拖入 JPG / PNG / WebP 格式的图片文件');
      return;
    }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      if (st._customBlobUrl) URL.revokeObjectURL(st._customBlobUrl);
      st._customBlobUrl = url;
      st.customImg = im;
      st.customImgName = file.name || '粘贴的图片';
      if (st.bg !== 'custom') st.prevPresetBg = st.bg;
      st.customMode = 'backdrop';
      st.bg = 'custom';
      st.subject = 'portrait';
      st.panX = 0; st.panY = 0; st.zoom = 1;
      if (zoomIn) zoomIn.value = '100';
      if (zoomVal) zoomVal.textContent = '100%';
      syncUI();
      toast('自定义底图已载入！可直接在画布上拖拽平移、滚轮缩放');
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      toast('图片读取失败，请换一张图片重试');
    };
    im.src = url;
  }

  // Wire File Input, Dropzone, Canvas Drop, and Paste
  if (dropEl && fileIn) {
    dropEl.addEventListener('click', e => {
      if (e.target.closest('#wp-clear-img')) return;
      fileIn.click();
    });
    dropEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileIn.click(); }
    });
    fileIn.addEventListener('change', () => {
      if (fileIn.files?.[0]) handleImageFile(fileIn.files[0]);
      fileIn.value = '';
    });
  }
  clearImgBtn?.addEventListener('click', e => {
    e.stopPropagation();
    if (st._customBlobUrl) URL.revokeObjectURL(st._customBlobUrl);
    st._customBlobUrl = null;
    st.customImg = null;
    st.customImgName = '';
    if (st.bg === 'custom') st.bg = st.prevPresetBg || 'paper';
    st.panX = 0; st.panY = 0; st.zoom = 1;
    if (zoomIn) zoomIn.value = '100';
    if (zoomVal) zoomVal.textContent = '100%';
    syncUI();
    toast('已清除自定义底图，恢复预设底纸');
  });

  for (const target of [dropEl, cardWrap].filter(Boolean)) {
    target.addEventListener('dragenter', e => { e.preventDefault(); target.classList.add('is-dragover'); });
    target.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; target.classList.add('is-dragover'); });
    target.addEventListener('dragleave', e => {
      if (!target.contains(e.relatedTarget)) target.classList.remove('is-dragover');
    });
    target.addEventListener('drop', e => {
      e.preventDefault();
      target.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleImageFile(file);
    });
  }

  window.addEventListener('paste', e => {
    const makerSec = $('#maker');
    if (!makerSec) return;
    const r = makerSec.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const items = [...(e.clipboardData?.items || [])];
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (imgItem) {
      const f = imgItem.getAsFile();
      if (f) handleImageFile(f);
    }
  });

  // Direct On-Canvas Layer Hit-Testing & Smooth Pointer Dragging
  function toCanvasCoords(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / Math.max(1, r.width)) * canvas.width,
      y: ((e.clientY - r.top) / Math.max(1, r.height)) * canvas.height,
    };
  }

  function hitTestLayer(pt) {
    // Check foreground movable elements first (lyric -> seal -> sticker -> photo)
    for (const key of ['sticker', 'seal', 'lyric', 'photo']) {
      const b = hitBoxes[key];
      if (b && pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y && pt.y <= b.y + b.h) {
        return key;
      }
    }
    return null;
  }

  const onMove = e => {
    if (!dragState) return;
    const pt = toCanvasCoords(e);
    const dx = pt.x - dragState.sx;
    const dy = pt.y - dragState.sy;
    if (dragState.layer === 'photo') {
      st.panX = dragState.ox + dx;
      st.panY = dragState.oy + dy;
    } else if (st.offsets[dragState.layer]) {
      st.offsets[dragState.layer].x = clamp(dragState.ox + dx, -canvas.width * 0.46, canvas.width * 0.46);
      st.offsets[dragState.layer].y = clamp(dragState.oy + dy, -canvas.height * 0.46, canvas.height * 0.46);
    }
    requestRender();
  };

  canvas.addEventListener('pointermove', e => {
    if (dragState) { onMove(e); return; }
    if (e.pointerType === 'mouse') {
      const pt = toCanvasCoords(e);
      const hit = hitTestLayer(pt);
      if (hit !== hoverLayer) {
        hoverLayer = hit;
        canvas.style.cursor = hit ? 'grab' : 'default';
        if (dragHint && hit && hitBoxes[hit]) {
          dragHint.textContent = `当前指向：${hitBoxes[hit].label}（按住鼠标即可自由拖动）`;
        } else if (dragHint) {
          dragHint.textContent = '可直接在壁纸上拖拽移动：底图构图 · 官娃贴纸 · 超能力印章 · 歌词签（滚轮缩放）';
        }
        requestRender();
      }
    }
  });
  window.addEventListener('pointermove', e => { if (dragState) onMove(e); }, { passive: true });

  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const pt = toCanvasCoords(e);
    const layer = hitTestLayer(pt);
    if (!layer) return;
    e.preventDefault();
    const origin = layer === 'photo'
      ? { ox: st.panX, oy: st.panY }
      : { ox: st.offsets[layer].x, oy: st.offsets[layer].y };
    dragState = { id: e.pointerId, layer, sx: pt.x, sy: pt.y, ...origin };
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    canvas.style.cursor = 'grabbing';
    requestRender();
  });

  const endDrag = () => {
    if (!dragState) return;
    dragState = null;
    canvas.style.cursor = hoverLayer ? 'grab' : 'default';
    requestRender();
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => {
    if (!dragState && hoverLayer) {
      hoverLayer = null;
      requestRender();
    }
  });

  // Wheel to zoom photo smoothly when hovering wallpaper preview
  canvas.addEventListener('wheel', e => {
    if (st.subject !== 'portrait' && !st.customImg) return;
    e.preventDefault();
    const nextZ = clamp(st.zoom + (e.deltaY < 0 ? 0.08 : -0.08), 1, 2.4);
    if (nextZ !== st.zoom) {
      st.zoom = nextZ;
      const pct = Math.round(st.zoom * 100);
      if (zoomIn) zoomIn.value = String(pct);
      if (zoomVal) zoomVal.textContent = `${pct}%`;
      requestRender();
    }
  }, { passive: false });

  // Panel controls
  const host = $('#wp-panel');
  if (host) {
    host.addEventListener('click', e => {
      const mBtn = e.target.closest('[data-wp-m]');
      if (mBtn) { st.member = mBtn.dataset.wpM; st.lookIdx = 0; store.set('exo-wp-member', st.member); syncUI(); return; }
      const lkBtn = e.target.closest('[data-wp-look]');
      if (lkBtn) { st.lookIdx = +lkBtn.dataset.wpLook; syncUI(); return; }
      const sBtn = e.target.closest('[data-wp-subj]');
      if (sBtn) { st.subject = sBtn.dataset.wpSubj; store.set('exo-wp-subject', st.subject); syncUI(); return; }
      const bgBtn = e.target.closest('[data-wp-bg]');
      if (bgBtn) {
        const nextBg = bgBtn.dataset.wpBg;
        if (nextBg === 'custom' && !st.customImg) {
          fileIn?.click();
          return;
        }
        if (nextBg !== 'custom') st.prevPresetBg = nextBg;
        st.bg = nextBg;
        if (nextBg !== 'custom') store.set('exo-wp-bg', st.bg);
        syncUI();
        return;
      }
      const cmBtn = e.target.closest('[data-wp-cmode]');
      if (cmBtn) {
        st.customMode = cmBtn.dataset.wpCmode;
        if (st.customMode === 'frame' && st.bg === 'custom') st.bg = st.prevPresetBg || 'paper';
        if (st.customMode === 'backdrop' && st.customImg) st.bg = 'custom';
        syncUI();
        return;
      }
      const rBtn = e.target.closest('[data-wp-ratio]');
      if (rBtn) { st.ratio = rBtn.dataset.wpRatio; store.set('exo-wp-ratio', st.ratio); syncUI(); return; }
    });
  }

  zoomIn?.addEventListener('input', e => {
    st.zoom = (+e.target.value) / 100;
    if (zoomVal) zoomVal.textContent = `${e.target.value}%`;
    requestRender();
  });
  dimIn?.addEventListener('input', e => {
    st.dim = (+e.target.value) / 100;
    if (dimVal) dimVal.textContent = `${e.target.value}%`;
    requestRender();
  });
  $('#wp-reset-pos')?.addEventListener('click', () => {
    resetPositions();
    requestRender();
    toast('壁纸元素与底图构图已复位居中');
  });

  $('#wp-lyric-sel')?.addEventListener('change', e => { st.lyricIdx = +e.target.value; st.customText = ''; const inp = $('#wp-custom'); if (inp) inp.value = ''; requestRender(); });
  $('#wp-custom')?.addEventListener('input', e => { st.customText = e.target.value.slice(0, 24); requestRender(); });
  $('#wp-chk-plush')?.addEventListener('change', e => { st.plushSticker = e.target.checked; requestRender(); });
  $('#wp-chk-astro')?.addEventListener('change', e => { st.astrolabe = e.target.checked; requestRender(); });
  $('#wp-chk-seal')?.addEventListener('change', e => { st.sigilSeal = e.target.checked; requestRender(); });
  $('#wp-chk-clock')?.addEventListener('change', e => { st.clockGuide = e.target.checked; requestRender(); });

  $('#wp-random')?.addEventListener('click', () => {
    const ms = ctx.members.map(x => x.id);
    st.member = ms[Math.floor(Math.random() * ms.length)];
    const gal = getMemberGallery(ctx.byId[st.member]);
    st.lookIdx = Math.floor(Math.random() * Math.max(1, gal.length));
    st.subject = ['portrait', 'plush', 'family'][Math.floor(Math.random() * 3)];
    if (!st.customImg) st.bg = ['paper', 'galaxy', 'aurora', 'noir'][Math.floor(Math.random() * 4)];
    st.lyricIdx = Math.floor(Math.random() * PRESET_LYRICS.length);
    if (lyricSel) lyricSel.value = String(st.lyricIdx);
    resetPositions();
    syncUI();
    toast('已随机切换一套星球壁纸灵感配方');
  });

  $('#wp-save')?.addEventListener('click', async () => {
    await render({ forExport: true });
    presentExportModal(canvas, {
      title: `EXO 星球 DIY 壁纸 · ${st.ratio}`,
      filename: `exoplanet-wallpaper-${st.member}-${st.ratio.replace(':', 'x')}.png`,
      hint: '辅助线与选中框已在导出图中自动隐藏',
    });
    if (document.getElementById('toast')) toast('高清壁纸已生成，可下载或长按保存');
    render({ forExport: false });
  });

  const studioSec = $('#maker');
  if (studioSec) {
    studioSec.addEventListener('click', e => {
      const tab = e.target.closest('[data-studio-tab]');
      if (!tab) return;
      const k = tab.dataset.studioTab;
      $$('[data-studio-tab]', studioSec).forEach(b => {
        b.setAttribute('aria-selected', String(b === tab));
        b.setAttribute('aria-pressed', String(b === tab));
      });
      $$('[data-studio-pane]', studioSec).forEach(p => { p.hidden = p.dataset.studioPane !== k; });
      if (k === 'wallpaper') render({ forExport: false });
    });
  }

  (document.fonts?.ready || Promise.resolve()).then(() => syncUI());

  return {
    pickPlushMember(id) {
      if (!ctx.byId[id]) return;
      st.member = id;
      st.subject = 'plush';
      const wpTab = $('[data-studio-tab="wallpaper"]');
      wpTab?.click();
      syncUI();
    }
  };
}
