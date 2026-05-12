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
