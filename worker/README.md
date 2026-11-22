# EXO 快讯 Worker（exo-news）

每小时自动做一件事：从免费来源收集 EXO 的新消息标题，让 Claude Haiku 5.5（最便宜的模型）筛掉无关内容、写出中文标题和一句话摘要，存进 Cloudflare KV；网站「此刻」栏里的「快讯 · 自动整理」从 `/api/news` 读取并显示。

这条通道和人工整理的「正式公告 / 待核实」完全分开显示，并带有提示：「由程序每小时自动收集并翻译，未经人工核对，请以原文为准」。

## 它收集什么

- Google 新闻 RSS：韩文（엑소 + 成员韩文名）、英文（"EXO" SM Entertainment + 成员英文名）、中文（EXO 成员、成员中文名、EXO-KASE），都只取最近一天。
- YouTube 官方频道 RSS（已逐个打开核对过）：
  - EXO：`UCzCedBCSSltI1TFd3bKyN6g`
  - SMTOWN：`UCEf_Bc-KVd7onSeifS3py9g`（只保留标题里提到 EXO 或成员的）
- 只有这两个官方频道的内容标记为「官方」，其余都是「媒体」。

**没有包含微博、Weverse、贴吧。** 它们都没有免费的公开接口：微博的免费开放接口只能读取「授权账号自己」的微博，读别人的账号需要微博的商业接口；Weverse 和贴吧没有公开接口，抓取页面又违反各自的规则、而且很容易失效。免费的替代办法是上面的中文新闻查询：中文娱乐媒体会转载官博、工作室发布的消息，所以官方微博的大事通常也能间接看到。

已知限制：Google 新闻给的是中转链接（点击后会跳到原文），个别情况下无法还原成原始网址。

## 部署步骤（只做一次）

需要先装好 Node.js（<https://nodejs.org>，选 LTS 版本）。下面所有命令都在终端里、在项目的 `worker` 文件夹内执行。

1. 进入文件夹并安装依赖：

   ```
   cd worker
   npm install
   ```

2. 登录 Cloudflare（会打开浏览器，点同意）：

   ```
   npx wrangler login
   ```

3. 创建存储空间（KV）：

   ```
   npx wrangler kv namespace create NEWS
   ```

   终端会输出一段带 `id = "xxxxxxxx..."` 的内容。打开 `wrangler.toml`，把 `REPLACE_WITH_KV_NAMESPACE_ID` 换成这个 id（保留引号）。

4. 保存 Claude 的密钥（粘贴后回车，输入时屏幕不会显示，正常）：

   ```
   npx wrangler secret put ANTHROPIC_API_KEY
   ```

   密钥只存在 Cloudflare 里，不会进入代码仓库，也不要发给任何人。

5. 部署：

   ```
   npx wrangler deploy
   ```

   成功后会显示一个 `https://exo-news.<你的账号>.workers.dev` 地址，每小时整点会自动运行。

6. 让网站能访问它：把 `www.exolneverland.com/api/*` 指向这个 Worker。二选一：
   - 命令行方式：打开 `wrangler.toml`，去掉最后几行 `routes = [ ... ]` 前面的 `#`，再执行一次 `npx wrangler deploy`。
   - 网页方式：Cloudflare 后台 → Workers & Pages → `exo-news` → Settings → Domains & Routes → Add → Route，Route 填 `www.exolneverland.com/api/*`，Zone 选 `exolneverland.com`，保存。
   （如果还想让不带 www 的域名也可用，再加一条 `exolneverland.com/api/*`。）

7. 立刻跑第一次（不用等整点）：Cloudflare 后台 → Workers & Pages → `exo-news` → Settings → Trigger Events → 在 Cron 旁边点 Run / Test；或者等下一个整点。

## 怎么检查是否正常

