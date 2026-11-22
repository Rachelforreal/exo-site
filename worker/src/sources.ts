import type { RawItem, SourceType } from './types';

const UA = 'Mozilla/5.0 (compatible; exo-news-worker/1.0; +https://www.exolneverland.com)';
const TIMEOUT_MS = 8000;
const MAX_AGE_MS = 72 * 3600 * 1000;

const MEMBERS_KO = ['시우민', '수호', '레이', '백현', '첸', '찬열', '도경수', '디오', '카이', '세훈'];

const gnews = (q: string, hl: string, gl: string, ceid: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:1d')}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

interface Source {
  name: string;
  url: string;
  type: SourceType;
  kind: 'gnews' | 'youtube';
  /** cheap pre-filter for broad feeds (e.g. the SMTOWN channel covers every SM artist) */
  prefilter?: RegExp;
}

const EXO_WORDS =
  /EXO|엑소|XIUMIN|SUHO|LAY\b|BAEKHYUN|CHEN\b|CHANYEOL|D\.O\.|\bKAI\b|SEHUN|시우민|수호|레이|백현|첸|찬열|도경수|카이|세훈|CBX|EXO-SC|KASE|张艺兴|边伯贤|朴灿烈|都暻秀|金钟仁|吴世勋|金珉锡|金俊勉|金钟大|艺兴|伯贤|灿烈|暻秀|钟仁|世勋|珉锡|俊勉|钟大/i;

export const SOURCES: Source[] = [
  { name: 'Google 新闻 (KR)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('엑소', 'ko', 'KR', 'KR:ko') },
  // member names are common words; split in two so each query stays short. The model drops the noise.
  { name: 'Google 新闻 (KR)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('(' + MEMBERS_KO.slice(0, 5).join(' OR ') + ') 엑소', 'ko', 'KR', 'KR:ko') },
  { name: 'Google 新闻 (KR)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('(' + MEMBERS_KO.slice(5).join(' OR ') + ') 엑소', 'ko', 'KR', 'KR:ko') },
  { name: 'Google News (EN)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('"EXO" SM Entertainment', 'en-US', 'US', 'US:en') },
  { name: 'Google News (EN)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('EXO kpop (Xiumin OR Suho OR Lay OR Baekhyun OR Chen OR Chanyeol OR Kai OR Sehun OR "D.O.")', 'en-US', 'US', 'US:en') },
  // Chinese-language media (zh-CN verified to return results on 2026-11-13; zh-TW / zh-HK returned nothing for these
  // simplified-Chinese queries). This is the free stand-in for Weibo: entertainment sites repost studio / official posts.
  { name: 'Google 新闻 (CN)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('EXO 成员', 'zh-CN', 'CN', 'CN:zh-Hans') },
  { name: 'Google 新闻 (CN)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('张艺兴 OR 边伯贤 OR 朴灿烈 OR 都暻秀 OR 金钟仁 OR 吴世勋 OR 金珉锡 OR 金俊勉 OR 金钟大', 'zh-CN', 'CN', 'CN:zh-Hans') },
  { name: 'Google 新闻 (CN)', kind: 'gnews', type: 'media', prefilter: EXO_WORDS, url: gnews('EXO-KASE', 'zh-CN', 'CN', 'CN:zh-Hans') },
  // verified channel ids (feed title checked on 2026-11-13)
  { name: 'YouTube · EXO', kind: 'youtube', type: 'official', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCzCedBCSSltI1TFd3bKyN6g' },
  { name: 'YouTube · SMTOWN', kind: 'youtube', type: 'official', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCEf_Bc-KVd7onSeifS3py9g', prefilter: EXO_WORDS },
];

/* ---------------- tiny RSS / Atom parser (no DOMParser in Workers) ---------------- */

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENT[e.toLowerCase()] ?? m;
    })
    .trim();
}

function tag(block: string, name: string): { attrs: string; text: string } | null {
  const m = block.match(new RegExp(`<${name}(\\s[^>]*)?(?:/>|>([\\s\\S]*?)</${name}>)`, 'i'));
  return m ? { attrs: m[1] || '', text: decode(m[2] || '') } : null;
}

export interface ParsedEntry { title: string; link: string; published: string; sourceName?: string; sourceUrl?: string }

export function parseFeed(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  for (const b of blocks) {
    const title = tag(b, 'title')?.text;
    if (!title) continue;
    let link = '';
    const l = tag(b, 'link');
    if (l) {
      const href = l.attrs.match(/href="([^"]+)"/i);
      link = href ? decode(href[1]) : l.text; // Atom uses href=, RSS uses text
      if (!link) { // Atom with several <link>s: pick rel=alternate
        const alt = b.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i);
        if (alt) link = decode(alt[1]);
      }
    }
    const dateStr = (tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'))?.text || '';
    const t = Date.parse(dateStr);
    const src = tag(b, 'source');
    const su = src?.attrs.match(/url="([^"]+)"/i);
    if (!link) continue;
    out.push({
      title,
      link,
      published: Number.isFinite(t) ? new Date(t).toISOString() : new Date().toISOString(),
      sourceName: src?.text || undefined,
      sourceUrl: su ? decode(su[1]) : undefined,
    });
  }
  return out;
}

/* ---------------- URL handling ---------------- */

/** Google News article links wrap the publisher URL in base64. Older ids ("CBMi...") contain it
 *  in clear; newer ones ("AU_yqL...") do not, and are left as the Google redirect link. */
export function resolveGoogleLink(link: string): string {
  try {
    const u = new URL(link);
    if (u.hostname !== 'news.google.com') return link;
    const id = u.pathname.split('/').pop() || '';
    const bin = atob(id.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(id.length / 4) * 4, '='));
    const m = bin.match(/https?:\/\/[\x21-\x7e]+/);
    return m ? m[0] : link;
  } catch {
    return link;
  }
}

export function normaliseUrl(link: string): string {
  try {
    const u = new URL(link);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid|ocid|oc$|cid$)/i.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return link;
  }
}

export async function sha(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ---------------- Weibo Zero-Config Official Collector ---------------- */

const WEIBO_OFFICIAL_UIDS: Record<string, { label: string; type: 'official' | 'media' }> = {
  '6272182512': { label: 'EXO 官方微博 (@weareoneEXO)', type: 'official' },
  '2533607591': { label: 'SMTOWN 官方微博 (@SMTOWN)', type: 'official' },
  '8477141346': { label: '都暻秀官方微博 (@都暻秀_KYUNGSOODOH)', type: 'official' },
  '2706896955': { label: '张艺兴个人微博 (@张艺兴)', type: 'official' },
  '5582937157': { label: '张艺兴工作室 (@张艺兴工作室)', type: 'official' },
  '6033930155': { label: '边伯贤个人微博 (@baekhyunee7)', type: 'official' },
  '5675411775': { label: '朴灿烈个人微博 (@real__pcyyyyy)', type: 'official' },
  '5340280308': { label: '吴世勋个人微博 (@wu世勋-EXO)', type: 'official' },
  '7917658577': { label: '金珉锡官方微博 (@INB100_XIUMIN)', type: 'official' },
  '7917780127': { label: '金钟大官方微博 (@INB100_CHEN)', type: 'official' },
  '5521056657': { label: '微博韩流', type: 'media' },
  '1665103091': { label: '酷狗音乐', type: 'media' },
};

async function collectWeibo(byId: Map<string, RawItem>, log: string[], cutoff: number): Promise<void> {
  try {
    const vr = await fetch('https://visitor.passport.weibo.cn/visitor/genvisitor2', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        'referer': 'https://visitor.passport.weibo.cn/',
      },
      body: 'cb=visitor_gray_callback&tid=&from=weibo',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const rawCookies = (vr.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie
      ? (vr.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [vr.headers.get('set-cookie') || ''];
    const cookie = rawCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');
    if (!cookie.includes('SUB=')) {
      log.push('SKIP Weibo: no visitor SUB cookie');
      return;
    }

    let kept = 0;
    for (const q of ['weareoneEXO', 'EXO-KASE', '都暻秀_KYUNGSOODOH', '张艺兴', 'baekhyunee7', 'real__pcyyyyy']) {
      const qUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${encodeURIComponent('100103type=1&q=' + q)}&page_type=searchall`;
      const rs = await fetch(qUrl, {
        headers: {
          cookie,
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
          referer: 'https://m.weibo.cn/search',
          'x-requested-with': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!rs.ok) continue;
      const sj = (await rs.json()) as { data?: { cards?: Array<{ mblog?: Record<string, unknown>; card_group?: Array<{ mblog?: Record<string, unknown> }> }> } };
      for (const c of sj?.data?.cards || []) {
        const list = c.card_group || [c];
        for (const item of list) {
          const mb = item.mblog as { id?: string; mid?: string; created_at?: string; text?: string; user?: { id?: number | string } } | undefined;
          if (!mb || !mb.user) continue;
          const acc = WEIBO_OFFICIAL_UIDS[String(mb.user.id)];
          if (!acc) continue;
          const pubMs = Date.parse(String(mb.created_at || ''));
          if (!Number.isFinite(pubMs) || pubMs < cutoff) continue;
          const clean = String(mb.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (clean.length < 6) continue;
          const mid = String(mb.id || mb.mid);
          const url = `https://m.weibo.cn/detail/${mid}`;
          const id = await sha(url + '\n' + clean);
          if (byId.has(id)) continue;
          byId.set(id, {
            id,
            title: clean.slice(0, 120),
            url,
            source: acc.label,
            source_type: acc.type,
            published: new Date(pubMs).toISOString(),
          });
          kept++;
        }
      }
    }
    log.push(`ok weibo-official: ${kept} kept`);
  } catch (e) {
    log.push(`FAIL weibo-official: ${e}`);
  }
}

/* ---------------- collect ---------------- */

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, text/xml, */*' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

export async function collect(): Promise<{ items: RawItem[]; log: string[] }> {
  const log: string[] = [];
  const results = await Promise.allSettled(SOURCES.map(s => fetchText(s.url)));
  const byId = new Map<string, RawItem>();
  const cutoff = Date.now() - MAX_AGE_MS;

  await collectWeibo(byId, log, cutoff);

  for (let i = 0; i < SOURCES.length; i++) {
    const s = SOURCES[i];
    const r = results[i];
    if (r.status === 'rejected') { log.push(`FAIL ${s.name}: ${r.reason}`); continue; }
    let entries: ParsedEntry[] = [];
    try { entries = parseFeed(r.value); } catch (e) { log.push(`PARSE FAIL ${s.name}: ${e}`); continue; }
    let kept = 0;
    for (const e of entries) {
      if (Date.parse(e.published) < cutoff) continue;
      let title = e.title;
      let source = s.name;
      if (s.kind === 'gnews') {
        // Google appends " - Publisher" to the title
        source = e.sourceName || s.name;
        const suffix = ` - ${e.sourceName}`;
        if (e.sourceName && title.endsWith(suffix)) title = title.slice(0, -suffix.length);
      }
      if (s.prefilter && !s.prefilter.test(title)) continue;
      const url = normaliseUrl(s.kind === 'gnews' ? resolveGoogleLink(e.link) : e.link);
      const id = await sha(url + '\n' + title);
      if (byId.has(id)) continue;
      byId.set(id, { id, title, url, source, source_type: s.type, published: e.published });
      kept++;
    }
    log.push(`ok ${s.name}: ${entries.length} entries, ${kept} kept`);
  }

  // same story from several queries: drop duplicates by title (cheap) before paying for the model
  const seenTitle = new Set<string>();
  const items = [...byId.values()]
    .sort((a, b) => b.published.localeCompare(a.published))
    .filter(it => { const k = it.title.toLowerCase().replace(/\s+/g, ''); if (seenTitle.has(k)) return false; seenTitle.add(k); return true; });
  return { items, log };
}
