// The old 日历 lives on inside 行程: birthdays and anniversaries become rows of the schedule.
// They are generated for their next occurrence, so they never go stale.
import { todayStr } from './util.js';

const pad = n => String(n).padStart(2, '0');
function nextOn(month, day, today) {
  const y = +today.slice(0, 4);
  const d = `${y}-${pad(month)}-${pad(day)}`;
  return d >= today ? d : `${y + 1}-${pad(month)}-${pad(day)}`;
}
const row = (o) => ({ summary: '', venue: null, city: null, timeKST: null, endDate: null, ticket: {}, status: 'upcoming', verification: 'official', channel: '档案', sources: [], generated: true, ...o });

export function withCalendar(ctx) {
  const today = todayStr();
  const extra = [];
  for (const m of ctx.members) {
    const [by, bm, bd] = m.birth.split('-').map(Number);
    const date = nextOn(bm, bd, today);
    extra.push(row({ id: `bd-${m.id}`, title: `${m.en} ${m.zh} 生日`, summary: `${+date.slice(0, 4) - by} 岁生日 · ${m.power.zh}`, members: [m.id], category: '生日', date }));
  }
  for (const [i, a] of (ctx.archive?.anniversaries || []).entries()) {
    const date = nextOn(a.md[0], a.md[1], today);
    extra.push(row({ id: `an-${i}`, title: a.name.replace('{n}', +date.slice(0, 4) - a.since), summary: '纪念日', members: ['group'], category: '纪念日', date }));
  }
  return [...ctx.events, ...extra];
}