- 浏览器打开 <https://www.exolneverland.com/api/news>，应看到 `{"updatedAt": "...", "items": [...]}`。刚部署、还没跑过时 `items` 是空的。
- 打开网站首页「此刻」栏，往下应出现「快讯 · 自动整理」。没有内容时这一块会自动隐藏，不会报错。
- 查看运行记录：`npx wrangler tail`，整点会看到每个来源抓到几条、Claude 用了多少词元（tokens）、保留了几条。
- 打开 `/api/news` 以外的任何路径都会返回 404，这是正常的。

## 想先免费试一试（不调用 Claude）

把 `wrangler.toml` 里的 `DRY_RUN = "0"` 改成 `"1"`：只存原始标题，不花任何钱，`title_zh` 就是原标题。本地测试：

```
npx wrangler dev --test-scheduled --var DRY_RUN:1
```

另开一个终端：

```
curl http://127.0.0.1:8787/__scheduled
curl http://127.0.0.1:8787/api/news
```

本地预览网站时，在 `site/index.html` 的 `<head>` 里临时加一行 `<meta name="exo-api" content="http://127.0.0.1:8787">`，让页面去读本地的 Worker（上线前删掉；线上用同域名，不需要这行）。

## 使用中转服务的 Key

如果你的 Claude Key 来自第三方中转服务（而不是 Anthropic 官方），做法是：

1. 设置中转服务的地址（粘贴后回车）：

   ```
   npx wrangler secret put ANTHROPIC_BASE_URL
   ```

2. Key 仍然放在 `ANTHROPIC_API_KEY` 里，步骤同上。
3. 然后重新 `npx wrangler deploy`。不设置 `ANTHROPIC_BASE_URL` 时，默认直连官方 `api.anthropic.com`。

注意：
- 中转服务能看到被处理的新闻标题（都是公开新闻，敏感度很低）。
- 费用、可用的模型（需要有 `claude-haiku-5-5`）取决于中转服务。
- 有些中转不支持「结构化输出」。程序会自动识别（返回 400 并提到 output_config / format 时），改用「在提示里要求只输出 JSON」重试一次，并在日志里写明走了哪条路径（`path=structured` 或 `path=json-prompt-fallback`）。

## 费用

- Cloudflare：免费套餐足够。每天运行 24 次，KV 写入每次 2–3 次（免费额度每天 1000 次），读取和请求量远低于额度。**¥0。**
- Claude（Haiku 5.5：输入 $0.10 / 百万词元，输出 $0.50 / 百万词元）。我这里没有真实密钥，下面是估算，不是实测：
  - 一次处理满 40 条：约 3,000 词元输入（说明约 700 + 每条标题约 55）+ 约 6,000 词元输出（每条约 130，含少量思考）≈ $0.0033。
  - 平时每小时只有几条新标题，约 1,500 输入 + 1,200 输出 ≈ $0.00075；没有新标题的小时不调用 Claude。
  - 按每天 24 次、每月 720 次算：**一般约 $0.5 / 月，最坏（每次都满 40 条）约 $2.4 / 月**，约合人民币 4–18 元。
- 已经看过的标题会记 7 天，不会重复付费。想看真实数字，看 `wrangler tail` 里的 `tokens in=… out=…`。

## 数据格式

`GET /api/news` → `{ updatedAt, items: [...] }`，最多 80 条，按发布时间倒序。每条：`id, title_zh, summary_zh, members, category, importance, source, source_type, url, title_orig, published, fetched`。允许跨域的来源只有 `https://www.exolneverland.com`、`https://exolneverland.com` 和本机 `http://127.0.0.1:*`；缓存约 5 分钟。

## 文件

- `src/index.ts`：定时任务流程 + `/api/news`
- `src/sources.ts`：来源、RSS/Atom 解析、网址整理、去重用的哈希
- `src/ai.ts`：Claude 调用（官方 `@anthropic-ai/sdk`，`claude-haiku-5-5`，effort `low`，结构化输出，检查 `stop_reason`）
- `wrangler.toml`：名称、每小时的 cron、KV、变量
