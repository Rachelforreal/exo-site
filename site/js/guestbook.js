// 站长意见留言板：本地持久化 + 分类筛选 + 折叠 + 一键复制意见文本（静态预览零报错，有可选 Worker 接口时可扩展）
import { $, $$, esc, toast, enhanceSegs, reduced } from './util.js';
import { shatterAndRemove, triggerShockwave } from './vibe-motion.js?v=1';

const STORAGE_KEY = 'exo-guestbook-v1';
const LIKES_KEY = 'exo-guestbook-likes-v1';
// 填入部署好的 Cloudflare Worker 地址后，访客留言会同步推送到你的飞书群
const FEISHU_RELAY_URL = 'https://exo-guestbook.loeyoneandonly.workers.dev';
const getFoldLimit = () => (window.matchMedia('(max-width: 720px)').matches ? 2 : 3);
const MAX_BODY = 240;

const TOPICS = [
  { id: 'feature', label: '功能建议' },
  { id: 'errata', label: '行程勘误' },
  { id: 'ux', label: '交互体验' },
  { id: 'wish', label: '许愿墙' },
];
const TOPIC_MAP = Object.fromEntries(TOPICS.map(t => [t.id, t.label]));

const SEED_NOTES = [
  {
    id: 'seed-1',
    topic: 'errata',
    badge: 'galaxy',
    author: '小银星',
    time: '2026-11-18 21:14',
    text: '台北与香港安可场馆说明已核对得很清楚！之后如果有新加场次，希望能在列表上加一个醒目的加场提示。',
    reply: '收到！后续官宣加场会在日程卡上独立标注「加场」并同步更新 .ics 日历订阅。',
    likes: 18,
  },
  {
    id: 'seed-2',
    topic: 'ux',
    badge: 'baekhyun',
    author: '爱丽 0408',
    time: '2026-11-19 15:40',
    text: '月白稿纸和银河模式切起来很顺滑，工坊做完的 L 卡如果在微信里也能直接长按保存图片就完美了。',
    reply: '已升级全站高清图片导出弹窗，在微信内置浏览器和 iOS Safari 中均可长按 PNG 原图保存到相册。',
    likes: 24,
  },
  {
    id: 'seed-3',
    topic: 'feature',
    badge: 'kai',
    author: '九锥守护中',
    time: '2026-11-19 23:05',
    text: '来时路和 52 档综艺单独搬到「档案」页后首页清爽很多！如果以后能按成员筛选个人高光综艺就更好找了。',
    reply: '谢谢建议！已在整理成员单人常驻与代表单期索引，后续版本会加进档案页。',
    likes: 15,
  },
];

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) : fallback;
    return val ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore storage quota errors */ }
};

