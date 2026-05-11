#!/usr/bin/env bun
// Build-time GitHub data fetcher.
// Outputs src/data/contributions.json and src/data/projects.json.
// Runs unauthenticated by default; if GITHUB_TOKEN is set, uses it to bump rate limits.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'src', 'data');

const USER = 'barclayd';

const PROJECTS = [
  {
    slug: 'keepfresh-ios',
    displayName: 'KEEPFRESH / IOS',
    fallbackDescription: 'iOS app for tracking food, reducing waste through expiry alerts.',
  },
  {
    slug: 'promptly',
    displayName: 'PROMPTLY',
    fallbackDescription: 'A toolkit for orchestrating prompt-driven workflows.',
  },
  {
    slug: 'keepfresh-api',
    displayName: 'KEEPFRESH / API',
    fallbackDescription: 'TypeScript API powering the KeepFresh iOS client.',
  },
  {
    slug: 'promptly-package',
    displayName: 'PROMPTLY / PACKAGE',
    fallbackDescription: 'Distributable package for the Promptly toolkit.',
  },
  {
    slug: 'advent-of-code-2025',
    displayName: 'ADVENT OF CODE / 2025',
    fallbackDescription: 'Daily puzzles from the 2025 Advent of Code, solved end-to-end.',
  },
];

const TOKEN = process.env.GITHUB_TOKEN;

const ghHeaders = () => {
  const h = {
    'User-Agent': 'danbarclay.dev-build',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
};

async function ghJson(url, { retries = 3 } = {}) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const r = await fetch(url, { headers: ghHeaders() });
    if (r.status === 202) {
      // GitHub is computing stats; wait and retry.
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      continue;
    }
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`GitHub ${url} → ${r.status}: ${body.slice(0, 200)}`);
    }
    return r.json();
  }
  // Final fallback: return null so caller can degrade gracefully.
  console.warn(`[fetch-github] gave up on ${url} after ${retries} retries`);
  return null;
}

async function fetchReadmeFirstSentence(slug) {
  // Try main, then master.
  for (const branch of ['main', 'master']) {
    for (const file of ['README.md', 'readme.md', 'Readme.md']) {
      const url = `https://raw.githubusercontent.com/${USER}/${slug}/${branch}/${file}`;
      const r = await fetch(url);
      if (r.ok) {
        const text = await r.text();
        return extractDescription(text);
      }
    }
  }
  return null;
}

function extractDescription(md) {
  // Strip markdown headers, code fences, badges, links, images.
  const lines = md.split('\n');
  let inCode = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (!line) continue;
    if (line.startsWith('#')) continue;
    if (line.startsWith('<')) continue;
    if (/^[!\[]/.test(line)) continue;
    if (line.startsWith('---')) continue;
    // Clean inline markdown.
    let cleaned = line
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_]/g, '')
      .trim();
    // Strip leading emoji + warning prefix (e.g. "⚠️ EXPERIMENTAL:").
    cleaned = cleaned
      .replace(/^[\p{Extended_Pictographic}☀-➿️]+\s*/u, '')
      .replace(/^(EXPERIMENTAL|WIP|TODO|NOTE|WARNING)\s*[:\-—]\s*/i, '')
      .trim();
    if (cleaned.length < 12) continue;
    // First sentence.
    const m = cleaned.match(/^[^.!?]*[.!?]/);
    const sentence = (m ? m[0] : cleaned).trim();
    if (sentence.length > 8 && sentence.length < 200) return sentence;
  }
  return null;
}

function isoWeekStart(d) {
  // Sunday-based weeks to match GitHub's heatmap.
  const date = new Date(d);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

async function fetchAllCommits(slug) {
  // Paginated /commits — returns full repo lifetime.
  const out = [];
  for (let page = 1; page <= 30; page++) {
    const url = `https://api.github.com/repos/${USER}/${slug}/commits?per_page=100&page=${page}`;
    const r = await fetch(url, { headers: ghHeaders() });
    if (r.status === 409) return out; // empty repo
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`commits ${slug} p${page} → ${r.status}: ${body.slice(0, 200)}`);
    }
    const batch = await r.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const c of batch) {
      const iso = c?.commit?.author?.date ?? c?.commit?.committer?.date;
      if (iso) out.push(iso);
    }
    if (batch.length < 100) break;
  }
  return out;
}

