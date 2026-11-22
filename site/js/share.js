/* Sharing helpers: QR strip for exported images, export-size picker, member share button.
   QR encoding is kazuhikoarase's qrcode-generator (MIT, site/vendor/qrcode.mjs). */
import qrcode from '../vendor/qrcode.mjs';
import { store, toast, esc, overlay } from './util.js';

const notify = msg => { if (document.getElementById('toast')) toast(msg); };

export const SITE = 'https://www.exolneverland.com';
export const CARD_URL = `${SITE}/?from=lcard`;
export const COVER_URL = `${SITE}/?from=cover`;
export const memberUrl = id => `${SITE}/m/${id}/?from=share`;

/* export sizes: [width, height, label] */
export const SIZES = {
  '4:5': [1080, 1350, '4:5'],
  '3:4': [1080, 1440, '3:4 小红书'],
  '1:1': [1080, 1080, '1:1 朋友圈'],
  '9:16': [1080, 1920, '9:16 壁纸'],
};

/* QR: dark modules on a light plate, `mod` px per module, 2-module quiet zone included in the plate.
   Returns the plate size in px. */
const qrcodeCount = url => { const q = qrcode(0, 'M'); q.addData(url); q.make(); return q.getModuleCount(); };
export function drawQR(c, url, x, y, mod, { dark = '#111', light = '#fff', quiet = 2, radius = 0 } = {}) {
  const q = qrcode(0, 'M'); q.addData(url); q.make();
  const n = q.getModuleCount(), size = (n + quiet * 2) * mod;
  c.save(); c.fillStyle = light;
  if (radius && c.roundRect) { c.beginPath(); c.roundRect(x, y, size, size, radius); c.fill(); } else c.fillRect(x, y, size, size);
  c.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) c.fillRect(x + (k + quiet) * mod, y + (r + quiet) * mod, mod, mod);
  c.restore(); return size;
}

/* word-wrap for CJK/latin mixed text */
export function wrapLines(c, text, maxW) {
  const out = []; let cur = '';
  for (const ch of String(text)) { if (c.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur); return out;
}

export const STRIP_H = 156;
/* Bottom strip: QR on the right, "exolneverland.com" + small lines on the left.
   Occupies y from H - STRIP_H to H, between x0 and x1. */
export function drawShareStrip(c, { H, x0, x1, url, lines = [], ink, soft, dark = '#111', light = '#fff', font }) {
  const mod = 4, pl = (qrcodeCount(url) + 4) * mod, plate = drawQR(c, url, x1 - pl, H - 24 - pl, mod, { dark, light, radius: 10 });
  const px = x1 - plate, base = H - 24 - 6;
  c.save(); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  const maxW = px - 28 - x0;
  const small = [...lines].reverse(); let y = base;
  c.fillStyle = soft; c.font = font(500, 22);
  for (const t of small) { c.fillText(fit(c, t, maxW), x0, y); y -= 32; }
  c.fillStyle = ink; c.font = font(700, 36); c.fillText('exolneverland.com', x0, y - 6);
  c.restore();
}
function fit(c, t, w) { if (c.measureText(t).width <= w) return t; while (t.length > 1 && c.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; }

/* size picker built on the existing .seg component; remembers the choice */
export function sizePicker({ key, def, keys, host, before, onChange }) {
  let cur = store.get(key, def); if (!keys.includes(cur)) cur = def;
  const el = document.createElement('div'); el.className = 'seg share-seg'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', '导出尺寸');
  el.innerHTML = keys.map(k => `<button type="button" data-size="${k}" aria-pressed="${k === cur}">${SIZES[k][2]}</button>`).join('');
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-size]'); if (!b || b.dataset.size === cur) return;
    cur = b.dataset.size; store.set(key, cur);
    el.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); onChange?.(cur);
  });
  host.insertBefore(el, before || null);
  return { get: () => cur, dims: () => SIZES[cur] };
}

