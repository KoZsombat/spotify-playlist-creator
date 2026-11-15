import type { Intent } from "../types";
import { queriesForLabel } from "./intent";

export type QueryPlan = {
  q: string;
  group:
    | "seed"
    | "genre"
    | "mood"
    | "occasion"
    | "language"
    | "keyword"
    | "era"
    | "deep"
    | "fallback";
  weight: number;
};

const MAX_QUERIES = 18;

function yearFilter(intent: Intent): string | null {
  if (!intent.yearRange) return null;
  const [start, end] = intent.yearRange;
  return end - start <= 24 ? `year:${start}-${end}` : null;
}

/**
 * Spotify-search-shaped queries. Weights feed the scorer: a track found by a
 * seed-artist query is a stronger signal than one found by a loose keyword.
 */
export function planQueries(
  intent: Intent,
  seedArtists: readonly string[] = [],
): QueryPlan[] {
  const plans: QueryPlan[] = [];
  const seen = new Set<string>();
  const year = yearFilter(intent);
  const primaryGenre = intent.genres[0];

  const add = (q: string, group: QueryPlan["group"], weight: number) => {
    const cleaned = q.replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    plans.push({ q: cleaned, group, weight });
  };

  for (const artist of seedArtists.slice(0, 3)) {
    add(`artist:"${artist}"`, "seed", 1.3);
  }

  for (const genre of intent.genres.slice(0, 3)) {
    const phrases = queriesForLabel(genre);
    add(phrases[0] ?? genre, "genre", 1);
    const second = phrases[1];
    if (second) add(second, "genre", 0.95);
    if (year) add(`${phrases[0] ?? genre} ${year}`, "genre", 1.05);
    if (intent.instrumental) add(`${phrases[0] ?? genre} instrumental`, "genre", 1.1);
  }

  for (const mood of intent.moods.slice(0, 3)) {
    add(primaryGenre ? `${mood} ${primaryGenre}` : `${mood} songs`, "mood", 0.85);
  }

  for (const occasion of intent.occasions.slice(0, 2)) {
    const phrases = queriesForLabel(occasion);
    add(phrases[0] ?? occasion, "occasion", 0.8);
  }

  for (const language of intent.languages.slice(0, 2)) {
    add(primaryGenre ? `${language} ${primaryGenre}` : `${language} songs`, "language", 0.9);
  }

  for (const keyword of intent.keywords.slice(0, 3)) {
    add(primaryGenre ? `${keyword} ${primaryGenre}` : keyword, "keyword", 0.65);
  }

  if (year && plans.every((plan) => !plan.q.includes("year:"))) {
    const decade = Math.floor((intent.yearRange?.[0] ?? 2000) / 10) * 10;
    add(`${decade}s ${primaryGenre ?? "hits"}`, "era", 0.75);
  }

  if (intent.popularityTarget <= 45) {
    add(primaryGenre ? `${primaryGenre} tag:hipster` : "tag:hipster", "deep", 0.55);
  }

  if (plans.length === 0) {
    add("popular hits", "fallback", 0.6);
    add("indie mix", "fallback", 0.55);
    add("electronic mix", "fallback", 0.5);
  }

  return plans.slice(0, MAX_QUERIES);
}

/** Last-resort broad query when the planned searches cannot fill the playlist. */
export function fallbackQuery(intent: Intent): string {
  const parts = [
    intent.genres[0],
    intent.moods[0],
    intent.occasions[0],
    intent.keywords[0],
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")} hits` : "popular songs";
}
