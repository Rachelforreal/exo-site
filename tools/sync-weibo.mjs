#!/usr/bin/env node
/**
 * EXO 星球 · 免登录微博每日自动同步与四板块分拣引擎 (tools/sync-weibo.mjs)
 *
 * 特性：
 * 1. 自动通过新浪访客系统 (visitor.passport.weibo.cn/visitor/genvisitor2) 签发访客 SUB Cookie，
 *    无需手动登录或按 F12 复制 Cookie，开箱即用。
 * 2. 精准锁定 EXO 官方微博 (@weareoneEXO)、成员本人及工作室官方微博 UID 白名单，
 *    自动剔除粉丝投票刷屏、二手出物等杂讯。
 * 3. 自动将最新微博分拣写入你框出的 4 大核心板块：
 *    - [此刻星讯]     -> data/new/news.json & site/data/weibo-feed.json
 *    - [票根与票夹]   -> data/new/events.json (并自动重算 .ics 日历)
 *    - [唱片封套]     -> data/new/albums.json / 回归发行动态
 *    - [来时路与团综] -> data/new/archive.json (road 编年 & variety 综艺)
 * 4. 自动调用 `node tools/build.mjs` 编译全站静态数据。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const NO_BUILD = process.argv.includes('--no-build');

// ============================================================================
// 1. 官方与权威微博 UID 白名单（严格核验 user.id，杜绝高仿号与粉丝水帖混入官方栏）
// ============================================================================
export const VERIFIED_ACCOUNTS = {
  '6272182512': { name: 'weareoneEXO', label: 'EXO 官方微博', tier: 'official', members: ['group'] },
  '2533607591': { name: 'SMTOWN', label: 'SMTOWN 官方微博', tier: 'official', members: ['group'] },
  '8477141346': { name: '都暻秀_KYUNGSOODOH', label: '都暻秀官方微博', tier: 'official', members: ['do'] },
  '2706896955': { name: '张艺兴', label: '张艺兴个人微博', tier: 'official', members: ['lay'] },
  '5582937157': { name: '张艺兴工作室', label: '张艺兴工作室', tier: 'official', members: ['lay'] },
  '6033930155': { name: 'baekhyunee7', label: '边伯贤个人微博', tier: 'official', members: ['baekhyun'] },
  '5675411775': { name: 'real__pcyyyyy', label: '朴灿烈个人微博', tier: 'official', members: ['chanyeol'] },
  '5340280308': { name: 'wu世勋-EXO', label: '吴世勋个人微博', tier: 'official', members: ['sehun'] },
  '7918730710': { name: 'INB100_BAEKHYUN', label: '边伯贤官方微博', tier: 'official', members: ['baekhyun'] },
  '7917658577': { name: 'INB100_XIUMIN', label: '金珉锡官方微博', tier: 'official', members: ['xiumin'] },
  '7917780127': { name: 'INB100_CHEN', label: '金钟大官方微博', tier: 'official', members: ['chen'] },
  '8019164595': { name: 'StarDream星梦引力', label: 'StarDream 主办官博', tier: 'official', members: ['group'] },
  '5521056657': { name: '微博韩流', label: '微博韩流', tier: 'media', members: ['group'] },
  '2800982237': { name: '新浪韩娱', label: '新浪韩娱', tier: 'media', members: ['group'] },
  // 2026 活跃成员大吧 / 微博吧主 / 资源站（九人全覆盖）
  '2745468794': { name: '秀珉金珉锡FAIRYLAND', label: '金珉锡吧 FAIRYLAND', tier: 'media', members: ['xiumin'] },
  '2608609467': { name: '金俊勉_SUHOasis', label: '金俊勉吧 SUHOasis', tier: 'media', members: ['suho'] },
  '1969348660': { name: '张艺兴吧', label: '张艺兴吧', tier: 'media', members: ['lay'] },
  '7996410850': { name: '咩咩放映机', label: '张艺兴抖音/视频搬运站', tier: 'media', members: ['lay'] },
  '3694863325': { name: '边伯贤FearlessBaek', label: '边伯贤大吧 FearlessBaek', tier: 'media', members: ['baekhyun'] },
  '2609949647': { name: '金钟大_DandelionGarden', label: '金钟大吧 DandelionGarden', tier: 'media', members: ['chen'] },
  '2030278523': { name: '朴灿烈_LOEYPARK', label: '朴灿烈吧 LOEYPARK', tier: 'media', members: ['chanyeol'] },
  '2694760221': { name: '都暻秀吧DohkyungsooBar', label: '都暻秀吧', tier: 'media', members: ['do'] },
  '3675857830': { name: 'Nacho_都暻秀', label: '都暻秀资源站 Nacho', tier: 'media', members: ['do'] },
  '3567115033': { name: 'ChicKai小炸鸡_金钟仁', label: '金钟仁资源站 ChicKai', tier: 'media', members: ['kai'] },
  '2858947502': { name: '吴世勋_Ohsehunorb', label: '吴世勋吧 Ohsehunorb', tier: 'media', members: ['sehun'] },
};

const SEARCH_QUERIES = [
  'weareoneEXO',
  'EXO-KASE',
  '都暻秀_KYUNGSOODOH',
  '张艺兴',
  '张艺兴工作室',
  'baekhyunee7',
  'real__pcyyyyy',
  '金珉锡超话',
  '金俊勉超话',
  '张艺兴超话',
  '边伯贤超话',
  '金钟大超话',
  '朴灿烈超话',
  '都暻秀超话',
  '金钟仁超话',
  '吴世勋超话',
];

const MEMBER_PATTERNS = [
  ['xiumin', /XIUMIN|金珉锡|珉锡|秀珉|시우민/i],
  ['suho', /SUHO|金俊勉|俊勉|수호/i],
  ['lay', /LAY|张艺兴|艺兴|레이/i],
  ['baekhyun', /BAEKHYUN|边伯贤|伯贤|백현/i],
  ['chen', /CHEN|金钟大|钟大|첸/i],
  ['chanyeol', /CHANYEOL|朴灿烈|灿烈|찬열/i],
  ['do', /D\.O\.|都暻秀|暻秀|디오|KYUNGSOO/i],
  ['kai', /KAI|金钟仁|钟仁|카이|EXO-KASE|EXO_KASE/i],
  ['sehun', /SEHUN|吴世勋|世勋|세훈|EXO-KASE|EXO_KASE/i],
];

function stripHtml(html = '') {
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s*weareoneEXO的微博视频\s*/g, '')
    .replace(/\s*网页链接\s*/g, '')
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
  // 转换为北京时间 YYYY-MM-DD
  const cst = new Date(d.getTime() + 8 * 3600 * 1000);
  return cst.toISOString().slice(0, 10);
}