/* member page: copy/share link */
export async function shareMember(m) {
  const url = memberUrl(m.id), title = `${m.en} ${m.zh} · EXO 星球`, text = `${m.en} 的超能力是「${m.power.zh}」`;
  if (navigator.share) { try { await navigator.share({ title, text, url }); } catch {} return; }
  try { await navigator.clipboard.writeText(url); }
  catch { const t = document.createElement('textarea'); t.value = url; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
  toast('专栏链接已复制');
}

/* Mobile / WeChat Convert-to-<img> PNG export modal: converts a rendered Canvas into a real <img>
   so iOS Safari & WeChat users can long-press to save, while desktop users get a direct <a download>. */
let exportModalState = null;

function closeExportModal() {
  if (!exportModalState || exportModalState.el.hidden) return;
  const st = exportModalState;
  st.el.hidden = true;
  document.removeEventListener('keydown', st.onKey, true);
  if (st.blobUrl) { URL.revokeObjectURL(st.blobUrl); st.blobUrl = ''; }
  document.documentElement.style.overflow = st.prevOverflow;
  if (!overlay.top()) overlay.lenis?.start?.();
  st.prevFocus?.focus?.({ preventScroll: true });
}

function ensureExportModal() {
  if (exportModalState) return exportModalState;
  const el = document.createElement('div');
  el.className = 'export-modal';
  el.id = 'export-modal';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'export-modal-title');
  el.hidden = true;
  el.innerHTML = `
    <div class="export-modal__scrim" data-export-close></div>
    <div class="export-modal__panel">
      <div class="export-modal__head">
        <div style="min-width:0">
          <h3 class="export-modal__title" id="export-modal-title"></h3>
          <span class="export-modal__meta" id="export-modal-meta"></span>
        </div>
        <button class="export-modal__x" type="button" data-export-close aria-label="关闭导出弹窗">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>
      <div class="export-modal__stage">
        <img class="export-modal__img" alt="">
      </div>
      <div class="export-modal__tip">
        <span>手机 / 微信端请直接长按上方图片保存至相册；桌面端可直接点下方下载</span>
        <span class="export-modal__hint" hidden></span>
      </div>
      <div class="export-modal__actions">
        <a class="cbtn export-modal__dl" download="exoplanet.png">下载高清 PNG ↓</a>
        <button class="cbtn cbtn--ghost export-modal__close" type="button" data-export-close>关闭</button>
      </div>
    </div>`;
  document.body.append(el);
  el.addEventListener('click', e => { if (e.target.closest('[data-export-close]')) closeExportModal(); });
  exportModalState = {
    el,
    titleEl: el.querySelector('#export-modal-title'),
    metaEl: el.querySelector('#export-modal-meta'),
    imgEl: el.querySelector('.export-modal__img'),
    hintEl: el.querySelector('.export-modal__hint'),
    dlEl: el.querySelector('.export-modal__dl'),
    blobUrl: '',
    renderId: 0,
    prevOverflow: '',
    prevFocus: null,
    onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); closeExportModal(); return;
      }
      if (e.key === 'Tab') {
        const focusables = [...el.querySelectorAll('a[href], button:not([disabled])')].filter(n => n.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    },
  };
  return exportModalState;
}

