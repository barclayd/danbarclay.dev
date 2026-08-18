#!/usr/bin/env bun
// Build-time Stack Overflow data fetcher.
// Outputs src/data/stackoverflow.json.
// Unauthenticated: the Stack Exchange API allows 300 req/day/IP and this uses 4.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'src', 'data');

const USER_ID = 9961739;
const API = 'https://api.stackexchange.com/2.3';
const SITE = 'site=stackoverflow';

// How many specialities the band readout shows. More than this and the tail
// bands are too thin to label.
const TAG_LIMIT = 6;

// A tag carried by a single answer is one lucky post, not a speciality - and it
// double-counts, since every tag on that answer scores identically. Two answers
// deep is the bar for appearing on the readout.
const MIN_ANSWERS = 2;

async function seJson(path) {
  const url = `${API}/${path}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'danbarclay.dev-build' } });
  if (!r.ok) throw new Error(`stackexchange ${path} → ${r.status}`);
  const data = await r.json();
  if (data.error_message) throw new Error(`stackexchange ${path} → ${data.error_message}`);
  return data;
}

// The API returns titles HTML-escaped ("&#39;React&#39; refers to...").
function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function fetchProfile() {
  const { items } = await seJson(`users/${USER_ID}?${SITE}`);
  const u = items?.[0];
  if (!u) throw new Error('no user returned');
  return {
    name: u.display_name,
    url: u.link,
    reputation: u.reputation,
    badges: u.badge_counts,
    memberSince: new Date(u.creation_date * 1000).getUTCFullYear(),
  };
}

async function fetchTotal(kind) {
  const { total } = await seJson(`users/${USER_ID}/${kind}?${SITE}&filter=total`);
  return total ?? 0;
}

async function fetchTags() {
  const { items } = await seJson(`users/${USER_ID}/top-answer-tags?${SITE}`);
  return (items ?? [])
    .filter((t) => t.answer_score > 0 && t.answer_count >= MIN_ANSWERS)
    .slice(0, TAG_LIMIT)
    .map((t) => ({
      tag: t.tag_name,
      score: t.answer_score,
      answers: t.answer_count,
    }));
}

async function fetchTopAnswer() {
  const { items } = await seJson(
    `users/${USER_ID}/answers?${SITE}&order=desc&sort=votes&pagesize=1`
  );
  const a = items?.[0];
  if (!a) return null;
  // Answers carry no title, so resolve it from the question they belong to.
  const { items: questions } = await seJson(`questions/${a.question_id}?${SITE}`);
  const q = questions?.[0];
  if (!q) return null;
  return {
    title: decodeEntities(q.title),
    score: a.score,
    tags: q.tags ?? [],
    url: `https://stackoverflow.com/a/${a.answer_id}`,
    year: new Date(a.creation_date * 1000).getUTCFullYear(),
  };
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(resolve(dataDir, 'stackoverflow.json'), 'utf-8'));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(dataDir, { recursive: true });
  const previous = await readPrevious();

  try {
    console.log('[fetch-stackoverflow] profile, totals, tags, top answer…');
    const [profile, answers, questions, tags, topAnswer] = await Promise.all([
      fetchProfile(),
      fetchTotal('answers'),
      fetchTotal('questions'),
      fetchTags(),
      fetchTopAnswer(),
    ]);

    const data = {
      ...profile,
      answers,
      questions,
      tags,
      topAnswer,
      fetchedAt: new Date().toISOString(),
    };

    console.log(
      `  → ${data.reputation} rep, ${answers} answers, ${tags.length} tags, top answer +${topAnswer?.score ?? 0}`
    );
    await writeFile(
      resolve(dataDir, 'stackoverflow.json'),
      JSON.stringify(data, null, 2)
    );
    console.log('[fetch-stackoverflow] wrote src/data/stackoverflow.json');
  } catch (e) {
    console.error('  ! failed:', e.message);
    if (!previous) throw e; // No seed to fall back on - fail the build loudly.
    console.log('  → kept previous stackoverflow.json');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
