/**
 * EXO 星球 · 站长留言板飞书推送中转 (Cloudflare Worker)
 *
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard -> Workers & Pages -> Create -> Create Worker
 * 2. 将本文件内容粘贴进去并点击 Deploy
 * 3. 在 Worker 的 Settings -> Variables and Secrets 中添加环境变量：
 *    - FEISHU_WEBHOOK: 飞书群自定义机器人的 Webhook 地址
 * 4. 把 Worker 的访问地址（如 https://exo-guestbook.xxx.workers.dev）
 *    填入 site/js/guestbook.js 顶部的 FEISHU_RELAY_URL 即可。
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS_HEADERS });
    }
    if (!env.FEISHU_WEBHOOK) {
      return new Response('Missing FEISHU_WEBHOOK', { status: 500, headers: CORS_HEADERS });
    }

    let data = {};
    try {
      data = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400, headers: CORS_HEADERS });
    }

    const lines = [
      `分类：${data.topic || '建议'}`,
      `本命：${data.badge || 'EXO'}`,
      `昵称：${data.author || '匿名爱丽'}`,
      data.contact ? `联系方式：${data.contact}` : null,
      `时间：${data.time || ''}`,
      `内容：\n${data.text || ''}`,
      data.page ? `来源：${data.page}` : null,
    ].filter(Boolean);

    const payload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: 'EXO 星球 · 收到一条新留言',
            content: [[{ tag: 'text', text: lines.join('\n') }]],
          },
        },
      },
    };

    const res = await fetch(env.FEISHU_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return new Response(JSON.stringify({ ok: res.ok }), {
      status: res.ok ? 200 : 502,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