export function presentExportModal(canvas, { title = '高清图片已生成', filename = 'exoplanet.png', hint = '' } = {}) {
  if (!canvas || typeof canvas.toDataURL !== 'function') {
    notify('图片生成失败，请重试');
    return null;
  }
  let dataUrl = '';
  try { dataUrl = canvas.toDataURL('image/png'); } catch { notify('图片导出受限，请重试'); return null; }

  const st = ensureExportModal();
  const id = ++st.renderId;
  if (st.blobUrl) { URL.revokeObjectURL(st.blobUrl); st.blobUrl = ''; }

  st.titleEl.textContent = title;
  st.metaEl.textContent = `${canvas.width} × ${canvas.height} PNG · ${filename}`;
  st.imgEl.src = dataUrl;
  st.imgEl.alt = title;
  st.dlEl.href = dataUrl;
  st.dlEl.setAttribute('download', filename);
  if (hint) { st.hintEl.textContent = hint; st.hintEl.hidden = false; }
  else { st.hintEl.textContent = ''; st.hintEl.hidden = true; }

  if (typeof canvas.toBlob === 'function') {
    canvas.toBlob(blob => {
      if (!blob || st.renderId !== id || st.el.hidden) return;
      st.blobUrl = URL.createObjectURL(blob);
      st.dlEl.href = st.blobUrl;
    }, 'image/png');
  }

  if (st.el.hidden) {
    st.prevFocus = document.activeElement;
    st.prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    overlay.lenis?.stop?.();
    st.el.hidden = false;
    document.addEventListener('keydown', st.onKey, true);
  }
  requestAnimationFrame(() => st.dlEl.focus({ preventScroll: true }));
  return st.el;
}

