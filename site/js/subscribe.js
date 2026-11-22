/* 订阅日历：弹窗给出 webcal 订阅（Apple/Outlook）、Google 日历、下载 .ics、复制链接。
   数据由 tools/build.mjs 生成：cal/exo.ics（全站行程）、cal/<成员id>.ics（单人日程）。 */
import { toast } from './util.js';
import { SITE } from './share.js';

const TITLES = { exo: 'EXO 星球 · 行程', member: '单人日程' };

function ensureDialog() {
  let d = document.getElementById('subscribe-dlg');
  if (d) return d;
  d = document.createElement('dialog');
  d.id = 'subscribe-dlg';
  d.className = 'subdlg';
  d.setAttribute('aria-labelledby', 'subdlg-h');
  d.innerHTML = `
    <form method="dialog" class="subdlg__box">
      <button class="subdlg__x" type="submit" aria-label="关闭">×</button>
      <p class="kicker">SUBSCRIBE · 订阅日历</p>
      <h3 class="subdlg__h" id="subdlg-h"></h3>
      <p class="subdlg__lead">订阅后，行程与生日会自动出现在你的日历里，之后更新也会同步（约每 6 小时刷新一次）。</p>
      <div class="subdlg__list">
        <a class="cbtn" data-sub="apple" href="#">Apple 日历 / Outlook 订阅</a>
        <a class="cbtn cbtn--ghost" data-sub="google" href="#" target="_blank" rel="noopener">Google 日历</a>
        <a class="cbtn cbtn--ghost" data-sub="file" href="#" download>下载 .ics 文件</a>
        <button class="cbtn cbtn--ghost" type="button" data-sub="copy">复制订阅链接</button>
      </div>
      <p class="subdlg__note">安卓的部分日历 App 不支持订阅链接，可用「下载 .ics」一次性导入。活动时间以官方公告为准。</p>
    </form>`;
  document.body.append(d);
  return d;
}

export function openSubscribe(kind = 'exo', memberId = '', title = '') {
  const file = kind === 'member' && memberId ? `${memberId}.ics` : 'exo.ics';
  const https = `${SITE}/cal/${file}`;
  const d = ensureDialog();
  d.querySelector('#subdlg-h').textContent = title || TITLES[kind === 'member' ? 'member' : 'exo'];
  d.querySelector('[data-sub="apple"]').href = https.replace(/^https:/, 'webcal:');
  d.querySelector('[data-sub="google"]').href = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(https)}`;
  d.querySelector('[data-sub="file"]').href = `/cal/${file}`;
  const copy = d.querySelector('[data-sub="copy"]');
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText(https); }
    catch { const t = document.createElement('textarea'); t.value = https; t.style.cssText = 'position:fixed;opacity:0'; document.body.append(t); t.select(); try { document.execCommand('copy'); } catch {} t.remove(); }
    toast('订阅链接已复制');
  };
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}

/* data-subscribe="exo" 或 data-subscribe="member" data-member-id="kai" */
export function initSubscribe() {
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-subscribe]');
    if (!b) return;
    e.preventDefault();
    openSubscribe(b.dataset.subscribe, b.dataset.memberId || '', b.dataset.title || '');
  });
}
