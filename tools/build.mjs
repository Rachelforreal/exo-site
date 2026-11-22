// Build site/data/*.json from the two sources. Run: node tools/build.mjs
//   data/new/*.json  — the newer research (wins on any conflict)
//   data/base.json   — the old 刊物 site's data: eras, lyrics, road, variety, songs, anniversaries
//   data/new/awards.json — awards per album (optional until research is done)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = p => JSON.parse(readFileSync(root + p, 'utf8'));
const out = (name, v) => { writeFileSync(`${root}site/data/${name}.json`, JSON.stringify(v)); console.log(`site/data/${name}.json`, (JSON.stringify(v).length / 1024).toFixed(1) + ' KB'); };
mkdirSync(root + 'site/data', { recursive: true });

const base = read('data/base.json');
const lyrics = read('data/lyrics.json');
const awards = existsSync(root + 'data/new/awards.json') ? read('data/new/awards.json') : { albums: {} };

// straight copies: the newer data is authoritative
for (const k of ['members', 'news', 'events', 'channels', 'hero', 'meta']) out(k, read(`data/new/${k}.json`));

// albums: add the old site's era notes (matched by release date), the day's lyric, and awards
const albums = read('data/new/albums.json').map(a => {
  const i = base.eras.findIndex(e => e.date === a.date);
  const e = base.eras[i];
  const aw = awards.albums?.[a.slug];
  return {
    ...a,
    motif: a.motifOverride || e?.motif || null,
    ...(e ? {
      tags: String(e.concept || '').split(/[、，,。]/).map(s => s.trim()).filter(Boolean),
      lyric: lyrics[i] || null,
    } : {}),
    ...(aw ? { awards: aw } : {}),
  };
});
out('albums', albums);

// The expanded archive lives with the newer research. Older copies use the base archive.
const archive = existsSync(root + 'data/new/archive.json') ? read('data/new/archive.json') : {};
const supplementPath = 'data/new/archive-supplement.json';
const supplement = existsSync(root + supplementPath) ? read(supplementPath) : null;
out('archive', {
  debut: base.group.debut,
  anniversaries: base.group.anniversaries,
  road: archive.road ?? base.road,
  variety: archive.variety ?? base.variety,
  songs: base.songs,
  awardsCheckedAt: awards.checkedAt || null,
  ...(archive.eraGallery ? { eraGallery: archive.eraGallery } : {}),
  ...(supplement ? { supplement } : {}),
});

