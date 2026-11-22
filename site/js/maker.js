/* L 卡 · 认证卡 — from the old 刊物 site. Pick a bias and the song you started with; the card is drawn
   on a canvas over a still of that member's power universe, and can be saved or shared. */
import { $, $$, esc, glyph, todayStr, dayDiff, store, toast } from './util.js';
import { createUniverse } from './universe.js';
import { CARD_URL, STRIP_H, drawShareStrip, sizePicker, wrapLines, presentExportModal } from './share.js'; /* share */
import { cardBadge } from './checkin.js';

export function initMaker(ctx) {
  const canvas = $('#card'); if (!canvas) return;
  const c2 = canvas.getContext('2d'), songs = ctx.archive?.songs || [], debut = ctx.archive?.debut || ctx.meta.debut;
  const picks = $('#mk-picks'), sel = $('#mk-era'), q = $('#mk-song-q'), dl = $('#mk-song-list'), nameIn = $('#mk-name'), dateIn = $('#mk-date');
  dateIn.max = todayStr();

  picks.innerHTML = ctx.members.map(m => `<button type="button" class="pick" data-pick="${m.id}" aria-pressed="false" style="--mc:${m.color}">${glyph(m.id)}<span>${esc(m.en)}</span></button>`).join('');
  const groups = [...new Set(songs.map(s => s.u))];
  sel.innerHTML = groups.map(g => `<optgroup label="${esc(g)}">${songs.map((s, i) => s.u === g ? `<option value="${i}">${esc(s.title)} · ${s.date.slice(0, 4)}</option>` : '').join('')}</optgroup>`).join('');
  const labels = songs.map(s => `${s.title} · ${s.u} · ${s.date.slice(0, 4)}`);
  dl.innerHTML = labels.map(l => `<option value="${esc(l)}">`).join('');

  const fromUrl = new URLSearchParams(location.search).get('card');
  let member = ctx.byId[fromUrl] ? fromUrl : store.get('exo-card-member', null) || ctx.members[0].id;
  if (!ctx.byId[member]) member = ctx.members[0].id;
  sel.value = store.get('exo-card-song', '0');

  // When linked via ?card=<id> (index.html#maker or studio.html?card=<id>), activate the L-card tab/pane automatically.
  if (fromUrl && ctx.byId[fromUrl]) {
    const studioSec = $('#maker') || canvas.closest('[data-studio-pane]')?.closest('section') || document;
    const tabs = $$('[data-studio-tab]', studioSec);
    if (tabs.length) {
      tabs.forEach(b => {
        const on = b.dataset.studioTab === 'card';
        b.setAttribute('aria-selected', String(on));
        b.setAttribute('aria-pressed', String(on));
      });
      $$('[data-studio-pane]', studioSec).forEach(p => { p.hidden = p.dataset.studioPane !== 'card'; });
    } else {
      const ownPane = canvas.closest('[data-studio-pane]');
      if (ownPane) ownPane.hidden = false;
      const cardSec = canvas.closest('section');
      if (cardSec?.id === 'card' && !location.hash) {
        requestAnimationFrame(() => cardSec.scrollIntoView?.({ block: 'start' }));
      }
    }
  }

  const sizer = sizePicker({ key: 'exo-card-size', def: '4:5', keys: ['4:5', '3:4', '1:1', '9:16'], host: $('#mk-save').parentElement, before: $('#mk-save'), onChange: () => draw() }); /* share */
  let uni = null, uCanvas = null; const cache = {};
  const load = src => cache[src] ||= new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  const fmt = n => n.toLocaleString('en-US');

  async function draw() {
    const m = ctx.byId[member], song = songs[+sel.value] || songs[0];
    $$('[data-pick]', picks).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pick === m.id)));
    ($('#mk-save').closest('.studio') || $('.studio')).style.setProperty('--mc', m.color);
    /* share:begin — size comes from the picker; layout re-flows per size (side / stack / square) */
    const [W, H] = sizer.dims(), X = 72, R = W - 72, mode = W === H ? 'square' : H / W > 1.5 ? 'stack' : 'side', stripTop = H - STRIP_H;
    canvas.width = W; canvas.height = H; canvas.parentElement.style.setProperty('--ar', W / H);
    /* share:end */
    if (!uCanvas) { uCanvas = document.createElement('canvas'); uCanvas.style.cssText = 'position:fixed;left:-20000px;top:0;width:540px;height:675px'; document.body.append(uCanvas); try { uni = createUniverse(uCanvas, { reduced: true, fixedScale: 2 }); } catch { uni = null; } }
    uCanvas.style.height = `${Math.round(540 * H / W)}px`; /* share: keep the backdrop's aspect */
    c2.fillStyle = '#11152a'; c2.fillRect(0, 0, W, H);
    if (uni?.renderOnce) { uni.renderOnce(m.scene, 11.7); c2.drawImage(uCanvas, 0, 0, W, H); }
    c2.fillStyle = 'rgba(10,12,26,.38)'; c2.fillRect(0, 0, W, H);
    const ink = '#fff8e7', soft = 'rgba(255,248,231,.72)';
    const F = (w, px) => `${w} ${px}px "Schibsted Grotesk", Jost, "PingFang SC", sans-serif`;
    const fit = (t, w, max, wt = 900) => { c2.font = F(wt, 100); return Math.min(max, w / c2.measureText(t).width * 100); };
    c2.textBaseline = 'alphabetic'; c2.textAlign = 'left';
    const fs = fit('EXO-L', R - X, mode === 'square' ? 210 : 400); c2.font = F(900, fs); if ('letterSpacing' in c2) c2.letterSpacing = `${-0.03 * fs}px`;
    const base1 = 64 + c2.measureText('E').actualBoundingBoxAscent, wExo = c2.measureText('EXO-').width;
    c2.fillStyle = ink; c2.fillText('EXO-', X, base1); c2.fillStyle = m.color; c2.fillText('L', X + wExo, base1);
    if ('letterSpacing' in c2) c2.letterSpacing = '0px';
    /* share:begin */
    const top2 = base1 + (mode === 'square' ? 40 : 56), sqD = mode === 'square';
    const dfs = sqD ? 120 : 176, dln = sqD ? 32 : 38, dY = dfs * 0.73;
    const song0 = `从《${song.title}》（${song.date.slice(0, 4)}）开始做 EXO-L`;
    const colW0 = sqD ? W - X * 2 - 400 - 40 : R - X;
    c2.font = F(700, dln); const dLines = wrapLines(c2, song0, colW0), dH = dY + (sqD ? 46 : 68) + (dLines.length - 1) * dln * 1.3 + (sqD ? 50 : 56) + 14;
    const top3 = sqD ? top2 + 350 : stripTop - dH - 6;
    const pw = mode === 'stack' ? R - X : sqD ? 400 : 456, px = mode === 'stack' ? X : R - pw;
    const ph = Math.max(300, mode === 'side' ? top3 - 70 - top2 : mode === 'stack' ? top3 - 50 - 313 - 36 - top2 : stripTop - top2 - 20);
    const ty = mode === 'stack' ? top2 + ph + 36 : top2, colW = mode === 'stack' ? R - X - 170 : px - X - 40;
    const gs = sqD ? 90 : 150, gx = mode === 'stack' ? R - gs : sqD ? X - 6 : X - 6, gy = mode === 'stack' ? ty + 90 : sqD ? stripTop - gs - 14 : top2 + ph - gs;
    /* share:end */
    const img = await load(m.photo);
    if (img) { const s = Math.max(pw / img.width, ph / img.height), iw = img.width * s, ih = img.height * s; c2.save(); c2.beginPath(); c2.rect(px, top2, pw, ph); c2.clip(); c2.drawImage(img, px + (pw - iw) / 2, top2 + (ph - ih) * 0.2, iw, ih); c2.restore(); c2.fillStyle = m.color; c2.fillRect(px, top2 + ph, pw, 10); }
    c2.fillStyle = soft; c2.font = F(600, 30); c2.fillText(['本命', cardBadge()].filter(Boolean).join(' · '), X, ty + 34);
    const nfs = fit(m.en, colW, 128); c2.fillStyle = ink; c2.font = F(900, nfs); c2.fillText(m.en, X, ty + 58 + nfs * 0.74);
    let y = ty + 58 + nfs * 0.74 + 66;
    c2.fillStyle = m.color; c2.font = F(800, 44); c2.fillText(`${m.power.zh} · ${m.power.en}`, X, y);
    y += 52; c2.fillStyle = soft; c2.font = F(500, 30); c2.fillText(m.zh, X, y); y += 42; c2.fillText(m.ko, X, y);
    const sym = document.getElementById(`g-${m.id}`);
    if (sym) { const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${gs}" height="${gs}" style="color:${m.color}" fill="none" stroke="${m.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${sym.innerHTML}</svg>`;
      const gi = await load('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); if (gi) c2.drawImage(gi, gx, gy, gs, gs); }
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateIn.value) && dateIn.value <= todayStr() && Number.isFinite(dayDiff(todayStr(), dateIn.value));
    const days = validDate ? dayDiff(todayStr(), dateIn.value) + 1 : null;
    $('#mk-days-line').textContent = days === null ? '未填写入坑日期，不计算天数' : `已经是 EXO-L 第 ${fmt(days)} 天`;
    c2.fillStyle = ink; c2.font = F(900, dfs); const dT = days === null ? '—' : fmt(days); c2.fillText(dT, X - 6, top3 + dY);
    const dW = c2.measureText(dT).width; c2.font = F(800, dfs * 0.3); if (days !== null) c2.fillText('天', X + dW + 10, top3 + dY);
    c2.font = F(700, dln); let ly = top3 + dY + (sqD ? 46 : 68); dLines.forEach((l, i) => c2.fillText(l, X, ly + i * dln * 1.3)); ly += (dLines.length - 1) * dln * 1.3 + (sqD ? 50 : 56);
    const name = (nameIn.value || '').trim().slice(0, 16) || 'EXO-L';
    c2.fillStyle = m.color; c2.font = F(800, dln); c2.fillText(name, X, ly);
    c2.fillStyle = soft; c2.font = F(600, dln); c2.fillText(' 的认证卡 · WE ARE ONE', X + c2.measureText(name).width, ly);
    /* share:begin — bottom strip with QR + URL, credit kept */
    const t = todayStr();
    drawShareStrip(c2, { H, x0: X, x1: R, url: CARD_URL, ink, soft: 'rgba(255,248,231,.62)', dark: '#11152a', light: '#fff8e7', font: F, lines: [`${t.replace(/-/g, '.')} · EXO 出道第 ${fmt(dayDiff(t, debut))} 天`, 'Photo © SM Entertainment'] });
    /* share:end */
  }

  picks.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (!b) return; member = b.dataset.pick; store.set('exo-card-member', member); draw(); });
  sel.addEventListener('change', () => { store.set('exo-card-song', sel.value); draw(); });
  q.addEventListener('change', () => { const i = labels.indexOf(q.value); if (i >= 0) { sel.value = String(i); store.set('exo-card-song', sel.value); draw(); } });
  nameIn.addEventListener('input', draw);
  dateIn.addEventListener('input', () => {
    const invalid = !!dateIn.value && dateIn.value > todayStr();
    $('#mk-date-error').hidden = !invalid;
    dateIn.setAttribute('aria-invalid', String(invalid));
    $('#mk-save').disabled = invalid;
    $('#mk-share').disabled = invalid;
    draw();
  });
  $('#mk-save').addEventListener('click', () => {
    presentExportModal(canvas, { title: 'EXO-L 入坑纪念卡', filename: 'exo-l-card.png' });
    if (document.getElementById('toast')) toast('纪念卡已生成，可下载或长按保存');
  });
  const share = $('#mk-share');
  if (navigator.canShare) share.hidden = false;
  share.addEventListener('click', () => canvas.toBlob(async b => { const f = new File([b], 'exo-l-card.png', { type: 'image/png' }); try { if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'EXO-L 认证卡' }); } catch {} }, 'image/png'));

  (document.fonts?.ready || Promise.resolve()).then(draw);
}