function bucketCommitsByWeek(isoDates, createdAt) {
  // Build a contiguous weekly series from repo creation → now.
  if (isoDates.length === 0) return [];
  const start = createdAt ? new Date(createdAt) : new Date(isoDates[isoDates.length - 1]);
  const startWeek = new Date(isoWeekStart(start));
  const endWeek = new Date(isoWeekStart(new Date()));
  const buckets = new Map();
  for (const iso of isoDates) {
    const key = isoWeekStart(iso);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const series = [];
  for (
    let w = new Date(startWeek);
    w.getTime() <= endWeek.getTime();
    w.setUTCDate(w.getUTCDate() + 7)
  ) {
    const key = w.toISOString().slice(0, 10);
    series.push({ weekStart: key, count: buckets.get(key) ?? 0 });
  }
  return series;
}

async function fetchContributionsCalendar(user) {
  // Unofficial public API that scrapes the GitHub profile contributions graph.
  // No auth required. Returns the full year by default.
  const url = `https://github-contributions-api.jogruber.de/v4/${user}?y=last`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`contributions api ${r.status}`);
  const data = await r.json();
  // data.contributions: [{ date, count, level }]
  const days = (data.contributions ?? []).map((d) => ({
    date: d.date,
    count: d.count,
    level: Math.min(4, Math.max(0, d.level ?? 0)),
  }));
  return {
    total: data.total?.lastYear ?? days.reduce((s, d) => s + d.count, 0),
    days,
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchProject(project, index) {
  const meta = await ghJson(`https://api.github.com/repos/${USER}/${project.slug}`);
  const commitDates = await fetchAllCommits(project.slug);
  const readmeDesc = await fetchReadmeFirstSentence(project.slug);

  const weeks = bucketCommitsByWeek(commitDates, meta?.created_at);
  const totalCommits = commitDates.length;

  return {
    slug: project.slug,
    name: project.slug,
    displayName: project.displayName,
    description: readmeDesc || (meta && meta.description) || project.fallbackDescription,
    createdAt: meta?.created_at ?? '',
    pushedAt: meta?.pushed_at ?? '',
    language: meta?.language ?? null,
    url: meta?.html_url ?? `https://github.com/${USER}/${project.slug}`,
    weeks,
    totalCommits,
    index: index + 1,
  };
}

async function readPrevious(filename) {
  try {
    const buf = await readFile(resolve(dataDir, filename), 'utf-8');
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const prevContributions = await readPrevious('contributions.json');
  const prevProjects = (await readPrevious('projects.json')) ?? [];
  const prevBySlug = new Map(prevProjects.map((p) => [p.slug, p]));

  console.log('[fetch-github] contributions calendar…');
  let contributions;
  try {
    contributions = await fetchContributionsCalendar(USER);
    console.log(`  → ${contributions.days.length} days, ${contributions.total} total contributions`);
  } catch (e) {
    console.error('  ! failed:', e.message);
    contributions = prevContributions || { total: 0, days: [], fetchedAt: new Date().toISOString() };
    if (prevContributions) console.log('  → kept previous contributions data');
  }

  console.log('[fetch-github] projects…');
  const projects = [];
  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    try {
      const result = await fetchProject(p, i);
      // Only keep new result if it has meaningful data; otherwise fall back.
      if (result.totalCommits > 0 || !prevBySlug.has(p.slug)) {
        console.log(`  → ${p.slug}: ${result.weeks.length} weeks, ${result.totalCommits} commits`);
        projects.push(result);
      } else {
        console.log(`  → ${p.slug}: empty result, kept previous data`);
        projects.push(prevBySlug.get(p.slug));
      }
    } catch (e) {
      console.error(`  ! ${p.slug} failed:`, e.message);
      const prev = prevBySlug.get(p.slug);
      if (prev) {
        console.log(`  → ${p.slug}: kept previous data`);
        projects.push(prev);
      } else {
        projects.push({
          slug: p.slug,
          name: p.slug,
          displayName: p.displayName,
          description: p.fallbackDescription,
          createdAt: '',
          pushedAt: '',
          language: null,
          url: `https://github.com/${USER}/${p.slug}`,
          weeks: [],
          totalCommits: 0,
          index: i + 1,
        });
      }
    }
  }

  await writeFile(
    resolve(dataDir, 'contributions.json'),
    JSON.stringify(contributions, null, 2)
  );
  await writeFile(
    resolve(dataDir, 'projects.json'),
    JSON.stringify(projects, null, 2)
  );
  console.log('[fetch-github] wrote src/data/contributions.json + projects.json');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
