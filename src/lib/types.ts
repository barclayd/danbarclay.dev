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
  /** Dan's role on the episode — e.g. "Caller", "Guest", "Host". */
  role: string;
  artworkUrl: string;
  /** ISO date — YYYY-MM-DD. */
  publishedAt: string;
  durationSeconds: number;
  description: string;
  topics: string[];
  /** Optional pull-quote rendered on the featured episode hero. */
  quote?: string;
  featured?: boolean;
};