// ============================================================================
// 2. 自动向新浪访客中心申请免登录 SUB Cookie
// ============================================================================
export async function mintWeiboVisitorCookie() {
  if (process.env.WEIBO_COOKIE) return process.env.WEIBO_COOKIE;
  const r = await fetch('https://visitor.passport.weibo.cn/visitor/genvisitor2', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'referer': 'https://visitor.passport.weibo.cn/',
    },
    body: 'cb=visitor_gray_callback&tid=&from=weibo',
    signal: AbortSignal.timeout(10000),
  });
  const setCookies = r.headers.getSetCookie ? r.headers.getSetCookie() : [r.headers.get('set-cookie')];
  const cookieStr = setCookies.map(c => (c || '').split(';')[0]).filter(Boolean).join('; ');
  if (!cookieStr.includes('SUB=')) {
    throw new Error('未能从 visitor.passport.weibo.cn 获取访客 SUB Cookie');
  }
  return cookieStr;
}

// ============================================================================
// 3. 拉取最新官方与权威媒体微博（仅保留 2026 年当期动态）
// ============================================================================
export async function fetchLatestWeiboPosts(cookie) {
  const byMid = new Map();
  const ingestMblog = (mb, fallbackAcc = null) => {
    if (!mb || !mb.user) return;
    const uid = String(mb.user.id);
    const acc = VERIFIED_ACCOUNTS[uid] || fallbackAcc;
    if (!acc) return;
    const mid = String(mb.id || mb.mid);
    if (byMid.has(mid)) return;
    const date = toYMD(mb.created_at);
    if (!date.startsWith('2026')) return;
    const text = stripHtml(mb.longText?.longTextContent || mb.text || '');
    if (!text || text.length < 8) return;
    const spam = /我投给了|铁粉打卡|脱坑出专|转发微博|超话签到|超级话题签到|发帖打榜|净化|垃圾词条|反黑|控评|空瓶|轮博|做数据|转评赞|每日一善|团购|拼车|代拍|出卡|收卡|团票单号|冬日set|应援物|租机|暖到你|不要忘记.*签到|签到.*不要忘记|【视频】26\d{4}|【图片】26\d{4}|【预览】26\d{4}|【饭拍】|【高清】26\d{4}/i;
    if (spam.test(text) || (account.tier !== 'official' && /抽奖/.test(text))) return;
    const pics = [...new Set((mb.pics || []).map(p => p?.large?.url || p?.url).filter(Boolean))].slice(0, 9);
    if (!pics.length) {
      const fallback = mb.original_pic || mb.bmiddle_pic || mb.thumbnail_pic;
      if (fallback) pics.push(fallback);
    }
    const pic = pics[0] || '';
    byMid.set(mid, {
      mid,
      uid,
      date,
      publishedISO: mb.created_at ? new Date(mb.created_at).toISOString() : new Date().toISOString(),
      text,
      pic,
      pics,
      url: `https://m.weibo.cn/detail/${mid}`,
      account: acc,
    });
  };

  // A. 直接拉取白名单官博与活跃大吧的主页时间线
  const directUids = ['6272182512', '7918730710', '7917780127', '8019164595', '5582937157', '3694863325', '3675857830', '1969348660'];
  for (const uid of directUids) {
    const acc = VERIFIED_ACCOUNTS[uid];
    if (!acc) continue;
    try {
      const tUrl = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}&containerid=107603${uid}`;
      const rt = await fetch(tUrl, {
        headers: {
          'cookie': cookie,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'referer': `https://m.weibo.cn/u/${uid}`,
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(9000),
      });
      if (!rt.ok) continue;
      const tj = await rt.json();
      for (const c of (tj?.data?.cards || [])) {
        if (c.card_type === 9 && c.mblog) ingestMblog(c.mblog, acc);
      }
    } catch (e) {
      console.warn(`[主页跳过] ${acc.name}: ${e.message}`);
    }
  }

  // B. 补充关键词搜索
  for (const q of SEARCH_QUERIES) {
    const qUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${encodeURIComponent('100103type=1&q=' + q)}&page_type=searchall`;
    try {
      const rs = await fetch(qUrl, {
        headers: {
          'cookie': cookie,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          'referer': 'https://m.weibo.cn/search',
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!rs.ok) continue;
      const sj = await rs.json();
      for (const c of (sj?.data?.cards || [])) {
        for (const item of (c.card_group || [c])) {
          ingestMblog(item?.mblog);
        }
      }
    } catch (e) {
      console.warn(`[查询跳过] ${q}: ${e.message}`);
    }
  }

  return [...byMid.values()].sort((a, b) => b.date.localeCompare(a.date) || b.mid.localeCompare(a.mid));
}

// ============================================================================
// 4. 智能标题润色与四板块路由 (此刻星讯 / 票根与票夹 / 唱片封套 / 来时路与团综)
// ============================================================================
function buildCleanTitle(post) {
  const { text, account } = post;
  const albumConfig = text.match(/专辑配置\s*[（(]([^）)]+)[）)]\s*EXO[-_]KASE\s*迷你\s*1?辑\s*[《「]([^》」]+)[》」]/i);
  if (albumConfig) return `EXO-KASE 迷你 1 辑《${albumConfig[2]}》专辑配置公开（${albumConfig[1]}）`;
  if (/261125高雄线下活动公告|高雄线下合影活动/.test(text)) return '都暻秀迷你 4 辑《DOPAMINE》Makestar 高雄线下合影活动公告';
  if (/微博国际文化交流之夜/.test(text)) {
    return /神秘来电/.test(text)
      ? 'EXO 官宣出席 11/28 香港「2026 微博国际文化交流之夜」特别来电预告'
      : 'EXO 官宣受邀出席 11/28 中国·香港「2026 微博国际文化交流之夜」';
  }
  if (/1 of them ones/i.test(text)) {
    return 'EXO-KASE 首张迷你专收录曲《1 of them ones》曲风公开';
  }
  if (/DAY OFF.*JAKARTA/i.test(text)) {
    const day = /26\.11\.22/.test(text) ? 'Day 2' : 'Day 1';
    return `都暻秀亚洲巡演《DAY OFF》雅加达站 ${day} 官方后台合照公开`;
  }
  if (/Darling/.test(text) && /都暻秀/.test(text)) {
    return '都暻秀全新抒情单曲《Darling》正式上线';
  }
  if (/BAEKHYUN LAND|KyoongMI/i.test(text)) {
    return '边伯贤「BAEKHYUN LAND · KyoongMI QUIZ」粉丝默契问答征集开启';
  }
  if (/看50年的中国来深圳/.test(text)) {
    return '张艺兴微博更新深圳城市文化宣传寄语';
  }
  // 通用提取：去掉开头的 #话题#，取第一句核心内容
  const noTags = text.replace(/#[^#]+#/g, ' ').replace(/\s+/g, ' ').trim();
  const topic = (text.match(/#([^#]+)#/) || [])[1] || '';
  const base = noTags.split(/[。！？!?\n]/)[0]?.trim() || topic || `${account.label}最新动态`;
  return base.length > 58 ? base.slice(0, 58) : base;
}

export function routeWeiboToSections(post) {
  const { text, date, url, mid, account, publishedISO } = post;
  const members = detectMembers(text, account.members);
  const title = buildCleanTitle(post);
  const summary = text.replace(/\s+/g, ' ').slice(0, 150);
  const category = /专辑|配置|新歌|音源|MV|预告|概念照|特典|回归|迷你|正规|单曲/.test(text) ? 'release' : /演唱会|巡演|见面会|盛典|出席|线下|签售|票务|演出|舞台/.test(text) ? 'stage' : 'general';
  const images = post.pics || (post.pic ? [post.pic] : []);

  const result = {
    newsItem: null,
    feedItem: null,
    eventItem: null,
    roadItem: null,
    varietyItem: null,
  };

  // 1. 【此刻星讯】(news.json + weibo-feed.json)
  result.newsItem = {
    id: `wb-${mid}`,
    date,
    title,
    summary,
    members,
    verification: account.tier,
    channel: '微博',
    sources: [{ name: `${account.label}（微博原帖）`, url }],
    image: images[0] || '',
    images,
    category,
  };

  result.feedItem = {
    id: `wb-${mid}`,
    title_zh: title,
    summary_zh: summary,
    members,
    category,
    image: images[0] || '',
    images,
    importance: 2,
    source: `${account.label} (@${account.name})`,
    source_type: account.tier,
    url,
    title_orig: title,
    published: publishedISO,
    fetched: new Date().toISOString(),
  };

  // 2. 【票根与票夹】(events.json)：识别新官宣的演出/盛典/见面会日期
  if (/微博国际文化交流之夜fourth|第四波阵容/i.test(text) || (/11月28日/.test(text) && /香港/.test(text) && /第四波阵容/.test(text))) {
    result.eventItem = {
      id: 'ev-wb-cultural-night-20261128',
      date: '2026-11-28',
      title: '2026 微博国际文化交流之夜（中国·香港）',
      category: '演唱会',
      city: '香港',
      venue: '中国·香港（微博国际文化交流之夜盛典）',
      members: ['group', 'kai', 'sehun'],
      verification: 'official',
      channel: '微博',
      summary: 'EXO 官方微博 11/22 正式官宣受邀出席 11 月 28 日于中国香港举办的「2026 微博国际文化交流之夜」。',
      sources: [{ name: 'EXO 官方微博官宣帖', url }],
    };
  }

  // 3. 【来时路与团综 - 编年/发行】(archive.json -> road)
  if (/微博国际文化交流之夜第四波阵容/.test(text)) {
    result.roadItem = {
      d: '2026-11-28',
      who: 'exo',
      members: ['group', 'kai', 'sehun'],
      kind: 'milestone',
      t: '出席香港「2026 微博国际文化交流之夜」',
      s: 'EXO 官方微博 11/22 官宣于 11 月 28 日赴中国香港出席 2026 微博国际文化交流之夜盛典。',
      src: url,
      srcLabel: 'EXO 官方微博',
      status: '官方微博已官宣',
    };
  } else if (/综艺|节目|开播|先导片|常驻|真人秀/i.test(text)) {
    const showMatch = text.match(/《([^》]+)》/);
    if (showMatch) {
      result.varietyItem = {
        y: date.slice(0, 4),
        d: date.slice(5).replace('-', '.'),
        zh: showMatch[1],
        t: '',
        p: '微博官宣',
        who: members.includes('group') ? 'EXO' : members.map(m => m.toUpperCase()).join(' · '),
        members,
        cat: members.includes('group') ? 'group' : 'solo',
        programType: '最新更新',
        note: summary,
        sources: [url],
        status: '官方微博已确认',
      };
    }
  }

  return result;
}

// ============================================================================
// 5. 执行同步并更新全站数据
// ============================================================================
export async function runWeiboSync({ dryRun = DRY_RUN } = {}) {
  const readJson = rel => JSON.parse(readFileSync(root + rel, 'utf8'));
  const writeJson = (rel, data) => writeFileSync(root + rel, JSON.stringify(data, null, 2) + '\n');

  const cookie = await mintWeiboVisitorCookie();
  const posts = await fetchLatestWeiboPosts(cookie);
  console.log(`[微博直连成功] 自动获取访客凭证并拉取到 ${posts.length} 条 2026 当期官方/权威微博`);

  const news = readJson('data/new/news.json');
  const events = readJson('data/new/events.json');
  const archive = existsSync(root + 'data/new/archive.json') ? readJson('data/new/archive.json') : { road: [], variety: [] };

  const seenNewsIds = new Set(news.map(n => n.id));
  const seenNewsTitles = new Set(news.map(n => n.title));
  const seenEventIds = new Set(events.map(e => e.id));
  const seenRoadKeys = new Set((archive.road || []).map(r => `${r.d}:${r.t}`));
  const seenVarKeys = new Set((archive.variety || []).map(v => `${v.y}:${v.zh}`));

  let addedNews = 0, addedEvents = 0, addedRoad = 0, addedVar = 0;
  const feedItems = [];

  for (const post of posts) {
    const routed = routeWeiboToSections(post);
    if (routed.feedItem) feedItems.push(routed.feedItem);

    if (routed.newsItem && !seenNewsIds.has(routed.newsItem.id) && !seenNewsTitles.has(routed.newsItem.title)) {
      seenNewsIds.add(routed.newsItem.id);
      seenNewsTitles.add(routed.newsItem.title);
      news.unshift(routed.newsItem);
      addedNews++;
    }
    if (routed.eventItem && !seenEventIds.has(routed.eventItem.id)) {
      seenEventIds.add(routed.eventItem.id);
      events.unshift(routed.eventItem);
      addedEvents++;
    }
    if (routed.roadItem) {
      const key = `${routed.roadItem.d}:${routed.roadItem.t}`;
      if (!seenRoadKeys.has(key)) {
        seenRoadKeys.add(key);
        archive.road = archive.road || [];
        archive.road.push(routed.roadItem);
        addedRoad++;
      }
    }
    if (routed.varietyItem) {
      const key = `${routed.varietyItem.y}:${routed.varietyItem.zh}`;
      if (!seenVarKeys.has(key)) {
        seenVarKeys.add(key);
        archive.variety = archive.variety || [];
        archive.variety.unshift(routed.varietyItem);
        addedVar++;
      }
    }
  }

  // 按日期倒序保持 news 整洁
  news.sort((a, b) => b.date.localeCompare(a.date));

  const summary = {
    updatedAt: new Date().toISOString(),
    fetchedPosts: posts.length,
    addedNews,
    addedEvents,
    addedRoad,
    addedVar,
  };
  console.log('[微博四板块分拣结果]', JSON.stringify(summary));

  if (!dryRun) {
    writeJson('site/data/weibo-feed.json', { updatedAt: summary.updatedAt, items: feedItems });
    if (addedNews + addedEvents + addedRoad + addedVar > 0) {
      writeJson('data/new/news.json', news);
      writeJson('data/new/events.json', events);
      writeJson('data/new/archive.json', archive);
      if (!NO_BUILD) execFileSync('node', [root + 'tools/build.mjs'], { stdio: 'inherit' });
    }
  }

  return summary;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runWeiboSync().catch(err => {
    console.error('[微博同步失败]', err.message);
    process.exit(1);
  });
}
