#!/usr/bin/env node
/**
 * EXO 星球 · 小红书 & Weverse 每日自动同步引擎 (tools/sync-community.mjs)
 *
 * 1. 小红书（免登录公开探索页 + 可选 RSSHUB_BASE）：
 *    - 检索 EXO 联名、品牌合作、成员个人号及官方动态
 * 2. Weverse（支持 RSSHUB_BASE 或 WEVERSE_COOKIE）：
 *    - 拉取 EXO 社区艺人帖（Artist Tab）与官方公告
 * 3. 自动分拣写入「此刻星讯 (data/new/news.json)」，并调用 `node tools/build.mjs` 编译全站数据。
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const DRY_RUN = process.argv.includes('--dry-run');
const RSSHUB_BASE = (process.env.RSSHUB_BASE || '').replace(/\/+$/, '');
const WEVERSE_COOKIE = process.env.WEVERSE_COOKIE || '';

const XHS_KEYWORDS = [
  'EXO 联名',
  'EXO 官方',
  '张艺兴',
  '边伯贤',
  '朴灿烈',
  '吴世勋',
  '都暻秀',
  '金钟仁',
  '金俊勉',
  '金珉锡',
  '金钟大',
];

const EXO_FILTER_RE = /\bEXO\b|엑소|BAEKHYUN|CHANYEOL|SUHO|XIUMIN|CHEN|D\.O\.|KYUNGSOO|KAI|SEHUN|LAY|边伯贤|朴灿烈|金俊勉|金珉锡|金钟大|都暻秀|金钟仁|吴世勋|张艺兴/i;

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

export async function fetchXiaohongshu() {
  const byId = new Map();
  for (const kw of XHS_KEYWORDS) {
    try {
      const url = `https://www.xiaohongshu.com/explore?keyword=${encodeURIComponent(kw)}`;
      const r = await fetch(url, {
        headers: {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'accept-language': 'zh-CN,zh;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) continue;
      const html = await r.text();
      const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})<\/script>/);
      if (!m) continue;

      const raw = m[1].replace(/:\s*undefined/g, ':null');
      const state = JSON.parse(raw);
      const feeds = state?.feed?.feeds || state?.search?.feeds || [];
      for (const f of feeds) {
        const note = f?.noteCard || f;
        const noteId = f?.id || note?.noteId;
        const title = String(note?.displayTitle || note?.title || '').trim();
        if (!noteId || !title || byId.has(noteId)) continue;
        if (!EXO_FILTER_RE.test(title)) continue;
        if (/出卡|拼车|收卡|代拍|求购/.test(title)) continue;

        const author = note?.user?.nickname || note?.user?.nickName || '小红书用户';
        const isOfficialOrCollab = /官方|联名|合作|代言|品牌|官宣/.test(title);
        byId.set(noteId, {
          id: `xhs-${noteId}`,
          platform: '小红书',
          date: new Date().toISOString().slice(0, 10),
          title: title.length > 44 ? title.slice(0, 42) + '…' : title,
          summary: `小红书「${author}」发布：${title}`,
          url: `https://www.xiaohongshu.com/explore/${noteId}`,
          members: detectMembers(title, ['group']),
          tier: isOfficialOrCollab ? 'media' : 'rumor',
          sourceName: `小红书 · ${author}`,
        });
      }
    } catch (e) {
      console.warn(`[小红书跳过] ${kw}: ${e.message}`);
    }
  }
  return [...byId.values()];
}

export async function fetchWeverse() {
  if (!RSSHUB_BASE && !WEVERSE_COOKIE) {
    console.log('[Weverse 跳过] 未配置 RSSHUB_BASE 或 WEVERSE_COOKIE（Weverse 艺人帖需登录态或 RSSHub 代理）');
    return [];
  }

  const items = [];
  if (RSSHUB_BASE) {
    try {
      const r = await fetch(`${RSSHUB_BASE}/weverse/community/exo`, { signal: AbortSignal.timeout(10000) });
      if (r.ok) {
        const xml = await r.text();
        const entries = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const entry of entries.slice(0, 10)) {
          const title = (entry.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] || entry.match(/<title>([^<]+)<\/title>/)?.[1] || '').trim();
          const link = (entry.match(/<link>([^<]+)<\/link>/)?.[1] || '').trim();
          const pub = entry.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1] || '';
          const date = pub ? new Date(pub).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
          if (!title || !link || !date.startsWith('2026')) continue;
          const id = 'wv-' + Buffer.from(link).toString('base64url').slice(0, 14);
          items.push({
            id,
            platform: 'Weverse',
            date,
            title: title.length > 44 ? title.slice(0, 42) + '…' : title,
            summary: `Weverse EXO 社区更新：${title}`,
            url: link,
            members: detectMembers(title, ['group']),
            tier: 'official',
            sourceName: 'Weverse · EXO 社区',
          });
        }
      }
    } catch (e) {
      console.warn(`[Weverse RSSHub 跳过] ${e.message}`);
    }
  }
  return items;
}

function mergeIntoNews(allItems) {
  const newsPath = `${root}/data/new/news.json`;
  const newsJson = JSON.parse(readFileSync(newsPath, 'utf8'));
  const seen = new Set(newsJson.map((x) => x.id));

  let addedNews = 0;
  for (const item of allItems) {
    if (seen.has(item.id)) continue;
    newsJson.unshift({
      id: item.id,
      date: item.date,
      title: item.title,
      summary: item.summary,
      members: item.members,
      verification: item.tier,
      channel: item.platform,
      sources: [{ name: item.sourceName, url: item.url }],
    });
    seen.add(item.id);
    addedNews++;
  }

  if (!DRY_RUN && addedNews) {
    newsJson.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    writeFileSync(newsPath, JSON.stringify(newsJson, null, 2) + '\n', 'utf8');
    execFileSync(process.execPath, [`${root}/tools/build.mjs`], { stdio: 'inherit' });
  }
  return addedNews;
}

const xhs = await fetchXiaohongshu();
const wv = await fetchWeverse();
const addedNews = mergeIntoNews([...xhs, ...wv]);
console.log('[社区同步结果]', JSON.stringify({ dryRun: DRY_RUN, xhsCount: xhs.length, weverseCount: wv.length, addedNews }));
