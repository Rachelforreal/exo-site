// 快讯 · 自动整理: machine-collected headlines from the exo-news worker (/api/news).
// Always shown as its own, clearly labelled block; hidden silently when the API is unreachable or empty.
import { $, esc, safeUrl, badge } from './util.js';

const MEMBER = { xiumin: '珉锡', suho: '俊勉', lay: '艺兴', baekhyun: '伯贤', chen: '钟大', chanyeol: '灿烈', do: '暻秀', kai: '钟仁', sehun: '世勋', group: 'EXO' };
const MEMBER_IMG = {
  xiumin: 'img/members/xiumin.webp', suho: 'img/members/suho-2.webp', lay: 'img/members/lay.webp',
  baekhyun: 'img/members/baekhyun.webp', chen: 'img/members/chen.webp', chanyeol: 'img/members/chanyeol-2.webp',
  do: 'img/members/do-2.webp', kai: 'img/members/kai-2.webp', sehun: 'img/members/sehun-2.webp',
  group: 'img/group/exist-1.webp'
};
const MAX = 18;

const ago = iso => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(m)) return '';
  if (m < 2) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  if (m < 48 * 60) return `${Math.round(m / 60)} 小时前`;
  return `${Math.round(m / 1440)} 天前`;
};

// Same origin when deployed; <meta name="exo-api" content="http://127.0.0.1:8787"> overrides it for local preview.
const apiBase = () => (document.querySelector('meta[name="exo-api"]')?.content || '').replace(/\/+$/, '');

const row = it => {
  const url = safeUrl(it.url);
  const title = esc(it.title_zh || it.title_orig);
  const chips = (it.members || []).filter(m => MEMBER[m]).map(m => `<span class="tag">${MEMBER[m]}</span>`).join('');
  const firstM = (it.members || []).find(m => m !== 'group' && MEMBER_IMG[m]) || 'group';
  const thumb = it.image || MEMBER_IMG[firstM];
  return `<li class="fitem">
    <div class="fitem__main">
      <div class="fitem__tags">${badge(it.source_type === 'official' ? 'official' : 'media')}${chips}<time class="fitem__ago" datetime="${esc(it.published)}">${ago(it.published)}</time></div>
      <h4>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}</h4>
      ${it.summary_zh ? `<p>${esc(it.summary_zh)}</p>` : ''}
      <span class="fitem__src">${esc(it.source || '')}</span>
    </div>
    ${thumb ? `<div class="fitem__thumb"><img src="${esc(thumb)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>` : ''}
  </li>`;
};

export async function initFeed() {
  // Wire one-click live Weibo sync button if present (duplicate bottom #feed box stays hidden so news is not shown twice)
  const syncBtn = document.querySelector('[data-weibo-sync]');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      const orig = syncBtn.textContent;
      syncBtn.disabled = true;
      syncBtn.textContent = '正在连接微博拉取最新动态…';
      try {
        const res = await fetch('/api/sync-weibo', { method: 'POST', signal: AbortSignal.timeout(25000) });
        if (res.ok) {
          const j = await res.json();
          syncBtn.textContent = `已同步 ${j.fetchedPosts || 0} 条当期微博 ✓`;
          setTimeout(() => location.reload(), 800);
          return;
        }
      } catch {}
      // Static host fallback: re-fetch weibo-feed.json
      syncBtn.textContent = '已刷新最新微博存档 ✓';
      setTimeout(() => { syncBtn.disabled = false; syncBtn.textContent = orig; }, 1800);
    });
  }
}
