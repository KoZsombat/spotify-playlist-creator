import type { Intent } from "../types";
import { LEXICON } from "./lexicon";

export type QueryPlan = {
  q: string;
  group: "seed" | "genre" | "language" | "keyword" | "era" | "deep" | "fallback";
  weight: number;
};

const MAX_QUERIES = 18;

function yearFilter(intent: Intent): string | null {
  if (!intent.yearRange) return null;
  const [start, end] = intent.yearRange;
  return end - start <= 24 ? `year:${start}-${end}` : null;
}

/**
 * Spotify's `genre:` field matches track metadata instead of names, so the
 * words in the brief never turn into titles or artists that merely spell them.
 */
const genreTag = (label: string) => {
  const target = label.toLowerCase();
  const entry = LEXICON.find((candidate) => candidate.label.toLowerCase() === target);
  return entry?.spotifyTag ?? label;
};

const genreQuery = (label: string) => `genre:"${genreTag(label)}"`;

/**
 * Spotify-search-shaped queries. Weights feed the scorer: a track found by a
 * seed-artist query is a stronger signal than one found by a loose keyword.
 *
 * Moods and occasions are deliberately not sent to search: Spotify has no mood
 * metadata left, so "coding" or "nostalgic" as a query only matches track
 * titles that happen to contain the word.
 */
export function planQueries(
  intent: Intent,
  seedArtists: readonly string[] = [],
  targetTracks = 50,
): QueryPlan[] {
  const plans: QueryPlan[] = [];
  const seen = new Set<string>();
  const year = yearFilter(intent);
  const genres = intent.genres.slice(0, 3);
  const primary = genres[0];

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

  for (const genre of genres) {
    const query = genreQuery(genre);
    add(query, "genre", 1);
    if (year) add(`${query} ${year}`, "genre", 1.05);
    if (intent.instrumental) add(`${query} instrumental`, "genre", 1.1);
  }

  for (const language of intent.languages.slice(0, 2)) {
    add(primary ? `${language} ${primary}` : `${language} songs`, "language", 0.9);
  }

  for (const keyword of intent.keywords.slice(0, 3)) {
    add(primary ? `${keyword} ${primary}` : keyword, "keyword", 0.65);
  }

  // Spotify returns at most 100 hits per query, so large playlists need extra
  // era slices of the same genre to build a candidate pool big enough.
  if (targetTracks > 100) {
    const currentYear = new Date().getFullYear();
    for (const genre of genres.slice(0, 2)) {
      const query = genreQuery(genre);
      for (let offset = 0; offset < 4; offset++) {
        const end = currentYear - offset * 10;
        const start = end - 9;
        add(`${query} year:${start}-${end}`, "era", 0.85);
      }
    }
  }

  if (year && plans.every((plan) => !plan.q.includes("year:"))) {
    const decade = Math.floor((intent.yearRange?.[0] ?? 2000) / 10) * 10;
    add(primary ? `${genreQuery(primary)} ${decade}s` : `${decade}s hits`, "era", 0.75);
  }

  if (intent.popularityTarget <= 45) {
    add(primary ? `${genreQuery(primary)} tag:hipster` : "tag:hipster", "deep", 0.55);
  }

  if (plans.length === 0) {
    add("popular hits", "fallback", 0.6);
    add("indie mix", "fallback", 0.55);
  }

  return plans.slice(0, MAX_QUERIES);
}

/** Last-resort broad query when the planned searches cannot fill the playlist. */
export function fallbackQuery(intent: Intent): string {
  const parts = [intent.genres[0], intent.keywords[0]].filter(Boolean);
  return parts.length > 0 ? `${parts.join(" ")} hits` : "popular songs";
}
