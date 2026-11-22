import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import type { Env, RawItem } from './types';

export const MODEL = 'claude-haiku-5-5';
const MAX_TOKENS = 8000; // 40 items * ~130 tokens, with headroom

export const MEMBER_IDS = ['xiumin', 'suho', 'lay', 'baekhyun', 'chen', 'chanyeol', 'do', 'kai', 'sehun', 'group'] as const;
const CATEGORIES = ['release', 'concert', 'broadcast', 'solo', 'award', 'fan_event', 'other'] as const;

const Verdict = z.object({
  id: z.string(),
  relevant: z.boolean(),
  members: z.array(z.enum(MEMBER_IDS)),
  category: z.enum(CATEGORIES),
  title_zh: z.string(),
  summary_zh: z.string(),
  importance: z.number().int(),
});
const Result = z.object({ items: z.array(Verdict) });
export type Verdict = z.infer<typeof Verdict>;

const SYSTEM = `你是 EXO（SM Entertainment 的韩国男团）中文粉丝站的新闻编辑助手。
输入是一组新闻标题（韩文、英文或中文），每条有 id、title、source。逐条判断并输出：
- relevant：这条是否真的在讲 K-pop 团体 EXO 或其成员（含 EXO-CBX、EXO-SC、成员个人活动）。成员名字是常见词（如 수호、레이、첸、카이、디오、찬열、Lay、Chen、Kai、Suho），与该团体无关的一律 false。
- members：涉及的成员，取值 xiumin, suho, lay, baekhyun, chen, chanyeol, do, kai, sehun；整个团体或无法分出个人则用 group。
- category：release（发行/回归）、concert（演唱会/巡演/活动）、broadcast（综艺/节目/出演）、solo（个人活动/作品）、award（奖项/榜单）、fan_event（粉丝见面/周边/生日应援）、other。
- title_zh：简洁自然的中文标题。成员和团体用通行中文名（EXO、金珉锡、金俊勉、张艺兴、边伯贤、金钟大、朴灿烈、都暻秀、金钟仁、吴世勋）。
- summary_zh：一句中文概述，不超过 60 个汉字，只陈述标题里已有的事实，不要推测，不要添加标题没有的信息。标题没写的细节（例如专辑是正规还是迷你、具体日期、地点）一律不要补。
- importance：1 = 一般，2 = 值得关注，3 = 重大（回归、演唱会官宣、入伍/退伍、合约等）。
relevant 为 false 时，title_zh 和 summary_zh 填空字符串，members 填空数组。每个输入 id 都必须出现且只出现一次。`;

function userPayload(items: RawItem[]): string {
  return JSON.stringify(items.map(i => ({ id: i.id, title: i.title, source: i.source })));
}

export function makeClient(env: Env): Anthropic {
  // baseURL only when an Anthropic-compatible relay is configured; default stays api.anthropic.com
  return new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    ...(env.ANTHROPIC_BASE_URL ? { baseURL: env.ANTHROPIC_BASE_URL } : {}),
  });
}

export interface ClassifyResult {
  verdicts: Verdict[];
  path: 'structured' | 'json-prompt-fallback';
  usage: { input_tokens: number; output_tokens: number };
}

/** Pull a JSON object out of free text defensively (code fences, leading prose). */
export function parseLooseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('no JSON object in model output');
}

function checkStop(stop: string | null | undefined, details?: unknown): void {
  if (stop === 'refusal') throw new Error('model refused: ' + JSON.stringify(details ?? null));
  if (stop === 'max_tokens') throw new Error('model output hit max_tokens');
  if (stop !== 'end_turn' && stop !== 'stop_sequence') throw new Error('unexpected stop_reason: ' + stop);
}

export async function classify(env: Env, items: RawItem[]): Promise<ClassifyResult> {
  const client = makeClient(env);
  try {
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages: [{ role: 'user', content: userPayload(items) }],
      output_config: { effort: 'low', format: zodOutputFormat(Result) },
    });
    checkStop(res.stop_reason, res.stop_details);
    if (!res.parsed_output) throw new Error('structured output did not parse');
    return { verdicts: res.parsed_output.items, path: 'structured', usage: res.usage };
  } catch (err) {
    // A relay may not implement structured outputs: retry once without them.
    if (!(err instanceof Anthropic.BadRequestError && /output_config|format|effort|schema/i.test(err.message))) throw err;
    console.warn('structured outputs rejected (' + err.message.slice(0, 160) + '); retrying with JSON-in-prompt');
  }

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system:
      SYSTEM +
      '\n\n只输出一个 JSON 对象，不要任何其他文字或代码围栏，格式：{"items":[{"id":"","relevant":true,"members":["group"],"category":"other","title_zh":"","summary_zh":"","importance":1}]}',
    messages: [{ role: 'user', content: userPayload(items) }],
  });
  checkStop(res.stop_reason, res.stop_details);
  const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
  const parsed = Result.safeParse(parseLooseJson(text));
  if (!parsed.success) throw new Error('fallback JSON failed validation: ' + parsed.error.message.slice(0, 200));
  return { verdicts: parsed.data.items, path: 'json-prompt-fallback', usage: res.usage };
}
