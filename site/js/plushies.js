// 成员官娃简笔画（7 位已有官娃成员）+ 暂无官娃成员姓名印记 + 章节伴读彩蛋
// References official EXO cartoon doll line-art (Suho, Lay, Chanyeol, D.O., Kai, Sehun) & Baekhyun's official Teolaegi (터래기);
// XIUMIN and CHEN currently have no official doll in this lineup and are represented cleanly by their names.
import { $, $$, esc, glyph, store, toast, reduced } from './util.js';

export const PLUSHIES = [
  {
    id: 'xiumin', no: '01', hasDoll: false, name: 'XIUMIN', en: 'XIUMIN · NAME',
    animal: '暂无官娃 · 姓名印记', bg: '#e6f1ff', accent: '#3c7db8',
    zhName: '金珉锡',
    fact: '暂无官娃形象，此处先以成员名字呈现。出道设定为冻结空间的六出雪花；2019 年作为大哥第一个入伍，退伍归队时带回了《DON\'T FIGHT THE FEELING》。',
    line: '「已为你切到 XIUMIN 专属名字印记，可直接去下方工坊生成人物或名字锁屏。」'
  },
  {
    id: 'suho', no: '02', hasDoll: true, name: 'SUHO 官娃', en: 'SUHO OFFICIAL DOLL',
    animal: '偏耳白兔简笔画', bg: '#e3f0ff', accent: '#2463c9',
    zhName: '金俊勉',
    fact: '参考官方卡通简笔画：两只粉内耳长兔耳一齐向右倾垂，搭配自信挑眉与上扬兔嘴；总队长金俊勉喊出「WE ARE ONE」十余年。',
    line: '「九个人的档案都在这儿，点『速览档案』不用离开首页就能看全。」'
  },
  {
    id: 'lay', no: '03', hasDoll: true, name: 'LAY 官娃', en: 'LAY OFFICIAL DOLL',
    animal: '紫鬃独角兽简笔画', bg: '#f0e6f7', accent: '#7b5299',
    zhName: '张艺兴',
    fact: '参考官方卡通简笔画：蓬松紫色云朵卷鬃与额前卷刘海，头顶条纹独角、粉嫩猪鼻式圆吻；呼应张艺兴「治愈独角兽」超能力设定。',
    line: '「每张专辑的六边形标志都不一样，点开曲目单还能看双语代表词。」'
  },
  {
    id: 'baekhyun', no: '04', hasDoll: true, name: '特来骑 Teolaegi', en: 'TEOLAEGI · 터래기',
    animal: '伯贤官娃小柯基', bg: '#fff3d6', accent: '#c77724',
    zhName: '边伯贤',
    fact: '参考边伯贤亲自参与设计的官方玩偶「特来骑（터래기 / Teolaegi）」图纸：暖杏色圆脸配焦糖色描边、白耳芯、豆豆眼与灵魂「\'.ㅅ\'」嘴角小痣。',
    line: '「来第 06 栏 DIY 壁纸工坊！可以把特来骑和其他官娃简笔画贴到手机锁屏上。」'
  },
  {
    id: 'chen', no: '05', hasDoll: false, name: 'CHEN', en: 'CHEN · NAME',
    animal: '暂无官娃 · 姓名印记', bg: '#fff6d9', accent: '#9c7400',
    zhName: '金钟大',
    fact: '暂无官娃形象，此处先以成员名字呈现。超能力设定为掌控雷电，自 2014 年《没关系，是爱情啊》起唱响多首国民级韩剧 OST。',
    line: '「已为你切到 CHEN 专属名字印记，可直接搭配写真或名字印章制作锁屏壁纸。」'
  },
  {
    id: 'chanyeol', no: '06', hasDoll: true, name: 'CHANYEOL 官娃', en: 'CHANYEOL OFFICIAL DOLL',
    animal: '粉兜帽小狗简笔画', bg: '#ffe6ea', accent: '#d15366',
    zhName: '朴灿烈',
    fact: '参考官方卡通简笔画：珊瑚粉垂耳连帽斗篷里露出奶杏色小卷毛刘海，白色吻部配圆鼻与「ω」狗狗笑脸。',
    line: '「行程太多别眼花，右上角搜索框能直接按成员+时间挑出你想看的场次！」'
  },
  {
    id: 'do', no: '07', hasDoll: true, name: 'D.O. 官娃', en: 'D.O. OFFICIAL DOLL',
    animal: '绿叶粉桃企鹅简笔画', bg: '#ffe8eb', accent: '#c95f6b',
    zhName: '都暻秀',
    fact: '参考官方卡通简笔画：蜜桃粉圆润头套顶端长出一片小绿叶，白色脸庞上是极具辨识度的平直浓眉、亮眼与小小「o」型嘴。',
    line: '「编年表和巡演场次都默认帮你折好了，点开就能看完整节点与各站当地时间。」'
  },
  {
    id: 'kai', no: '08', hasDoll: true, name: 'KAI 官娃', en: 'KAI OFFICIAL DOLL',
    animal: '齐刘海棕熊简笔画', bg: '#f5e6dc', accent: '#6a4b3b',
    zhName: '金钟仁',
    fact: '参考官方卡通简笔画：深可可棕圆耳小熊，额前有可爱的波浪分缝刘海，搭配微挑眉、水亮圆眼与呆萌小圆嘴。',
    line: '「试试把鼠标移到封面上晃一晃，或者点下面的印记翻页看看！」'
  },
  {
    id: 'sehun', no: '09', hasDoll: true, name: 'SEHUN 官娃', en: 'SEHUN OFFICIAL DOLL',
    animal: '眯眼小黄鸡简笔画', bg: '#fff9cc', accent: '#c98a12',
    zhName: '吴世勋',
    fact: '参考官方卡通简笔画：明黄圆润的忙内小鸡形象，平眉眯眼笑（「> <」）配橙黄菱形小尖喙与浅粉腮红。',
    line: '「逛到底啦！快去上面的壁纸工坊保存一张专属官娃锁屏吧。」'
  }
];

