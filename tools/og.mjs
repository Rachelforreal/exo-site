// Generate 1200×630 Open Graph images into site/img/og/ (one per member + home.jpg).
// Run: node tools/og.mjs   (needs: `cd tools && npm i` for sharp, and Google Chrome; set CHROME=/path if not on macOS default)
// Renders tools/og-template.html with headless Chrome (so the site's own web fonts are used), then encodes JPEG with sharp (< 150 KB).
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const site = path.join(root, 'site');
const chrome = process.env.CHROME || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
if (!chrome) throw new Error('Chrome not found; set CHROME=...');
const members = JSON.parse(readFileSync(path.join(site, 'data/members.json'), 'utf8'));

// per-member text colour that reads on paper = the --ac the paper edition already uses
const css = readFileSync(path.join(site, 'css/paper.css'), 'utf8');
const ac = {}; for (const m of members) { const r = css.match(new RegExp(`data-power=${m.id}\\]\\s*\\{[^}]*--ac:\\s*(#[0-9a-fA-F]{3,6})`)); ac[m.id] = r ? r[1] : '#1a2039'; }

const types = { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript' };
const srv = createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); const p = u.pathname === '/_og.html' ? path.join(root, 'tools/og-template.html') : path.join(site, decodeURIComponent(u.pathname));
  if (!p.startsWith(root) || !existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p));
}).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const port = srv.address().port;
const out = path.join(site, 'img/og'); mkdirSync(out, { recursive: true });
const tmp = path.join(tmpdir(), `og-${process.pid}`); mkdirSync(tmp, { recursive: true });

for (const id of ['home', ...members.map(m => m.id)]) {
  const png = path.join(tmp, `${id}.png`);
  const url = `http://127.0.0.1:${port}/_og.html?id=${id}&ac=${encodeURIComponent(JSON.stringify(ac))}`;
  await promisify(execFile)(chrome, ['--headless=new', `--user-data-dir=${path.join(tmp, 'profile-' + id)}`, '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=8000', `--screenshot=${png}`, url], { timeout: 60000 }); // async: the local server lives in this process
  let q = 84, buf;
  do { buf = await sharp(png).resize(1200, 630).jpeg({ quality: q, mozjpeg: true }).toBuffer(); q -= 6; } while (buf.length > 145 * 1024 && q > 40);
  writeFileSync(path.join(out, `${id}.jpg`), buf);
  console.log(`site/img/og/${id}.jpg`, (buf.length / 1024).toFixed(0) + ' KB');
}
srv.close(); rmSync(tmp, { recursive: true, force: true });