function nowLabel() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function copyText(str) {
  try {
    await navigator.clipboard.writeText(str);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function initGuestbook(ctx) {
  const mount = $('#gb-mount');
  if (!mount) return;

  const SHORT = { xiumin: '珉锡', suho: '俊勉', lay: '艺兴', baekhyun: '伯贤', chen: '钟大', chanyeol: '灿烈', do: '暻秀', kai: '钟仁', sehun: '世勋' };
  const badgeChoices = [
    { id: 'galaxy', name: '银河' },
    ...(ctx.members || []).map(m => ({ id: m.id, name: SHORT[m.id] || m.zh || m.en })),
  ];

  let selectedTopic = 'feature';
  let selectedBadge = 'galaxy';
  let activeFilter = 'all';
  let expanded = false;
  let animateTopId = '';

  const readUserNotes = () => {
    const arr = readJson(STORAGE_KEY, []);
    return Array.isArray(arr) ? arr : [];
  };
  const readLikes = () => {
    const obj = readJson(LIKES_KEY, {});
    return obj && typeof obj === 'object' ? obj : {};
  };

  mount.innerHTML = `
    <div class="gb">
      <form class="gb__compose" id="gb-form" novalidate aria-label="给站长留言表单">
        <div class="gb__compose-head">
          <p class="kicker">MAILBOX · 给站长提建议</p>
          <small id="gb-char">0 / ${MAX_BODY}</small>
        </div>

        <div class="gb__lbl">
          <span>留言分类</span>
          <div class="seg" role="group" aria-label="选择留言分类" id="gb-topic-seg">
            ${TOPICS.map((t, i) => `<button type="button" data-gb-topic="${t.id}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(t.label)}</button>`).join('')}
          </div>
        </div>

        <div class="gb__lbl">
          <span>行星印记 <em>可选</em></span>
          <div class="gb__badges" id="gb-badges" role="group" aria-label="选择头像印记">
            ${badgeChoices.map((b, i) => `<button type="button" class="gb__badge-btn" data-gb-badge="${esc(b.id)}" aria-pressed="${i === 0 ? 'true' : 'false'}"><svg viewBox="0 0 48 48" aria-hidden="true"><use href="#g-${esc(b.id)}"/></svg><span>${esc(b.name)}</span></button>`).join('')}
          </div>
        </div>

        <div class="gb__row">
          <label class="gb__lbl">
            <span>你的称呼 <em>可选</em></span>
            <span class="field"><input id="gb-author" type="text" maxlength="18" placeholder="EXO-L / 匿名观测员" autocomplete="nickname"></span>
          </label>
          <label class="gb__lbl">
            <span>联系方式 <em>选填，方便回信</em></span>
            <span class="field"><input id="gb-contact" type="text" maxlength="40" placeholder="微博 / 小红书 / 邮箱"></span>
          </label>
        </div>

        <label class="gb__lbl">
          <span>意见或建议</span>
          <textarea class="gb__textarea" id="gb-text" maxlength="${MAX_BODY}" required placeholder="欢迎指出行程时间或场馆错漏、提出交互改进想法，或写下希望补充的内容…"></textarea>
        </label>

        <div class="gb__submit-row">
          <span class="gb__hint">留言即时保留在本地并跨页同步，也可一键复制发给站长；公开留言可点击撤回。</span>
          <button class="cbtn" type="submit" id="gb-submit">投递给站长 →</button>
        </div>
      </form>

      <div class="gb__wall">
        <div class="gb__bar">
          <div class="seg" role="group" aria-label="筛选留言分类" id="gb-filter-seg">
            <button type="button" data-gb-filter="all" aria-pressed="true">全部</button>
            ${TOPICS.map(t => `<button type="button" data-gb-filter="${t.id}" aria-pressed="false">${esc(t.label)}</button>`).join('')}
          </div>
          <span class="gb__count" id="gb-count"></span>
        </div>
        <ol class="gb__list" id="gb-list" aria-live="polite"></ol>
        <div class="gb__fold-wrap" id="gb-fold-wrap" hidden>
          <button class="fold-btn" type="button" id="gb-fold-btn"></button>
        </div>
      </div>
    </div>
  `;

  const form = $('#gb-form', mount);
  const textEl = $('#gb-text', mount);
  const authorEl = $('#gb-author', mount);
  const contactEl = $('#gb-contact', mount);
  const charEl = $('#gb-char', mount);
  const listEl = $('#gb-list', mount);
  const countEl = $('#gb-count', mount);
  const foldWrap = $('#gb-fold-wrap', mount);
  const foldBtn = $('#gb-fold-btn', mount);

  const renderList = () => {
    const userNotes = readUserNotes();
    const likes = readLikes();
    const all = [...userNotes, ...SEED_NOTES];
    const filtered = activeFilter === 'all' ? all : all.filter(n => n.topic === activeFilter);
    const total = filtered.length;
    const foldLimit = getFoldLimit();
    const showingAll = expanded || total <= foldLimit;
    const shown = showingAll ? filtered : filtered.slice(0, foldLimit);

    countEl.innerHTML = `共 <b>${total}</b> 条留言`;
    if (!total) {
      listEl.innerHTML = '<li class="gb__empty">这一分类暂时还没有新留言，欢迎抢先写下第一条建议。</li>';
      foldWrap.hidden = true;
      return;
    }

    listEl.innerHTML = shown.map(item => {
      const liked = !!likes[item.id];
      const likeCount = (Number(item.likes) || 0) + (liked ? 1 : 0);
      const badgeId = badgeChoices.some(b => b.id === item.badge) ? item.badge : 'galaxy';
      const topicLabel = TOPIC_MAP[item.topic] || '建议';
      return `<li class="gb-card" data-gb-id="${esc(item.id)}">
        <div class="gb-card__top">
          <div class="gb-card__who">
            <span class="gb-card__sigil" aria-hidden="true"><svg viewBox="0 0 48 48"><use href="#g-${esc(badgeId)}"/></svg></span>
            <strong class="gb-card__name">${esc(item.author || '匿名观测员')}</strong>
            <span class="pbadge pbadge--upcoming">${esc(topicLabel)}</span>
          </div>
          <div class="gb-card__meta">
            ${item.contact ? `<span>${esc(item.contact)}</span>` : ''}
            <time>${esc(item.time)}</time>
          </div>
        </div>
        <p class="gb-card__body">${esc(item.text)}</p>
        ${item.reply ? `<div class="gb-card__reply"><b>站长回信</b>${esc(item.reply)}</div>` : ''}
        <div class="gb-card__foot">
          <button type="button" class="gb-act" data-gb-like="${esc(item.id)}" aria-pressed="${liked ? 'true' : 'false'}">赞同 · ${likeCount}</button>
          <button type="button" class="gb-act" data-gb-copy="${esc(item.id)}">复制文本</button>
          ${item.mine ? `<button type="button" class="gb-act gb-act--del" data-gb-del="${esc(item.id)}">撤回</button>` : ''}
        </div>
      </li>`;
    }).join('');

    if (total > foldLimit) {
      foldWrap.hidden = false;
      foldBtn.textContent = expanded ? '收起部分留言 ↑' : `展开其余 ${total - foldLimit} 条留言 ↓`;
    } else {
      foldWrap.hidden = true;
    }

    if (animateTopId && !reduced) {
      const target = listEl.querySelector(`[data-gb-id="${CSS.escape(animateTopId)}"]`);
      animateTopId = '';
      target?.animate?.(
        [{ opacity: 0, transform: 'translate3d(0, 10px, 0) scale(.985)' }, { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' }],
        { duration: 300, easing: 'cubic-bezier(.22, 1, .36, 1)' },
      );
    }
  };

  textEl.addEventListener('input', () => {
    charEl.textContent = `${[...textEl.value].length} / ${MAX_BODY}`;
  });

  $('#gb-topic-seg', mount).addEventListener('click', e => {
    const btn = e.target.closest('[data-gb-topic]');
    if (!btn) return;
    selectedTopic = btn.dataset.gbTopic;
    $$('[data-gb-topic]', mount).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  });

  $('#gb-badges', mount).addEventListener('click', e => {
    const btn = e.target.closest('[data-gb-badge]');
    if (!btn) return;
    selectedBadge = btn.dataset.gbBadge;
    $$('[data-gb-badge]', mount).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  });

  $('#gb-filter-seg', mount).addEventListener('click', e => {
    const btn = e.target.closest('[data-gb-filter]');
    if (!btn) return;
    activeFilter = btn.dataset.gbFilter;
    expanded = false;
    $$('[data-gb-filter]', mount).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    renderList();
  });

  foldBtn.addEventListener('click', () => {
    expanded = !expanded;
    renderList();
  });

  listEl.addEventListener('click', async e => {
    const likeBtn = e.target.closest('[data-gb-like]');
    if (likeBtn) {
      const id = likeBtn.dataset.gbLike;
      const likes = readLikes();
      likes[id] = !likes[id];
      if (!likes[id]) delete likes[id];
      writeJson(LIKES_KEY, likes);
      renderList();
      return;
    }
    const delBtn = e.target.closest('[data-gb-del]');
    if (delBtn) {
      const id = delBtn.dataset.gbDel;
      const cardEl = delBtn.closest('.gb-card');
      const prevNotes = readUserNotes();
      const removed = prevNotes.find(n => n.id === id);
      const commitDelete = () => {
        const next = readUserNotes().filter(n => n.id !== id);
        writeJson(STORAGE_KEY, next);
        renderList();
        toast('已撤回该条留言', removed ? {
          actionLabel: '撤销',
          duration: 5000,
          onAction: () => {
            writeJson(STORAGE_KEY, [removed, ...readUserNotes().filter(n => n.id !== removed.id)]);
            animateTopId = removed.id;
            renderList();
          },
        } : {});
      };
      shatterAndRemove(cardEl, commitDelete);
      return;
    }
    const copyBtn = e.target.closest('[data-gb-copy]');
    if (copyBtn) {
      const id = copyBtn.dataset.gbCopy;
      const item = [...readUserNotes(), ...SEED_NOTES].find(n => n.id === id);
      if (!item) return;
      const summary = `[EXO星球·${TOPIC_MAP[item.topic] || '建议'}] ${item.author || '匿名观测员'}：${item.text}${item.contact ? `（联系：${item.contact}）` : ''}`;
      const ok = await copyText(summary);
      toast(ok ? '已复制留言文本，可直接转交站长' : '复制失败，请手动选中文本');
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const rawText = textEl.value.trim();
    if (!rawText) {
      toast('请先填写想对站长说的话');
      textEl.focus();
      return;
    }
    const note = {
      id: `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      topic: selectedTopic,
      badge: selectedBadge,
      author: authorEl.value.trim() || '匿名爱丽',
      contact: contactEl.value.trim(),
      time: nowLabel(),
      text: [...rawText].slice(0, MAX_BODY).join(''),
      likes: 0,
      mine: true,
    };
    const next = [note, ...readUserNotes()].slice(0, 60);
    writeJson(STORAGE_KEY, next);
    activeFilter = 'all';
    $$('[data-gb-filter]', mount).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gbFilter === 'all')));
    expanded = false;
    animateTopId = note.id;
    textEl.value = '';
    charEl.textContent = `0 / ${MAX_BODY}`;
    renderList();
    enhanceSegs(mount);
    triggerShockwave($('#gb-submit', mount));
    toast('已投递到站长留言板！');

    if (FEISHU_RELAY_URL) {
      fetch(FEISHU_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: note.topic,
          badge: note.badge,
          author: note.author,
          contact: note.contact,
          text: note.text,
          time: note.time,
          page: location.href,
        }),
      }).catch(() => {});
    }
  });

  renderList();
  enhanceSegs(mount);
}
