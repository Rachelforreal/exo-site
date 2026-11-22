#!/usr/bin/env node
/**
 * EXO 星球 · YouTube & B 站每日自动同步引擎 (tools/sync-video.mjs)
 *
 * 1. YouTube（原生 RSS，免登录）：
 *    - EXO 官方频道、SMTOWN（过滤 EXO 相关）
 *    - 成员个人/公司频道：BAEKHYUN、CH CHANYEOL、LAY、XIUMIN、Company Soosoo (D.O.)
 *    - 打歌舞台频道：KBS Kpop、MBCkpop、M2、STUDIO CHOOM（过滤 EXO 相关舞台）
 * 2. B 站（访客 Cookie，免登录）：
 *    - 各类舞台与直拍：EXO 舞台、EXO 直拍、张艺兴 舞台
 *    - 粉丝上传的成员直播录屏：EXO 直播、边伯贤 直播、朴灿烈 直播、金俊勉 直播、吴世勋 直播、金钟仁 直播、都暻秀 直播
 * 3. 自动分拣写入「此刻星讯 (data/new/news.json)」与「来时路与团综 (data/new/archive.json)」，
 *    并调用 `node tools/build.mjs` 编译全站静态数据。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');

export const YT_CHANNELS = [
  { id: 'UCzCedBCSSltI1TFd3bKyN6g', label: 'EXO 官方油管', members: ['group'], filterExo: false, tier: 'official' },
  { id: 'UCEf_Bc-KVd7onSeifS3py9g', label: 'SMTOWN 官方油管', members: ['group'], filterExo: true, tier: 'official' },
  { id: 'UCUyr5000laFgF79tWJB3rXQ', label: 'BAEKHYUN 个人油管', members: ['baekhyun'], filterExo: false, tier: 'official' },
  { id: 'UCR4vlBiZ4Ua8Uzm9z91Qn1g', label: 'CH CHANYEOL 个人油管', members: ['chanyeol'], filterExo: false, tier: 'official' },
  { id: 'UCROoY31pgrU66oSzkYdWWmw', label: 'LAY 个人油管', members: ['lay'], filterExo: false, tier: 'official' },
  { id: 'UCNDkpY8oibV1L6C9jDQgOoA', label: 'XIUMIN 个人油管', members: ['xiumin'], filterExo: false, tier: 'official' },
  { id: 'UCrgjx6tf6T021T2i-k9cRIw', label: 'Company Soosoo (D.O.)', members: ['do'], filterExo: true, tier: 'official' },
  { id: 'UCeLPm9yH_a_QH8n6445G-Ow', label: 'KBS Kpop 舞台', members: ['group'], filterExo: true, tier: 'media' },
  { id: 'UCe52oeb7Xv_KaJsEzcKXJJg', label: 'MBCkpop 舞台', members: ['group'], filterExo: true, tier: 'media' },
  { id: 'UCbNC3nyv42BLe71Q9mW5H0Q', label: 'M2 舞台', members: ['group'], filterExo: true, tier: 'media' },
  { id: 'UCEIi7zFR_wE23jFncVtd6-A', label: 'STUDIO CHOOM 舞台', members: ['group'], filterExo: true, tier: 'media' },
];

export const BILI_QUERIES = [
  { q: 'EXO 舞台', kind: 'stage', members: ['group'] },
  { q: 'EXO 直拍', kind: 'stage', members: ['group'] },
  { q: '张艺兴 舞台', kind: 'stage', members: ['lay'] },
  { q: 'EXO 直播', kind: 'live', members: ['group'] },
  { q: '边伯贤 直播', kind: 'live', members: ['baekhyun'] },
  { q: '朴灿烈 直播', kind: 'live', members: ['chanyeol'] },
  { q: '金俊勉 直播', kind: 'live', members: ['suho'] },
  { q: '吴世勋 直播', kind: 'live', members: ['sehun'] },
  { q: '金钟仁 直播', kind: 'live', members: ['kai'] },
  { q: '都暻秀 直播', kind: 'live', members: ['do'] },
];

const EXO_FILTER_RE = /\bEXO\b|엑소|BAEKHYUN|CHANYEOL|SUHO|XIUMIN|CHEN|D\.O\.|KYUNGSOO|KAI|SEHUN|LAY|백현|찬열|수호|시우민|첸|디오|경수|카이|세훈|레이|边伯贤|朴灿烈|金俊勉|金珉锡|金钟大|都暻秀|金钟仁|吴世勋|张艺兴/i;

const MEMBER_PATTERNS = [
  ['xiumin', /XIUMIN|金珉锡|珉锡|시우민/i],
  ['suho', /SUHO|金俊勉|俊勉|수호/i],
  ['lay', /LAY|张艺兴|艺兴|레이/i],
  ['baekhyun', /BAEKHYUN|边伯贤|伯贤|백현/i],
  ['chen', /CHEN|金钟大|钟大|첸/i],
  ['chanyeol', /CHANYEOL|朴灿烈|灿烈|찬열/i],
  ['do', /D\.O\.|都暻秀|暻秀|디오|KYUNGSOO|경수/i],
  ['kai', /KAI|金钟仁|钟仁|카이/i],
  ['sehun', /SEHUN|吴世勋|世勋|세훈/i],
];

function detectMembers(text, fallback = ['group']) {
  const hit = [];
  for (const [id, re] of MEMBER_PATTERNS) {
    if (re.test(text)) hit.push(id);
  }
  return hit.length ? [...new Set(hit)] : fallback;
}

function decodeXml(s = '') {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function fetchYouTubeUpdates() {
  const items = [];
  for (const ch of YT_CHANNELS) {
    try {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`;
      const r = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const xml = await r.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      for (const entry of entries) {
        const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        const title = decodeXml(entry.match(/<title>([^<]+)<\/title>/)?.[1] || '');
        const published = entry.match(/<published>([^<]+)<\/published>/)?.[1] || '';
        const date = published.slice(0, 10);
        if (!videoId || !title || !date.startsWith('2026')) continue;
        if (ch.filterExo && !EXO_FILTER_RE.test(title)) continue;

        items.push({
          id: `yt-${videoId}`,
          platform: 'YouTube',
          date,
          title,
          summary: `${ch.label}更新视频：${title}`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          members: detectMembers(title, ch.members),
          tier: ch.tier,
          sourceName: ch.label,
          kind: /stage|cam|직캠|舞台|choom|live/i.test(title) ? 'stage' : 'video',
        });
      }
    } catch (e) {
      console.warn(`[YouTube 跳过] ${ch.label}: ${e.message}`);
    }
  }
  return items;
}

async function getBiliCookie() {
  const home = await fetch('https://www.bilibili.com/', {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(10000),
  });
  const setCookies = home.headers.getSetCookie ? home.headers.getSetCookie() : [];
  return setCookies.map((c) => c.split(';')[0]).join('; ');
}

export async function fetchBiliUpdates() {
  const byBvid = new Map();
  let cookie = '';
  try {
    cookie = await getBiliCookie();
  } catch (e) {
    console.warn(`[B站 Cookie 获取失败] ${e.message}`);
    return [];
  }

  for (const cfg of BILI_QUERIES) {
    try {
      const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(cfg.q)}&order=pubdate&page=1`;
      const r = await fetch(url, {
        headers: {
          cookie,
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          referer: 'https://search.bilibili.com/',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const list = j?.data?.result || [];
      for (const v of list.slice(0, 6)) {
        const bvid = v.bvid;
        if (!bvid || byBvid.has(bvid)) continue;
        const pubDate = v.pubdate ? new Date(v.pubdate * 1000).toISOString().slice(0, 10) : '';
        if (!pubDate.startsWith('2026')) continue;

        const title = String(v.title || '').replace(/<[^>]+>/g, '').trim();
        if (!title || !EXO_FILTER_RE.test(title)) continue;
        if (/AI翻唱|仿妆|鬼畜|买号|出卡/.test(title)) continue;

        byBvid.set(bvid, {
          id: `bili-${bvid}`,
          platform: 'Bilibili',
          date: pubDate,
          title,
          summary: `B站 UP 主「${v.author || '粉丝投稿'}」上传${cfg.kind === 'live' ? '成员直播录屏' : '舞台视频'}：${title}`,
          url: `https://www.bilibili.com/video/${bvid}`,
          members: detectMembers(title, cfg.members),
          tier: 'media',
          sourceName: `B站 · ${v.author || 'UP主'}`,
          kind: cfg.kind,
        });
      }
    } catch (e) {
      console.warn(`[B站跳过] ${cfg.q}: ${e.message}`);
    }
  }
  return [...byBvid.values()];
}

function mergeIntoSite(allItems) {
  const newsPath = `${root}/data/new/news.json`;
  const archPath = `${root}/data/new/archive.json`;

  const newsJson = JSON.parse(readFileSync(newsPath, 'utf8'));
  const archJson = JSON.parse(readFileSync(archPath, 'utf8'));

  const seenNews = new Set(newsJson.map((x) => x.id));
  const seenVar = new Set((archJson.variety || []).map((x) => x.id));

  let addedNews = 0;
  let addedVar = 0;

  for (const item of allItems) {
    if (!seenNews.has(item.id)) {
      newsJson.unshift({
        id: item.id,
        date: item.date,
        title: item.title.length > 44 ? item.title.slice(0, 42) + '…' : item.title,
        summary: item.summary,
        members: item.members,
        verification: item.tier,
        channel: item.platform,
        sources: [{ name: item.sourceName, url: item.url }],
      });
      seenNews.add(item.id);
      addedNews++;
    }

    if ((item.kind === 'stage' || item.kind === 'live') && !seenVar.has(item.id)) {
      archJson.variety.unshift({
        id: item.id,
        year: Number(item.date.slice(0, 4)) || 2026,
        title: item.title.length > 44 ? item.title.slice(0, 42) + '…' : item.title,
        kind: item.kind === 'live' ? '直播录屏' : '舞台直拍',
        members: item.members,
        note: `${item.platform} · ${item.sourceName}`,
        url: item.url,
      });
      seenVar.add(item.id);
      addedVar++;
    }
  }

  if (!DRY_RUN && (addedNews || addedVar)) {
    newsJson.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    writeFileSync(newsPath, JSON.stringify(newsJson, null, 2) + '\n', 'utf8');
    writeFileSync(archPath, JSON.stringify(archJson, null, 2) + '\n', 'utf8');
    execFileSync(process.execPath, [`${root}/tools/build.mjs`], { stdio: 'inherit' });
  }

  return { addedNews, addedVar };
}

const yt = await fetchYouTubeUpdates();
const bili = await fetchBiliUpdates();
const all = [...yt, ...bili].sort((a, b) => b.date.localeCompare(a.date));
const stats = mergeIntoSite(all);
console.log('[音视频同步结果]', JSON.stringify({ dryRun: DRY_RUN, ytCount: yt.length, biliCount: bili.length, ...stats }));
