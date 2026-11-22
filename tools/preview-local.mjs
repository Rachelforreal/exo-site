// Local preview server + Weibo auto-sync endpoint (/api/sync-weibo & /api/news).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWeiboSync } from './sync-weibo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../site');
const port = Number(process.argv[2]) || 4193;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ics': 'text/calendar; charset=utf-8' };

// Auto-sync Weibo every 6 hours while local server is running
setInterval(() => {
  runWeiboSync().catch(err => console.warn('[定时微博同步跳过]', err.message));
}, 6 * 3600 * 1000);

http.createServer(async (req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (urlPath === '/api/news') {
    const feedFile = path.resolve(root, 'data/weibo-feed.json');
    fs.readFile(feedFile, (err, data) => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        .end(err ? '{"items":[]}' : data);
    });
    return;
  }
  if (urlPath === '/api/sync-weibo' && req.method === 'POST') {
    try {
      const summary = await runWeiboSync();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        .end(JSON.stringify({ ok: true, ...summary }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
        .end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }
  const file = path.resolve(root, '.' + (urlPath.endsWith('/') ? `${urlPath}index.html` : urlPath));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(data);
  });
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