export function hasOfficialDoll(id) {
  return Boolean(PLUSHIES.find(x => x.id === id)?.hasDoll);
}

// Hand-crafted SVG: 7 official cartoon doll line-art heads + clean typographic name seals for XIUMIN & CHEN
export function plushieSVG(id, { size = 88 } = {}) {
  const p = PLUSHIES.find(x => x.id === id) || PLUSHIES[0];
  let inner = '';

  if (!p.hasDoll) {
    const fs = p.id === 'xiumin' ? 16.5 : 20;
    inner = `
      <circle cx="50" cy="52" r="39" fill="${p.bg}" stroke="${p.accent}" stroke-width="2.6"/>
      <circle cx="50" cy="52" r="33" fill="none" stroke="${p.accent}" stroke-width="1.2" stroke-dasharray="3 3" opacity=".55"/>
      <text x="50" y="34" text-anchor="middle" font-family="Jost, 'Schibsted Grotesk', sans-serif" font-size="9.5" font-weight="700" letter-spacing="1.4" fill="${p.accent}">NO.${p.no}</text>
      <text x="50" y="57" text-anchor="middle" font-family="'Schibsted Grotesk', Jost, sans-serif" font-size="${fs}" font-weight="800" letter-spacing="1" fill="#151a2d">${p.name}</text>
      <text x="50" y="73" text-anchor="middle" font-family="'PingFang SC', 'Noto Serif SC', sans-serif" font-size="11" font-weight="600" fill="${p.accent}">${p.zhName}</text>`;
    return `<svg class="plush-svg plush-svg--name" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
  }

  if (id === 'suho') {
    // Official bunny doodle: both long pink-inner ears leaning right, confident brows, shiny eyes, upturned nose-mouth
    inner = `
      <ellipse cx="50" cy="91" rx="24" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="M54 35 C67 16, 87 18, 87 33 C87 44, 73 50, 60 47 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M62 37 C69 26, 80 27, 80 34 C80 40, 71 43, 63 42 Z" fill="#f7b7c7"/>
      <path d="M40 33 C48 9, 71 8, 73 23 C75 34, 62 42, 48 39 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M48 31 C53 17, 66 16, 67 24 C68 30, 59 35, 50 34 Z" fill="#f7b7c7"/>
      <path d="M17 64 C16 40, 31 29, 50 29 C69 29, 84 40, 83 64 C82 80, 68 87, 50 87 C32 87, 18 80, 17 64 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M35 48 Q39 45.5 43 48.5" fill="none" stroke="#231f20" stroke-width="3" stroke-linecap="round"/>
      <path d="M65 48 Q61 45.5 57 48.5" fill="none" stroke="#231f20" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="39.5" cy="58" rx="5" ry="5.5" fill="#231f20"/><ellipse cx="38.4" cy="56" rx="2.4" ry="2.2" fill="#ffffff"/>
      <ellipse cx="60.5" cy="58" rx="5" ry="5.5" fill="#231f20"/><ellipse cx="59.4" cy="56" rx="2.4" ry="2.2" fill="#ffffff"/>
      <ellipse cx="31.5" cy="65.5" rx="5.8" ry="3.6" fill="#f7b7c7"/>
      <ellipse cx="68.5" cy="65.5" rx="5.8" ry="3.6" fill="#f7b7c7"/>
      <path d="M46.5 65.5 Q49.8 59.5 53 64.5" fill="none" stroke="#231f20" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="50" cy="60.5" r="1.5" fill="#231f20"/>`;
  } else if (id === 'lay') {
    // Official unicorn doodle: scalloped purple cloud mane + higher curl forelock, striped horn, pink oval snout with 2 nostrils
    inner = `
      <ellipse cx="50" cy="92" rx="26" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="M24 37 C14 37, 10 47, 15 55 C9 62, 12 74, 21 77 C24 85, 36 88, 44 84 C48 87, 52 87, 56 84 C64 88, 76 85, 79 77 C88 74, 91 62, 85 55 C90 47, 86 37, 76 37 C73 26, 61 22, 50 25 C39 22, 27 26, 24 37 Z" fill="#b796c6" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M19 66 C16 62, 20 58, 23 61 M81 66 C84 62, 80 58, 77 61" fill="none" stroke="#231f20" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M28 43 C17 38, 17 29, 31 34 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M72 43 C83 38, 83 29, 69 34 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M26 61 C26 42, 36 35, 50 35 C64 35, 74 42, 74 61 C74 75, 64 81, 50 81 C36 81, 26 75, 26 61 Z" fill="#ffffff" stroke="#231f20" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M44.5 26 L50 8 L55.5 26 Z" fill="#fff3b8" stroke="#231f20" stroke-width="3.2" stroke-linejoin="round"/>
      <path d="M46.5 20 L53.8 18.5 M48 14.5 L52.3 13.5" stroke="#b796c6" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M37 35 C35 25, 46 21, 54 24 C63 24, 66 33, 60 39 C55 44, 44 44, 40 39 C38 36, 42 33, 46 35" fill="#b796c6" stroke="#231f20" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <ellipse cx="36" cy="56.5" rx="2.6" ry="3.3" fill="#231f20"/>
      <ellipse cx="64" cy="56.5" rx="2.6" ry="3.3" fill="#231f20"/>
      <circle cx="31" cy="65.5" r="4.6" fill="#f39db2"/>
      <circle cx="69" cy="65.5" r="4.6" fill="#f39db2"/>
      <ellipse cx="50" cy="64.5" rx="9.5" ry="6.5" fill="#f7aec0"/>
      <ellipse cx="47" cy="64.5" rx="1.5" ry="2.2" fill="#231f20"/>
      <ellipse cx="53" cy="64.5" rx="1.5" ry="2.2" fill="#231f20"/>`;
  } else if (id === 'baekhyun') {
    // Official Teolaegi (터래기 / 特来骑): apricot head, caramel outline, white ear cores & lower muzzle, bean eyes, '.ㅅ' mouth + mole
    const headPath = 'M21 44 C19 18, 35 11, 47 27 Q50 26.5 53 27 C65 11, 81 18, 79 44 C85 56, 83 76, 70 84 C59 90, 41 90, 30 84 C17 76, 15 56, 21 44 Z';
    inner = `
      <ellipse cx="50" cy="92" rx="26" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="${headPath}" fill="#ffe0a3"/>
      <path d="M22 78 C30 64, 41 58, 50 58 C59 58, 70 64, 78 78 C67 88, 33 88, 22 78 Z" fill="#ffffff"/>
      <path d="${headPath}" fill="none" stroke="#d88935" stroke-width="3.8" stroke-linejoin="round"/>
      <path d="M27 39 C26 25, 35 21, 42 32 C37 35, 31 37, 27 39 Z" fill="#ffffff" stroke="#d88935" stroke-width="3" stroke-linejoin="round"/>
      <path d="M73 39 C74 25, 65 21, 58 32 C63 35, 69 37, 73 39 Z" fill="#ffffff" stroke="#d88935" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="38.5" cy="54.5" rx="2.6" ry="4.3" transform="rotate(14 38.5 54.5)" fill="#d88935"/>
      <ellipse cx="61.5" cy="54.5" rx="2.6" ry="4.3" transform="rotate(10 61.5 54.5)" fill="#d88935"/>
      <path d="M46.2 70.5 L50.2 62.5 M49.8 64.2 L55.2 69.5" fill="none" stroke="#d88935" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="42.5" cy="68.5" r="1.4" fill="#9c6a44"/>`;
  } else if (id === 'chanyeol') {
    // Official puppy doodle: long drooping coral-pink puppy ears + hood, cream face with curly hair tuft, white muzzle & ω mouth
    inner = `
      <ellipse cx="50" cy="91" rx="25" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="M26 33 C11 36, 4 53, 10 63 C14 68, 21 63, 22 54 Z" fill="#ec7b8a" stroke="#231f20" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M74 33 C89 36, 96 53, 90 63 C86 68, 79 63, 78 54 Z" fill="#ec7b8a" stroke="#231f20" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M18 61 C18 34, 31 24, 50 24 C69 24, 82 34, 82 61 C82 78, 69 86, 50 86 C31 86, 18 78, 18 61 Z" fill="#ec7b8a" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M24 62 C24 41, 35 33, 50 33 C65 33, 76 41, 76 62 C76 76, 65 83, 50 83 C35 83, 24 76, 24 62 Z" fill="#fde2b8" stroke="#231f20" stroke-width="3.4" stroke-linejoin="round"/>
      <path d="M43 34 C42 42, 50 43, 50.5 36.5 C52.5 41.5, 58.5 40, 57 34" fill="#fde2b8" stroke="#231f20" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="31" cy="64" r="5.8" fill="#f18b99"/>
      <circle cx="69" cy="64" r="5.8" fill="#f18b99"/>
      <ellipse cx="50" cy="64" rx="11" ry="8.6" fill="#ffffff"/>
      <ellipse cx="50" cy="59.5" rx="3.4" ry="2.4" fill="#231f20"/>
      <path d="M44.5 63.5 Q47.2 67.5 50 63.5 Q52.8 67.5 55.5 63.5" fill="none" stroke="#231f20" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="37" cy="56.5" r="3.2" fill="#231f20"/>
      <circle cx="63" cy="56.5" r="3.2" fill="#231f20"/>`;
  } else if (id === 'do') {
    // Official peach-penguin doodle: top green leaf sprout, soft pink hood, white face, thick straight brows, tiny oval mouth
    inner = `
      <ellipse cx="50" cy="91" rx="24" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="M50 28 L49 20" stroke="#231f20" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M49.5 21.5 C53 14, 64 15.5, 62 22.5 C59 26.5, 52 25, 49.5 21.5 Z" fill="#8ed06b" stroke="#231f20" stroke-width="3" stroke-linejoin="round"/>
      <path d="M19 63 C19 36, 32 27, 50 27 C68 27, 81 36, 81 63 C81 79, 68 86, 50 86 C32 86, 19 79, 19 63 Z" fill="#f5a7ad" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M27 64 C27 44, 36 38, 50 38 C64 38, 73 44, 73 64 C73 77, 63 82, 50 82 C37 82, 27 77, 27 64 Z" fill="#ffffff"/>
      <rect x="34" y="46.5" width="9.5" height="3.8" rx="1.9" fill="#231f20"/>
      <rect x="56.5" y="46.5" width="9.5" height="3.8" rx="1.9" fill="#231f20"/>
      <ellipse cx="39" cy="56.5" rx="3.5" ry="4.5" fill="#231f20"/><circle cx="38" cy="54.8" r="1.4" fill="#ffffff"/>
      <ellipse cx="61" cy="56.5" rx="3.5" ry="4.5" fill="#231f20"/><circle cx="60" cy="54.8" r="1.4" fill="#ffffff"/>
      <ellipse cx="33" cy="66" rx="5.5" ry="3.8" fill="#f7b2b9"/>
      <ellipse cx="67" cy="66" rx="5.5" ry="3.8" fill="#f7b2b9"/>
      <ellipse cx="50" cy="64" rx="2.5" ry="3.3" fill="#f39aa3" stroke="#231f20" stroke-width="2.4"/>`;
  } else if (id === 'kai') {
    // Official brown bear doodle: chubby wide bear head, soft scalloped bear bangs, gentle confident brows, shiny round eyes & tiny 'o' mouth
    const bearHead = 'M15 61 C15 35, 30 26, 50 26 C70 26, 85 35, 85 61 C85 79, 71 86, 50 86 C29 86, 15 79, 15 61 Z';
    inner = `
      <ellipse cx="50" cy="91" rx="26" ry="4" fill="rgba(17,22,37,.09)"/>
      <circle cx="23" cy="32" r="10.5" fill="#6a4b3b" stroke="#231f20" stroke-width="3.6"/><circle cx="23" cy="32" r="5" fill="#e2bc9b"/>
      <circle cx="77" cy="32" r="10.5" fill="#6a4b3b" stroke="#231f20" stroke-width="3.6"/><circle cx="77" cy="32" r="5" fill="#e2bc9b"/>
      <path d="${bearHead}" fill="#6a4b3b"/>
      <path d="M21 57 C27 54, 34 49, 37 42 C42 49, 58 49, 63 42 C66 49, 73 54, 79 57 C81 71, 72 82, 50 82 C28 82, 19 71, 21 57 Z" fill="#eac4a3"/>
      <path d="${bearHead}" fill="none" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <path d="M35.5 53.5 L40.5 55" stroke="#231f20" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M64.5 53.5 L59.5 55" stroke="#231f20" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="36.5" cy="62" r="4.8" fill="#231f20"/><circle cx="35" cy="60.2" r="1.7" fill="#ffffff"/>
      <circle cx="63.5" cy="62" r="4.8" fill="#231f20"/><circle cx="62" cy="60.2" r="1.7" fill="#ffffff"/>
      <ellipse cx="28" cy="70" rx="5.5" ry="3.6" fill="#e29598"/>
      <ellipse cx="72" cy="70" rx="5.5" ry="3.6" fill="#e29598"/>
      <ellipse cx="50" cy="64.5" rx="2" ry="2.6" fill="#231f20"/>
      <circle cx="50" cy="71.5" r="2.1" fill="#d98c8c" stroke="#231f20" stroke-width="1.9"/>`;
  } else {
    // sehun — Official yellow chick doodle: wide lemon-yellow mochi head, spaced flat-brow '> <' squinting eyes, compact orange diamond beak
    inner = `
      <ellipse cx="50" cy="91" rx="25" ry="4" fill="rgba(17,22,37,.09)"/>
      <path d="M15 63 C15 38, 30 30, 50 30 C70 30, 85 38, 85 63 C85 79, 70 86, 50 86 C30 86, 15 79, 15 63 Z" fill="#fff066" stroke="#231f20" stroke-width="3.6" stroke-linejoin="round"/>
      <ellipse cx="26" cy="68" rx="5.5" ry="3.5" fill="#f8b4c4" opacity=".88"/>
      <ellipse cx="74" cy="68" rx="5.5" ry="3.5" fill="#f8b4c4" opacity=".88"/>
      <path d="M26 56.5 H37.5 M34 57 L29 62 M33.5 58.5 L37.5 62" fill="none" stroke="#231f20" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M62.5 56.5 H74 M66 57 L71 62 M66.5 58.5 L62.5 62" fill="none" stroke="#231f20" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M44.2 61.5 L50 57 L55.8 61.5 L50 66 Z" fill="#ffad33" stroke="#231f20" stroke-width="3.1" stroke-linejoin="round"/>`;
  }

  return `<svg class="plush-svg" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

export function plushieDataUrl(id) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    plushieSVG(id, { size: 220 }).replace(/class="plush-svg[^"]*"/, 'xmlns="http://www.w3.org/2000/svg"')
  );
}

export function initPlushieEggs(ctx, { onPickForWallpaper } = {}) {
  const found = new Set(store.get('exo-plush-found', []));
  const shelf = $('#plush-shelf');
  const counterEls = () => $$('[data-plush-count]');

  const dollIds = new Set(PLUSHIES.filter(x => x.hasDoll).map(x => x.id));

  function syncProgress() {
    const litDolls = [...found].filter(id => dollIds.has(id)).length;
    const txt = `已点亮 ${litDolls} / ${dollIds.size} 只官娃简笔画（暂无官娃成员以名字呈现）`;
    counterEls().forEach(el => { el.textContent = txt; });
    $$('[data-plush-card]').forEach(el => {
      const id = el.dataset.plushCard;
      const p = PLUSHIES.find(x => x.id === id);
      const has = found.has(id);
      el.classList.toggle('is-found', has);
      const stEl = el.querySelector('.plush-card__stamp');
      if (stEl) stEl.textContent = !p?.hasDoll ? '名字代呈' : (has ? '已点亮' : '点我');
    });
    $$('[data-peek-plush]').forEach(el => el.classList.toggle('is-found', found.has(el.dataset.peekPlush)));
  }

  function collect(id, sourceEl, { silent = false } = {}) {
    const p = PLUSHIES.find(x => x.id === id); if (!p) return;
    const isNew = p.hasDoll && !found.has(id);
    if (!silent) {
      found.add(id);
      store.set('exo-plush-found', [...found]);
    }
    syncProgress();
    if (sourceEl && !reduced) {
      sourceEl.classList.remove('is-hop');
      void sourceEl.offsetWidth;
      sourceEl.classList.add('is-hop');
    }
    if (!silent) {
      const litDolls = [...found].filter(k => dollIds.has(k)).length;
      const doneAll = litDolls === dollIds.size && isNew;
      toast(doneAll
        ? `集齐全部 7 只已有官娃简笔画！快去下方 DIY 壁纸工坊试试吧`
        : `${p.name}（${ctx.byId[id]?.zh || id}）：${p.line}`);
    }
    const detailBox = $('#plush-spotlight');
    if (detailBox) {
      const m = ctx.byId[id];
      const tagNote = p.hasDoll
        ? '参考官方娃娃卡通简笔画重绘（非商业粉丝站展示）'
        : '暂无官娃形象 · 先以成员名字印记代替';
      const btnLabel = p.hasDoll ? '用这只官娃简笔画 DIY 锁屏壁纸 →' : `用 ${m?.en || p.name} 名字印记 DIY 锁屏壁纸 →`;
      detailBox.innerHTML = `
        <div class="plush-spot__fig" style="--pb:${p.bg};--pa:${p.accent}">${plushieSVG(id, { size: 96 })}</div>
        <div class="plush-spot__body">
          <p class="plush-spot__k"><span>NO.${p.no} · ${esc(p.en)}</span><i>·</i><span>${tagNote}</span></p>
          <h4>${esc(p.name)} · ${esc(m?.zh || '')}（${esc(p.animal)}）</h4>
          <p>${esc(p.fact)}</p>
          <div class="plush-spot__acts">
            <button class="cbtn cbtn--sm" type="button" data-use-plush-wp="${p.id}">${esc(btnLabel)}</button>
            <a class="cbtn cbtn--sm cbtn--ghost" href="member.html?id=${p.id}">去 ${esc(m?.en || '')} 专栏</a>
          </div>
        </div>`;
    }
  }

  // 1. Render the 9-slot Shelf (7 official doll line-arts + 2 typographic name placeholders)
  if (shelf) {
    shelf.innerHTML = PLUSHIES.map(p => {
      const m = ctx.byId[p.id];
      const stamp = !p.hasDoll ? '名字代呈' : (found.has(p.id) ? '已点亮' : '点我');
      const sub = p.hasDoll ? `${esc(m?.en || '')} · ${glyph(p.id)}` : `${esc(m?.zh || '')} · 暂无官娃`;
      return `<button class="plush-card${found.has(p.id) ? ' is-found' : ''}${p.hasDoll ? '' : ' is-name-only'}" type="button" data-plush-card="${p.id}" style="--pb:${p.bg};--pa:${p.accent}" aria-label="${esc(p.name)} ${esc(m?.zh || '')}">
        <span class="plush-card__stamp">${stamp}</span>
        <div class="plush-card__art">${plushieSVG(p.id, { size: 74 })}</div>
        <b>${esc(p.name)}</b>
        <small>${sub}</small>
      </button>`;
    }).join('');
    shelf.addEventListener('click', e => {
      const b = e.target.closest('[data-plush-card]');
      if (b) collect(b.dataset.plushCard, b);
    });
    const initId = [...found].reverse().find(k => dollIds.has(k)) || 'baekhyun';
    collect(initId, null, { silent: true });
  }

  const spotBox = $('#plush-spotlight');
  if (spotBox) {
    spotBox.addEventListener('click', e => {
      const btn = e.target.closest('[data-use-plush-wp]');
      if (!btn) return;
      onPickForWallpaper?.(btn.dataset.usePlushWp);
      document.getElementById('maker')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  syncProgress();
  return { collect, plushieSVG, plushieDataUrl };
}
