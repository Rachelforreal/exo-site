import { classify, MEMBER_IDS } from './ai';
import { collect } from './sources';
import type { Env, Feed, FeedItem, RawItem } from './types';

const MAX_NEW = 40;
const FEED_SIZE = 80;
const SEEN_TTL_MS = 7 * 24 * 3600 * 1000;

const ALLOWED_ORIGINS = [/^https:\/\/www\.exolneverland\.com$/, /^https:\/\/exolneverland\.com$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

/* ------------------------------- pipeline ------------------------------- */

async function run(env: Env): Promise<string[]> {
  const dry = env.DRY_RUN === '1' || env.DRY_RUN === 'true';
  const now = new Date().toISOString();
  const { items: raw, log } = await collect();

  // seen set: one KV key {hash: firstSeenMs}; entries older than 7 days are dropped
  const seen: Record<string, number> = (await env.NEWS.get('seen', 'json')) || {};
  const cutoff = Date.now() - SEEN_TTL_MS;
  for (const k of Object.keys(seen)) if (seen[k] < cutoff) delete seen[k];

  const fresh = raw.filter(i => !seen[i.id]);
  const batch = fresh.slice(0, MAX_NEW); // the rest waits for the next hour
  log.push(`collected ${raw.length}, new ${fresh.length}, processing ${batch.length}`);

  let items: FeedItem[] = [];
  if (batch.length) {
    if (dry) {
      items = batch.map(b => toItem(b, now, { title_zh: b.title, summary_zh: '', members: [], category: 'other', importance: 1 }));
      log.push('DRY_RUN: Claude skipped, raw headlines stored');
    } else {
      if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
      const res = await classify(env, batch);
      const byId = new Map(res.verdicts.map(v => [v.id, v]));
      let kept = 0;
      for (const b of batch) {
        const v = byId.get(b.id);
        if (v?.relevant && v.title_zh.trim()) {
          kept++;
          items.push(toItem(b, now, {
            title_zh: v.title_zh.trim(),
            summary_zh: [...v.summary_zh.trim()].slice(0, 60).join(''),
            members: [...new Set(v.members.filter(m => (MEMBER_IDS as readonly string[]).includes(m)))],
            category: v.category,
            importance: Math.min(3, Math.max(1, Math.round(v.importance) || 1)),
          }));
        }
        seen[b.id] = Date.now(); // irrelevant ones too, so we never pay for them twice
      }
      log.push(`claude path=${res.path} tokens in=${res.usage.input_tokens} out=${res.usage.output_tokens}; relevant ${kept}/${batch.length}`);
    }
  }

  const old: Feed = (await env.NEWS.get('feed', 'json')) || { updatedAt: '', items: [] };
  const merged = new Map<string, FeedItem>();
  for (const i of [...items, ...old.items]) if (!merged.has(i.id)) merged.set(i.id, i);
  const feed: Feed = {
    updatedAt: now,
    items: [...merged.values()].sort((a, b) => b.published.localeCompare(a.published)).slice(0, FEED_SIZE),
  };
  await env.NEWS.put('feed', JSON.stringify(feed));
  await env.NEWS.put('updatedAt', now);
  if (!dry) await env.NEWS.put('seen', JSON.stringify(seen)); // only after success, so a failed run retries the same items
  log.push(`feed now ${feed.items.length} items`);
  return log;
}

function toItem(b: RawItem, fetched: string, f: Pick<FeedItem, 'title_zh' | 'summary_zh' | 'members' | 'category' | 'importance'>): FeedItem {
  return { id: b.id, ...f, source: b.source, source_type: b.source_type, url: b.url, title_orig: b.title, published: b.published, fetched };
}

/* -------------------------------- HTTP --------------------------------- */

function cors(req: Request): Record<string, string> {
  const o = req.headers.get('origin');
  const h: Record<string, string> = { vary: 'Origin' };
  if (o && ALLOWED_ORIGINS.some(re => re.test(o))) {
    h['access-control-allow-origin'] = o;
    h['access-control-allow-methods'] = 'GET, OPTIONS';
    h['access-control-max-age'] = '86400';
  }
  return h;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname !== '/api/news') return new Response('Not found', { status: 404 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: cors(req) });
    const feed: Feed = (await env.NEWS.get('feed', 'json')) || { updatedAt: '', items: [] };
    return new Response(JSON.stringify({ updatedAt: feed.updatedAt, items: feed.items }), {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', ...cors(req) },
    });
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      run(env).then(
        log => console.log(log.join('\n')),
        err => console.error('run failed:', err instanceof Error ? err.message : err),
      ),
    );
  },
} satisfies ExportedHandler<Env>;
