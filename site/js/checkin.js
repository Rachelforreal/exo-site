/* 签到打卡：每天第一次打开站点记为一次签到（localStorage exo-visits，日期列表）。
   连续天数 = 截至今天连续签到的天数；累计天数 = 签到过的总天数。
   累计达到 7 / 30 / 100 / 365 天解锁封面边框与 L 卡徽章（按累计解锁，不会因断签丢失）。 */
import { esc, toast } from './util.js';

const KEY = 'exo-visits';
export const TIERS = [7, 30, 100, 365];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function readVisits() {
  try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(d => DATE.test(d)) : []; }
  catch { return []; }
}

/* records today; returns the full sorted list */
export function recordVisit(today) {
  const a = readVisits();
  if (!a.includes(today)) {
    a.push(today); a.sort();
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(-1000))); } catch { /* storage blocked: just don't persist */ }
  }
  return a;
}

const addDays = (s, k) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10); };

export function streakOf(visits, today) {
  const set = new Set(visits); let d = today, n = 0;
  while (set.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

export const tierOf = total => TIERS.filter(t => total >= t).pop() || 0;
export const nextTier = total => TIERS.find(t => t > total) || null;

/* short label for the L card, e.g. "30 天徽章"; empty before the first tier */
export function cardBadge() {
  const t = tierOf(readVisits().length);
  return t ? `${t} 天徽章` : '';
}

/* fills [data-checkin]; sets <html data-tier> so the cover photo can show its border */
export function renderCheckin(root, today, birthdayName) {
  const visits = readVisits(), total = visits.length, streak = streakOf(visits, today), done = visits.includes(today);
  const tier = tierOf(total), next = nextTier(total);
  const html = document.documentElement;
  if (tier) html.dataset.tier = String(tier); else delete html.dataset.tier;
  const parts = [`连续签到 <b>${streak}</b> 天`, `累计 <b>${total}</b> 天`];
  parts.push(next ? `再 ${next - total} 天解锁 ${next} 天徽章` : '全部徽章已解锁');
  if (birthdayName) parts.push(`今天是 ${esc(birthdayName)} 的生日，封面换成他的生日特辑`);
  root.innerHTML = parts.join(' · ');
  /* manual check-in: the button records today; re-render updates the streak, badge and border */
  const btn = root.parentElement.querySelector('[data-checkin-btn]');
  if (btn) {
    btn.disabled = done;
    btn.textContent = done ? '今日已签到' : '今日签到';
    btn.onclick = () => { recordVisit(today); renderCheckin(root, today, birthdayName); toast('签到成功'); };
  }
}
