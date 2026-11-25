#!/usr/bin/env node
/**
 * EXO 星球 · 「镜头之外 · OFF STAGE」全平台鲜活营业影像同步与双端去重归并引擎 (tools/sync-offstage.mjs)
 *
 * 收录通道：
 * 1. 全员 Instagram (图文 / Reels / Stories 快拍留档) — 经官方号与核心资讯站核验，缓存原图与中文翻译
 * 2. 官抖 + TikTok + YouTube Shorts（含发在其他艺人官号上的跨团合拍 Cha）
 * 3. 个人与工作室日常微博花絮（保障 9 位成员全员覆盖、冷热均衡）
 *
 * 双端同源三要素指纹归并规则：
 * - 发布时间相差 <= 24 小时 + 出场自家成员集合一致 + 曲目/合拍对象一致
 * - 官抖与 TikTok 都有 -> 主入口优先挂「官抖」，保留右下角 `TikTok ↗` 副链接
 * - 仅外网 (TikTok / IG Reels / Shorts) 独有 -> 主入口挂外网原帖，自动配齐国内微博/B站免翻墙直看入口 `mirrorUrl`
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mintWeiboVisitorCookie } from './sync-weibo.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const NO_BUILD = process.argv.includes('--no-build');
const WEIBO_ONLY = process.argv.includes('--weibo-only');
const PLATFORMS_ONLY = process.argv.includes('--platforms');
const SEVEN_DAYS_MS = 7 * 24 * 3600 * 1000;

const MEMBER_PATTERNS = [
  ['xiumin', /XIUMIN|金珉锡|珉锡|秀珉|시우민|e_xiu_o/i],
  ['suho', /SUHO|金俊勉|俊勉|수호|kimjuncotton/i],
  ['lay', /LAY|张艺兴|艺兴|레이|layzhang/i],
  ['baekhyun', /BAEKHYUN|边伯贤|伯贤|백현|baekhyunee_exo/i],
  ['chen', /CHEN|金钟大|钟大|첸/i],
  ['chanyeol', /CHANYEOL|朴灿烈|灿烈|찬열|real__pcy/i],
  ['do', /D\.O\.|都暻秀|暻秀|디오|KYUNGSOO|d\.o\.hkyungsoo/i],
  ['kai', /KAI|金钟仁|钟仁|카이|zkdlin|EXO-KASE|EXO_KASE/i],
  ['sehun', /SEHUN|吴世勋|世勋|세훈|oohsehun|EXO-KASE|EXO_KASE/i],
];

// 官方矩阵与经过核验的 IG / 短视频 / 九人微博吧主白名单 UID
const OFFSTAGE_UIDS = [
  '6272182512', // weareoneEXO
  '2706896955', // 张艺兴
  '5582937157', // 张艺兴工作室
  '1969348660', // 张艺兴吧
  '7996410850', // 咩咩放映机（张艺兴抖音/视频搬运站）
  '6033930155', // baekhyunee7
  '7918730710', // INB100_BAEKHYUN
  '7917658577', // INB100_XIUMIN
  '7917780127', // INB100_CHEN
  '5675411775', // real__pcyyyyy
  '5340280308', // wu世勋-EXO
  '8477141346', // 都暻秀_KYUNGSOODOH
  '2707505983', // EXOPlanet_DayBreak
  '2745468794', // 秀珉金珉锡FAIRYLAND
  '2608609467', // 金俊勉_SUHOasis
  '3694863325', // 边伯贤FearlessBaek
  '2609949647', // 金钟大_DandelionGarden
  '2030278523', // 朴灿烈_LOEYPARK
  '2694760221', // 都暻秀吧DohkyungsooBar
  '3675857830', // Nacho_都暻秀
  '3567115033', // ChicKai小炸鸡_金钟仁
  '2858947502', // 吴世勋_Ohsehunorb
];

// 跨团互 Cha、张艺兴抖音/小红书及 IG 捕手检索词
const CHA_AND_IG_QUERIES = [
  '张艺兴 抖音',
  '张艺兴 小红书',
  'weareoneEXO 抖音更新',
  'EXO TikTok更新',
  '金钟仁 challenge',
  '吴世勋 challenge',
  '边伯贤 challenge',
  '朴灿烈 challenge',
  '金俊勉 challenge',
  '金珉锡 challenge',
  '张艺兴 challenge',
  '都暻秀 challenge',
  'zkdlin ins更新',
  'oohsehun ins更新',
  'baekhyunee_exo ins更新',
  'real__pcy ins更新',
  'kimjuncotton ins更新',
  'e_xiu_o ins更新',
];

// 4 小时全平台直连配置（YouTube 原生免登 RSS + RSSHub/自建接口适配抖音/小红书/IG/TikTok）
const YT_OFFSTAGE_CHANNELS = [
  { id: 'UCzCedBCSSltI1TFd3bKyN6g', label: 'EXO 官方油管', author: '@weareoneEXO', members: ['group'], filterExo: false },
  { id: 'UCUyr5000laFgF79tWJB3rXQ', label: 'BAEKHYUN 油管', author: '@BAEKHYUN', members: ['baekhyun'], filterExo: false },
  { id: 'UCR4vlBiZ4Ua8Uzm9z91Qn1g', label: 'CH CHANYEOL 油管', author: '@CHANYEOL', members: ['chanyeol'], filterExo: false },
  { id: 'UCROoY31pgrU66oSzkYdWWmw', label: 'LAY 油管', author: '@LAY', members: ['lay'], filterExo: false },
  { id: 'UCNDkpY8oibV1L6C9jDQgOoA', label: 'XIUMIN 油管', author: '@XIUMIN', members: ['xiumin'], filterExo: false },
  { id: 'UCrgjx6tf6T021T2i-k9cRIw', label: 'Company Soosoo (D.O.)', author: '@companysoosoo', members: ['do'], filterExo: true },
];

const RSSHUB_SOCIAL_ROUTES = [
  // 抖音（需配置 RSSHUB_BASE 或 DOUYIN_API_BASE）
  { platform: '抖音', badge: '官抖', kind: 'video', route: '/douyin/user/MS4wLjABAAAA5-1wM3K6n1p9M8q8y0b8', author: '@张艺兴', members: ['lay'] },
  { platform: '抖音', badge: '官抖', kind: 'video', route: '/douyin/user/MS4wLjABAAAA7eL6S_exo_official', author: '@weareoneEXO', members: ['group'] },
  // 小红书（需配置 RSSHUB_BASE 或 XHS_API_BASE）
  { platform: '小红书', badge: '小红书', kind: 'photo', route: '/xiaohongshu/user/5f4c9a120000000001009999', author: '@张艺兴', members: ['lay'] },
  // Instagram & TikTok 外网直连（需配置 RSSHUB_BASE）
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/weareone.exo', author: '@weareone.exo', members: ['group'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/layzhang', author: '@layzhang', members: ['lay'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/baekhyunee_exo', author: '@baekhyunee_exo', members: ['baekhyun'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/real__pcy', author: '@real__pcy', members: ['chanyeol'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/zkdlin', author: '@zkdlin', members: ['kai'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/oohsehun', author: '@oohsehun', members: ['sehun'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/kimjuncotton', author: '@kimjuncotton', members: ['suho'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/e_xiu_o', author: '@e_xiu_o', members: ['xiumin'] },
  { platform: 'Instagram', badge: 'IG 随拍', kind: 'photo', route: '/instagram/user/d.o.hkyungsoo', author: '@d.o.hkyungsoo', members: ['do'] },
  { platform: 'TikTok', badge: 'TikTok', kind: 'video', route: '/tiktok/user/@weareone.exo_official', author: '@weareone.exo_official', members: ['group'] },
];

const OFFICIAL_OFFSTAGE_UIDS = new Set([
  '6272182512', // weareoneEXO
  '2706896955', // 张艺兴
  '5582937157', // 张艺兴工作室
  '6033930155', // baekhyunee7
  '7918730710', // INB100_BAEKHYUN
  '7917658577', // INB100_XIUMIN
  '7917780127', // INB100_CHEN
  '5675411775', // real__pcyyyyy
  '5340280308', // wu世勋-EXO
  '8477141346', // 都暻秀_KYUNGSOODOH
]);

function stripHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s*网页链接\s*/g, ' ')
    .trim();
}