/* member page: genuine Canvas PNG poster export (1080x1440) with portrait, emblem, factual status & QR strip */
export async function exportMemberPoster(m, { age, dd, worksCount = 0, photoSrc, photoEra = '' } = {}) {
  const W = 1080, H = 1440, X = 72, R = W - 72;
  const dark = document.documentElement.dataset.mode === 'galaxy';
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');

  const loadImg = src => new Promise(res => {
    if (!src) { res(null); return; }
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

  // 1. Background (Paper Observatory or Galaxy Observatory)
  if (dark) {
    c.fillStyle = '#070a16';
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W * 0.72, H * 0.28, 30, W * 0.72, H * 0.28, W * 0.8);
    g.addColorStop(0, (m.color || '#9eb6ff') + '38');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else {
    c.fillStyle = '#f2efe8';
    c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W * 0.75, H * 0.24, 30, W * 0.75, H * 0.24, W * 0.75);
    g.addColorStop(0, (m.color || '#1e3f7a') + '26');
    g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  const ink = dark ? '#f5f6fa' : '#111625';
  const sub = dark ? 'rgba(245,246,250,.72)' : 'rgba(17,22,37,.66)';
  const line = dark ? 'rgba(245,246,250,.16)' : 'rgba(17,22,37,.14)';
  const ac = dark ? (m.color || '#9eb6ff') : '#1e3f7a';
  const F = (w, px) => `${w} ${px}px "Schibsted Grotesk", Jost, "PingFang SC", sans-serif`;

  // Outer planetary frame + top rule
  c.strokeStyle = line; c.lineWidth = 2;
  c.strokeRect(42, 42, W - 84, H - 84);
  c.fillStyle = sub; c.font = F(600, 20); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillText(`EXOPLANET // PLANET ${m.no} OF 09`, X, 92);
  c.textAlign = 'right';
  c.fillText(`${m.power.en} · ${m.role}`, R, 92);
  c.beginPath(); c.moveTo(X, 114); c.lineTo(R, 114); c.stroke();

  // 2. Portrait frame on right, typography on left
  const phW = 456, phH = 576, px = R - phW, py = 148;
  const photo = await loadImg(photoSrc || m.photo2 || m.photo);
  c.save();
  c.fillStyle = dark ? '#11162a' : '#e6e2d8';
  c.fillRect(px, py, phW, phH);
  if (photo) {
    const sc = Math.max(phW / photo.width, phH / photo.height);
    const iw = photo.width * sc, ih = photo.height * sc;
    c.beginPath(); c.rect(px, py, phW, phH); c.clip();
    c.drawImage(photo, px + (phW - iw) / 2, py + (phH - ih) * 0.2, iw, ih);
  }
  c.restore();
  c.fillStyle = m.color || ac; c.fillRect(px, py + phH, phW, 8);

  // Left column: emblem + English name + Chinese/Korean + power + key stats
  const colW = px - X - 36;
  const sym = document.getElementById(`g-${m.id}`);
  if (sym) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96" style="color:${ac}" fill="none" stroke="${ac}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg>`;
    const gi = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
    if (gi) c.drawImage(gi, X, 152, 84, 84);
  }
  c.textAlign = 'left';
  c.fillStyle = ac; c.font = F(700, 26);
  c.fillText(`${m.power.zh} · ${m.power.en}`, X, 282);

  let nfs = 92;
  c.font = F(800, nfs);
  while (nfs > 46 && c.measureText(m.en).width > colW) { nfs -= 4; c.font = F(800, nfs); }
  c.fillStyle = ink; c.fillText(m.en, X, 294 + nfs);
  const afterName = 294 + nfs + 46;
  c.fillStyle = sub; c.font = F(500, 26);
  c.fillText(`${m.zh} · ${m.ko}`, X, afterName);
  c.font = F(400, 22);
  const powerLines = wrapLines(c, m.power.line || '', colW).slice(0, 5);
  powerLines.forEach((l, i) => c.fillText(l, X, afterName + 46 + i * 34));

  // Stat pills strip below hero block
  const statY = 768;
  c.strokeStyle = line;
  c.beginPath(); c.moveTo(X, statY); c.lineTo(R, statY); c.stroke();
  const stats = [
    ['出生日期', `${m.birth.replace(/-/g, '.')}${age ? `（${age} 岁）` : ''}`],
    ['距下次生日', dd === 0 ? '今天' : (Number.isFinite(dd) ? `D-${dd}` : '—')],
    ['代表作收录', `${worksCount} 项`],
  ];
  const sw = (R - X) / stats.length;
  stats.forEach(([k, v], i) => {
    const sx = X + i * sw;
    c.fillStyle = sub; c.font = F(600, 18); c.fillText(k, sx, statY + 38);
    c.fillStyle = i === 1 ? ac : ink; c.font = F(700, 30); c.fillText(v, sx, statY + 78);
  });
  c.beginPath(); c.moveTo(X, statY + 104); c.lineTo(R, statY + 104); c.stroke();

  // Current status & latest works block
  let curY = statY + 150;
  c.fillStyle = ac; c.font = F(700, 20); c.fillText('CURRENT STATUS · 近期动向', X, curY);
  curY += 38;
  c.fillStyle = ink; c.font = F(400, 25);
  const stLines = wrapLines(c, m.status || '', R - X).slice(0, 4);
  stLines.forEach(l => { c.fillText(l, X, curY); curY += 38; });
  if (m.latest) {
    curY += 16;
    c.fillStyle = sub; c.font = F(600, 20); c.fillText('近期发行与企划', X, curY);
    curY += 32;
    c.fillStyle = ink; c.font = F(500, 23);
    wrapLines(c, m.latest, R - X).slice(0, 2).forEach(l => { c.fillText(l, X, curY); curY += 34; });
  }

  // Bottom QR strip
  drawShareStrip(c, {
    H: H - 24, x0: X, x1: R, url: memberUrl(m.id),
    ink, soft: sub, dark: dark ? '#070a16' : '#111625', light: '#ffffff', font: F,
    lines: [`${m.en} ${m.zh} 单人专栏 · 扫码直达`, `${photoEra ? photoEra + ' · ' : ''}Photo © SM Entertainment`],
  });

  const filename = `exoplanet-${m.id}-poster.png`;
  presentExportModal(canvas, {
    title: `${m.en} ${m.zh} · 专栏海报`,
    filename,
    hint: '1080×1440 高清 PNG · 含成员图腾与专栏二维码',
  });
  notify(`已导出 ${m.en} 高清专栏海报（1080×1440 PNG）`);

  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve({ width: W, height: H, bytes: blob?.size || 0 });
    }, 'image/png');
  });
}
