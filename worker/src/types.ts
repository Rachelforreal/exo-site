export interface Env {
  NEWS: KVNamespace;
  ANTHROPIC_API_KEY?: string;
  /** optional: Anthropic-compatible relay; unset = api.anthropic.com */
  ANTHROPIC_BASE_URL?: string;
  DRY_RUN?: string;
}

export type SourceType = 'official' | 'media';

/** A headline as collected from a source, before any AI step. */
export interface RawItem {
  id: string; // hash of normalised url + title
  title: string;
  url: string;
  source: string;
  source_type: SourceType;
  published: string; // ISO
}

export interface FeedItem {
  id: string;
  title_zh: string;
  summary_zh: string;
  members: string[];
  category: string;
  importance: number;
  source: string;
  source_type: SourceType;
  url: string;
  title_orig: string;
  published: string;
  fetched: string;
}

export interface Feed {
  updatedAt: string;
  items: FeedItem[];
}