function detectMembers(text, fallback = ['group']) {
  const hit = [];
  for (const [id, re] of MEMBER_PATTERNS) {
    if (re.test(text)) hit.push(id);
  }
  return hit.length ? [...new Set(hit)] : fallback;
}

function toYMD(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function toCSTIso(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date(Date.now() + 8 * 3600 * 1000).toISOString().replace('Z', '+08:00');
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, '+08:00');
}

function itemTimeMs(x) {
  const raw = x?.publishedAt || (x?.date ? `${x.date}T12:00:00+08:00` : '');
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function normalizeTrackKey(s = '') {
  return String(s || '')
    .toLowerCase()
    .replace(/challenge|cha|挑战|合拍|[《》"'‘’“”\s·×x&]/gi, '')
    .slice(0, 24);
}

/**
 * 三要素指纹归并（24 小时时间窗 + 出场成员一致 + 曲目/合作对象一致）
 * 规则：两边都有优先挂官抖（保留 TikTok 副入口）；只有外网有才挂 TikTok 并附国内免翻墙直看源
 */
export function mergeDualPlatformItems(items) {
  const out = [];
  for (const cur of items) {
    if (cur.kind !== 'video') {
      out.push(cur);
      continue;
    }
    const curMs = Date.parse(cur.date + 'T12:00:00+08:00');
    const curMemKey = [...(cur.members || [])].sort().join(',');
    const curTrackKey = normalizeTrackKey(cur.song || cur.collab || cur.title);

    const dup = out.find(prev => {
      if (prev.kind !== 'video') return false;
      const prevMs = Date.parse(prev.date + 'T12:00:00+08:00');
      if (Math.abs(curMs - prevMs) > 86400e3) return false;
      const prevMemKey = [...(prev.members || [])].sort().join(',');
      if (curMemKey !== prevMemKey) return false;
      const prevTrackKey = normalizeTrackKey(prev.song || prev.collab || prev.title);
      return curTrackKey && prevTrackKey && (curTrackKey === prevTrackKey || curTrackKey.includes(prevTrackKey) || prevTrackKey.includes(curTrackKey));
    });

    if (!dup) {
      out.push({ ...cur });
      continue;
    }

    // 官抖优先合并
    const curIsDouyin = cur.platform === '抖音' || cur.badge === '官抖';
    const prevIsDouyin = dup.platform === '抖音' || dup.badge === '官抖';
    if (curIsDouyin && !prevIsDouyin) {
      dup.secondaryUrl = dup.secondaryUrl || dup.primaryUrl;
      dup.secondaryLabel = dup.secondaryLabel || (dup.platform === 'TikTok' ? 'TikTok ↗' : `${dup.platform} ↗`);
      dup.platform = '抖音';
      dup.badge = '官抖';
      dup.primaryUrl = cur.primaryUrl;
      dup.primaryLabel = cur.primaryLabel || '前往抖音原片 ↗';
    } else if (!curIsDouyin && prevIsDouyin) {
      dup.secondaryUrl = dup.secondaryUrl || cur.primaryUrl;
      dup.secondaryLabel = dup.secondaryLabel || (cur.platform === 'TikTok' ? 'TikTok ↗' : `${cur.platform} ↗`);
    }
    if (!dup.mirrorUrl && cur.mirrorUrl) {
      dup.mirrorUrl = cur.mirrorUrl;
      dup.mirrorLabel = cur.mirrorLabel || '国内免翻墙观看 ↗';
    }
  }
  return out;
}

async function fetchLiveOffstageCandidates(cookie) {
  const candidates = [];
  const seenMid = new Set();

  const ingest = mb => {
    if (!mb || !mb.id || seenMid.has(String(mb.id))) return;
    const uid = String(mb.user?.id || '');
    const text = stripHtml(mb.longText?.longTextContent || mb.text || '');
    if (!text || text.length < 4) return;
    if (/抽奖|拼车|代拍|出卡|收卡|换卡|控评|轮博|超话签到|那年今日|投票号召|投票攻略|助力|痛楼|特典|招新|集资|应援|生日快乐|周年快乐|大屏|线下打卡|重要通知|名场面|极限挑战|考古|混剪|16\d{4}|17\d{4}|18\d{4}|19\d{4}|20\d{4}|21\d{4}|22\d{4}/i.test(text)) return;

    const isOfficial = OFFICIAL_OFFSTAGE_UIDS.has(uid);
    const hasPlatformOrBtsSignal =
      /ins更新|insta|instagram|tiktok|抖音|小红书|youtube|shorts|weverse|challenge|\bcha\b|合拍|花絮|随拍|练习室|排练|vlog|自拍/i.test(text);
    const isOffstageSignal = isOfficial ? (hasPlatformOrBtsSignal || mb.page_info?.type === 'video' || (mb.pics || []).length >= 1) : hasPlatformOrBtsSignal;
    if (!isOffstageSignal) return;

    // 排除正式专辑配置公告（留在上半区正式动态）
    if (/专辑配置|Album Details|线下合影活动公告|巡演日程公布|第四波阵容/i.test(text)) return;

    const date = toYMD(mb.created_at);
    const publishedAt = toCSTIso(mb.created_at);
    if (!date.startsWith('2026')) return;
    if (Date.now() - Date.parse(publishedAt) > SEVEN_DAYS_MS) return;

    const pics = (mb.pics || []).map(p => p.large?.url || p.url).filter(Boolean);
    const vpic = mb.page_info?.page_pic?.url || '';
    const isVideo = mb.page_info?.type === 'video' || /微博视频|challenge|\bcha\b|抖音更新|TikTok更新/i.test(text);
    if (!pics.length && !vpic) return;

    seenMid.add(String(mb.id));
    const members = detectMembers(text, ['group']);
    if (members.length === 1 && members[0] === 'group' && !/EXO|weareone/i.test(text + (mb.user?.screen_name || ''))) return;

    const isCha = /challenge|\bcha\b|合拍|手势舞/i.test(text);
    let platform = '微博';
    let badge = isVideo ? '官号短片' : (pics.length > 1 ? '多图随拍' : '日常随拍');
    if (/小红书|RED/i.test(text)) { platform = '小红书'; badge = isVideo ? '小红书短片' : '小红书'; }
    else if (/抖音/i.test(text)) { platform = '抖音'; badge = '官抖'; }
    else if (/TikTok/i.test(text)) { platform = 'TikTok'; badge = 'TikTok'; }
    else if (/ins|insta|instagram/i.test(text)) { platform = 'Instagram'; badge = pics.length > 1 ? 'IG 多图' : 'IG 随拍'; }

    const cleanHeadline = text
      .replace(/#[^#]+#/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 38);

    const imgList = pics.length ? pics.slice(0, 6) : [vpic];
    const weiboUrl = `https://m.weibo.cn/detail/${mb.id}`;

    candidates.push({
      id: `os-wb-${mb.id}`,
      date,
      publishedAt,
      kind: isVideo ? 'video' : 'photo',
      isCha,
      platform,
      badge,
      members,
      author: `@${mb.user?.screen_name || 'weareoneEXO'}`,
      collab: isCha ? `${members.filter(m => m !== 'group').map(m => m.toUpperCase()).join(' & ') || 'EXO'} · Challenge` : '',
      song: (text.match(/《([^》]+)》/) || [])[1] ? `《${(text.match(/《([^》]+)》/) || [])[1]}》` : '',
      duration: isVideo ? '0:20' : '',
      title: cleanHeadline || `${mb.user?.screen_name || 'EXO'} 鲜活日常更新`,
      captionOrig: text.slice(0, 140),
      captionZh: text.replace(/#[^#]+#/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140),
      cover: imgList[0],
      images: imgList,
      primaryUrl: platform === 'TikTok' ? 'https://www.tiktok.com/@weareone.exo_official' : weiboUrl,
      primaryLabel: platform === 'TikTok' ? '前往 TikTok 原帖 ↗' : (isVideo ? '观看原片 ↗' : '查看原帖大图 ↗'),
      secondaryUrl: '',
      secondaryLabel: '',
      mirrorUrl: platform === 'TikTok' ? weiboUrl : '',
      mirrorLabel: platform === 'TikTok' ? '国内免翻墙观看 ↗' : '',
    });
  };

  // 1) 抓取官方与九人微博吧主时间线（过滤 7 天前与旧置顶）
  for (const uid of OFFSTAGE_UIDS) {
    try {
      const uUrl = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}&containerid=107603${uid}`;
      const rs = await fetch(uUrl, {
        headers: {
          cookie,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          referer: `https://m.weibo.cn/u/${uid}`,
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!rs.ok) continue;
      const sj = await rs.json();
      for (const c of (sj?.data?.cards || [])) {
        if (c?.mblog?.isTop) continue;
        ingest(c?.mblog);
      }
    } catch {}
  }

  // 2) 抓取跨团互 Cha、张艺兴抖音/小红书及 IG 搬运检索词
  for (const q of CHA_AND_IG_QUERIES.slice(0, 12)) {
    try {
      const qUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${encodeURIComponent('100103type=1&q=' + q)}&page_type=searchall`;
      const rs = await fetch(qUrl, {
        headers: {
          cookie,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          referer: 'https://m.weibo.cn/search',
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(9000),
      });
      if (!rs.ok) continue;
      const sj = await rs.json();
      for (const c of (sj?.data?.cards || [])) {
        for (const item of (c.card_group || [c])) ingest(item?.mblog);
      }
    } catch {}
  }

  return candidates;
}

const EXO_RE = /\bEXO\b|엑소|BAEKHYUN|CHANYEOL|SUHO|XIUMIN|CHEN|D\.O\.|KYUNGSOO|KAI|SEHUN|LAY|백현|찬열|수호|시우민|첸|디오|경수|카이|세훈|레이|边伯贤|朴灿烈|金俊勉|金珉锡|金钟大|都暻秀|金钟仁|吴世勋|张艺兴/i;

export async function fetchYouTubeOffstageCandidates() {
  const out = [];
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  await Promise.allSettled(YT_OFFSTAGE_CHANNELS.map(async ch => {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) return;
      const xml = await r.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      for (const entry of entries) {
        const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        const rawTitle = (entry.match(/<title>([^<]+)<\/title>/)?.[1] || '')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] || '';
        const pubMs = Date.parse(published);
        if (!videoId || !rawTitle || !Number.isFinite(pubMs) || pubMs < cutoff) continue;
        if (ch.filterExo && !EXO_RE.test(rawTitle)) continue;

        const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1] || `https://www.youtube.com/watch?v=${videoId}`;
        const isShort = /\/shorts\//i.test(link) || /challenge|cha|short/i.test(rawTitle);
        const members = detectMembers(rawTitle, ch.members);
        const cover = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        out.push({
          id: `os-yt-${videoId}`,
          date: toYMD(published),
          publishedAt: toCSTIso(published),
          kind: 'video',
          isCha: isShort,
          platform: 'YouTube',
          badge: isShort ? 'YT Shorts' : 'YouTube',
          members,
          author: ch.author,
          collab: '',
          song: (rawTitle.match(/['《]([^'》]+)['》]/) || [])[1] || '',
          duration: isShort ? '0:25' : 'Shorts',
          title: rawTitle.slice(0, 48),
          captionOrig: rawTitle,
          captionZh: `${ch.label} 近 7 天更新：${rawTitle}`,
          cover,
          images: [cover],
          primaryUrl: link,
          primaryLabel: '前往 YouTube 原片 ↗',
          secondaryUrl: '',
          secondaryLabel: '',
          mirrorUrl: `https://search.bilibili.com/all?keyword=${encodeURIComponent(rawTitle.slice(0, 28))}`,
          mirrorLabel: '国内 B站搜原片 ↗',
        });
      }
    } catch {}
  }));
  return out;
}

export async function fetchRsshubPlatformCandidates() {
  const base = (process.env.RSSHUB_BASE || '').replace(/\/+$/, '');
  if (!base) return [];
  const out = [];
  const cutoff = Date.now() - SEVEN_DAYS_MS;

  for (const src of RSSHUB_SOCIAL_ROUTES) {
    try {
      const apiOverride =
        src.platform === '抖音' && process.env.DOUYIN_API_BASE
          ? `${process.env.DOUYIN_API_BASE.replace(/\/+$/, '')}${src.route}`
          : src.platform === '小红书' && process.env.XHS_API_BASE
            ? `${process.env.XHS_API_BASE.replace(/\/+$/, '')}${src.route}`
            : `${base}${src.route}?format=json`;
      const r = await fetch(apiOverride, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(9000),
      });
      if (!r.ok) continue;
      const feed = await r.json();
      for (const item of (feed?.items || []).slice(0, 8)) {
        const pubMs = Date.parse(item.date_published || item.pubDate || '');
        if (!Number.isFinite(pubMs) || pubMs < cutoff) continue;
        const html = String(item.content_html || item.summary || '');
        const imgs = [...html.matchAll(/<img[^>]+src="([^"]+)"/gi)].map(m => m[1]).filter(Boolean).slice(0, 6);
        if (!imgs.length && !item.image) continue;
        const cover = imgs[0] || item.image;
        const title = stripHtml(item.title || '').slice(0, 44);
        if (!title) continue;
        out.push({
          id: `os-rss-${src.platform}-${Buffer.from(String(item.id || item.url || title)).toString('base64url').slice(0, 14)}`,
          date: toYMD(pubMs),
          publishedAt: toCSTIso(pubMs),
          kind: src.kind,
          isCha: /challenge|\bcha\b|合拍/i.test(title),
          platform: src.platform,
          badge: src.badge,
          members: detectMembers(title, src.members),
          author: src.author,
          collab: '',
          song: '',
          duration: src.kind === 'video' ? '0:20' : '',
          title,
          captionOrig: stripHtml(html).slice(0, 140) || title,
          captionZh: title,
          cover,
          images: imgs.length ? imgs : [cover],
          primaryUrl: item.url || '',
          primaryLabel: `前往 ${src.platform} 原帖 ↗`,
          secondaryUrl: '',
          secondaryLabel: '',
          mirrorUrl: '',
          mirrorLabel: '',
        });
      }
    } catch {}
  }
  return out;
}

export function pruneToSevenDaysWithFallback(items) {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  const sorted = [...items].sort((a, b) => itemTimeMs(b) - itemTimeMs(a));
  const kept = new Map();
  for (const item of sorted) {
    if (itemTimeMs(item) >= cutoff) kept.set(item.id, item);
  }
  const ALL_MEMBERS = ['xiumin', 'suho', 'lay', 'baekhyun', 'chen', 'chanyeol', 'do', 'kai', 'sehun'];
  for (const m of ALL_MEMBERS) {
    const has7d = [...kept.values()].some(x => x.members?.includes(m));
    if (!has7d) {
      const latestForMember = sorted.find(x => x.members?.includes(m));
      if (latestForMember) kept.set(latestForMember.id, latestForMember);
    }
  }
  return [...kept.values()].sort((a, b) => itemTimeMs(b) - itemTimeMs(a));
}

async function downloadLocalImage(url, destBase) {
  if (!url || !/^https?:\/\//i.test(url)) return url;
  try {
    const r = await fetch(url, {
      headers: {
        referer: url.includes('sinaimg.cn') ? 'https://m.weibo.cn/' : '',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return '';
    const ct = (r.headers.get('content-type') || '').toLowerCase();
    if (!ct.startsWith('image/')) return '';
    const ext = ct.includes('webp') ? 'webp' : ct.includes('png') ? 'png' : 'jpg';
    const rel = `img/offstage/${destBase}.${ext}`;
    const full = `${root}site/${rel}`;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) return '';
    writeFileSync(full, buf);
    return rel;
  } catch {
    return '';
  }
}

async function cacheOffstageImages(items) {
  const out = [];
  for (const item of items) {
    const imgs = item.images?.length ? item.images : [item.cover].filter(Boolean);
    const cached = [];
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i];
      if (!/^https?:\/\//i.test(src)) {
        if (existsSync(`${root}site/${src}`)) cached.push(src);
        continue;
      }
      const rel = await downloadLocalImage(src, `${item.id}-${i + 1}`);
      if (rel) cached.push(rel);
    }
    if (!cached.length) continue;
    out.push({ ...item, cover: cached[0], images: cached });
  }
  return out;
}

export async function runOffstageSync({ dryRun = DRY_RUN, noBuild = NO_BUILD, weiboOnly = WEIBO_ONLY, platformsOnly = PLATFORMS_ONLY } = {}) {
  const offstagePath = `${root}data/new/offstage.json`;
  mkdirSync(`${root}site/img/offstage`, { recursive: true });
  const existing = existsSync(offstagePath) ? JSON.parse(readFileSync(offstagePath, 'utf8')) : [];

  let liveItems = [];
  if (!platformsOnly) {
    try {
      const cookie = await mintWeiboVisitorCookie();
      liveItems.push(...await fetchLiveOffstageCandidates(cookie));
    } catch (e) {
      console.warn(`[Offstage 微博巡检跳过] ${e.message}`);
    }
  }
  if (!weiboOnly) {
    try {
      liveItems.push(...await fetchYouTubeOffstageCandidates());
      liveItems.push(...await fetchRsshubPlatformCandidates());
    } catch (e) {
      console.warn(`[Offstage 全平台直连跳过] ${e.message}`);
    }
  }

  const seenIds = new Set(existing.map(x => x.id));
  const seenMirror = new Set(existing.flatMap(x => [x.primaryUrl, x.mirrorUrl].filter(Boolean)));
  const fresh = liveItems.filter(x => !seenIds.has(x.id) && !seenMirror.has(x.primaryUrl) && (!x.mirrorUrl || !seenMirror.has(x.mirrorUrl)));

  // 合并、双端三要素去重、并严格裁剪为「近 7 天滚动窗口 + 零更新成员保留最近 1 条兜底」
  let merged = pruneToSevenDaysWithFallback(mergeDualPlatformItems([...existing, ...fresh]));
  if (!dryRun) {
    merged = await cacheOffstageImages(merged);
  }

  console.log(`[Offstage 同步完成] 现有 ${existing.length} 条，新捕获 ${fresh.length} 条，7 天窗口+兜底保留 ${merged.length} 条`);

  if (!dryRun) {
    writeFileSync(offstagePath, JSON.stringify(merged, null, 2) + '\n');
    const metaPath = `${root}data/new/meta.json`;
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const nowIso = toCSTIso(Date.now());
      meta.offstageSyncedAt = nowIso;
      if (!platformsOnly) meta.weiboSyncedAt = nowIso;
      if (!weiboOnly) meta.platformsSyncedAt = nowIso;
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + '\n');
    }
    if (!noBuild) {
      execFileSync('node', [`${root}tools/build.mjs`], { stdio: 'inherit' });
    }
  }
  return { total: merged.length, added: fresh.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runOffstageSync().catch(err => {
    console.error('[Offstage 同步异常]', err.message);
    process.exit(1);
  });
}
