export type ContributionDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionsData = {
  total: number;
  days: ContributionDay[];
  fetchedAt: string;
};

export type WeekPoint = {
  weekStart: string;
  count: number;
};

export type Project = {
  slug: string;
  name: string;
  displayName: string;
  description: string;
  createdAt: string;
  pushedAt: string;
  language: string | null;
  url: string;
  weeks: WeekPoint[];
  totalCommits: number;
  index: number;
};

export type TweetMedia = {
  type: "image" | "video" | "gif";
  /** Local path under /public - e.g. /tweets/1234567/0.jpg. */
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  /** Optional poster image for videos. */
  poster?: string;
};

export type TweetMetrics = {
  likes: number;
  reposts: number;
  replies: number;
  views?: number;
};

export type TweetParent = {
  /** Display name of the original author. */
  author: string;
  /** Handle without the @. */
  handle: string;
  /** Quoted/replied-to text (may be truncated to a sensible length in the JSON). */
  text: string;
  /** URL to the parent tweet on x.com. */
  url: string;
};

export type TweetThread = {
  /** Stable thread identifier - typically the first tweet's id. */
  id: string;
  /** 1-based position within the thread. */
  position: number;
  /** Total number of tweets in the thread. */
  total: number;
};

export type Tweet = {
  /** X status id. */
  id: string;
  /** Canonical URL - https://x.com/danielbarclay/status/{id}. */
  url: string;
  /** Full tweet text. Newlines preserved. */
  text: string;
  /** ISO 8601 timestamp with at least minute precision. */
  postedAt: string;
  /** Floats this tweet into the hero slot. At most one should be true. */
  pinned?: boolean;
  thread?: TweetThread;
  /** Present if this tweet is a reply - renders the parent inline, dimmed. */
  replyTo?: TweetParent;
  /** Present if this tweet quote-tweets another - renders the parent inline, dimmed. */
  quoteOf?: TweetParent;
  media?: TweetMedia[];
  metrics?: TweetMetrics;
  /** Optional topic tags (for future filtering UI; rendered as small chips). */
  topics?: string[];
};

export type Podcast = {
  index: number;
  slug: string;
  spotifyEpisodeId: string;
  spotifyUrl: string;
  embedUrl: string;
  appleUrl?: string;
  showUrl?: string;
  title: string;
  show: string;
  showHost: string;
  /** Dan's role on the episode - e.g. "Caller", "Guest", "Host". */
  role: string;
  artworkUrl: string;
  /** ISO date - YYYY-MM-DD. */
  publishedAt: string;
  durationSeconds: number;
  description: string;
  topics: string[];
  /** Optional pull-quote rendered on the featured episode hero. */
  quote?: string;
  featured?: boolean;
};