// ---- calendar subscriptions: site/cal/exo.ics + site/cal/<member>.ics (RFC 5545) ----
{
  const SITE = 'https://www.exolneverland.com';
  const members = read('data/new/members.json');
  const events = read('data/new/events.json');
  const enc = new TextEncoder();
  const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = line => { // 75 octets per line, never split a multi-byte character
    const parts = []; let cur = '', n = 0;
    for (const ch of line) {
      const b = enc.encode(ch).length;
      if (n + b > 75) { parts.push(cur); cur = ' '; n = 1; }
      cur += ch; n += b;
    }
    parts.push(cur); return parts.join('\r\n');
  };
  const ymd = s => s.replace(/-/g, '');
  const addDays = (s, k) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10); };
  const utcStamp = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const now = new Date(), stamp = utcStamp(now), today = now.toISOString().slice(0, 10), cutoff = addDays(today, -30);
  const VL = { official: '官方', media: '媒体', unverified: '待核实' };

  const vevent = (uid, props) => ['BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${stamp}`, ...props, 'END:VEVENT'];
  const fromEvent = (e, url) => {
    const v = e.verification || 'unverified';
    const src = (e.sources || []).find(s => s && s.url);
    const desc = [e.summary, `核验：${VL[v] || VL.unverified}`, src && src.url].filter(Boolean).join('\n');
    const p = [`SUMMARY:${esc((v === 'unverified' ? '[待核实] ' : '') + e.title)}`];
    if (e.endDate && e.endDate > e.date) {
      if (e.endTimeKST) {
        const s = new Date(`${e.date}T${e.timeKST || '00:00'}:00+09:00`);
        const en = new Date(`${e.endDate}T${e.endTimeKST}:00+09:00`);
        p.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(en)}`);
      } else {
        p.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.endDate, 1))}`);
      }
    } else if (e.timeKST) {
      const s = new Date(`${e.date}T${e.timeKST}:00+09:00`);
      p.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(new Date(s.getTime() + 2 * 3600e3))}`);
    } else {
      p.push(`DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(addDays(e.date, 1))}`);
    }
    p.push(`DESCRIPTION:${esc(desc)}`);
    const loc = [e.venue, e.city].filter(Boolean).join(', ');
    if (loc) p.push(`LOCATION:${esc(loc)}`);
    p.push(`URL:${url}`);
    return vevent(`${e.id}@exolneverland.com`, p);
  };
  const yearly = (uid, name, start, url) => vevent(uid, [`DTSTART;VALUE=DATE:${ymd(start)}`, `DTEND;VALUE=DATE:${ymd(addDays(start, 1))}`, 'RRULE:FREQ=YEARLY', `SUMMARY:${esc(name)}`, `URL:${url}`, 'TRANSP:TRANSPARENT']);
  const birthday = (m, url) => yearly(`birthday-${m.id}@exolneverland.com`, `${m.zh}（${m.en}）生日`, m.birth, url);
  const wrap = (name, items) => [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//exolneverland.com//EXO 星球//ZH', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Asia/Seoul', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    ...items.flat(), 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';

  const live = events.filter(e => e.verification !== 'unverified' && (e.endDate || e.date) >= cutoff);
  mkdirSync(root + 'site/cal', { recursive: true });
  const wr = (file, name, items) => { const t = wrap(name, items); writeFileSync(`${root}site/cal/${file}`, t); console.log(`site/cal/${file}`, items.length, 'items'); };
  const sched = `${SITE}/#schedule`;
  wr('exo.ics', 'EXO 星球 · 行程', [
    ...live.map(e => fromEvent(e, sched)),
    ...members.map(m => birthday(m, sched)),
    ...(base.group.anniversaries || []).map((a, i) => yearly(`anniversary-${i + 1}@exolneverland.com`,
      a.name.replace(/\s*\{n\}\s*周年/, '纪念日').replace(/\s*\{n\}\s*/, ' ').trim(), `${a.since}-${String(a.md[0]).padStart(2, '0')}-${String(a.md[1]).padStart(2, '0')}`, sched)),
  ]);
  for (const m of members) {
    const url = `${SITE}/member.html?id=${m.id}`;
    wr(`${m.id}.ics`, `EXO 星球 · ${m.en}`, [...live.filter(e => (e.members || []).includes(m.id)).map(e => fromEvent(e, url)), birthday(m, url)]);
  }
}

// member share pages: site/m/<id>/index.html, generated from site/member.html.
// <base href="/"> keeps every relative asset/data/link path valid from /m/<id>/ (served from site/ locally or at the site root).
// Per-member title, description, og:*, twitter:card, canonical. og:image = site/img/og/<id>.jpg (node tools/og.mjs).
{
  const ORIGIN = 'https://www.exolneverland.com';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const tpl = readFileSync(root + 'site/member.html', 'utf8');
  const members = read('data/new/members.json');
  for (const m of members) {
    const title = `${m.en} ${m.zh} · 单人专栏 · EXO 星球`;
    const desc = clip(`${m.power.zh}（${m.power.en}）。${m.status || m.power.line}`, 140);
    const url = `${ORIGIN}/m/${m.id}/`;
    const head = [
      `<base href="/">`,
      `<link rel="canonical" href="${url}">`,
      `<meta property="og:type" content="profile">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(title)}">`,
      `<meta name="twitter:description" content="${esc(desc)}">`,
      `<meta name="twitter:image" content="${ORIGIN}/img/og/${m.id}.jpg">`,
    ].join('\n');
    const h = tpl
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
      .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`)
      .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
      .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${ORIGIN}/img/og/${m.id}.jpg">`)
      .replace(/(<meta name="viewport"[^>]*>)/, `$1\n${head}`);
    if (!h.includes(`og/${m.id}.jpg`) || !h.includes('<base href="/">')) throw new Error('member.html head changed, update build.mjs: ' + m.id);
    mkdirSync(`${root}site/m/${m.id}`, { recursive: true });
    writeFileSync(`${root}site/m/${m.id}/index.html`, h);
  }
  console.log(`site/m/<id>/index.html × ${members.length}`);
}
