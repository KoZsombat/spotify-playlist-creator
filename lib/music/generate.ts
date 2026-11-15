import { mapLimit } from "../async";
import type { SpotifyTrack } from "../spotify/types";
import type { Intent } from "../types";
import { containsPhrase } from "./intent";
import { fallbackQuery, planQueries, type QueryPlan } from "./planner";

export type TrackSource = {
  search(query: string, limit: number): Promise<SpotifyTrack[]>;
  getArtistGenres(artistIds: readonly string[]): Promise<Map<string, string[]>>;
};

export type GenerateOptions = {
  intent: Intent;
  source: TrackSource;
  seeds?: readonly SpotifyTrack[];
  limit?: number;
  includeSeeds?: boolean;
  concurrency?: number;
};

export type GeneratedPlaylist = {
  tracks: SpotifyTrack[];
  stats: {
    queries: number;
    candidates: number;
    sourceTracks: number;
    artistCap: number;
  };
};

type Candidate = {
  track: SpotifyTrack;
  /** Highest weight per query group that surfaced this track. */
  groups: Map<QueryPlan["group"], number>;
  bestRank: number;
};

type Scored = { track: SpotifyTrack; score: number; groups: Candidate["groups"] };

const GROUP_ORDER: QueryPlan["group"][] = [
  "seed",
  "genre",
  "mood",
  "occasion",
  "language",
  "keyword",
  "era",
  "deep",
  "fallback",
];

const normalizeName = (value: string) =>
  value.normalize("NFKD").toLowerCase().replace(/\s+/g, " ").trim();

const trackKey = (track: SpotifyTrack) => `${track.name.toLowerCase()}|${track.artists[0]?.id ?? ""}`;

function primaryArtist(track: SpotifyTrack) {
  return track.artists[0];
}

function isAllowed(track: SpotifyTrack, intent: Intent): boolean {
  if (track.is_local || !track.id) return false;
  if (!intent.explicitAllowed && track.explicit) return false;

  const artists = track.artists.map((artist) => normalizeName(artist.name));
  if (
    intent.excludeArtists.some((name) => {
      const target = normalizeName(name);
      return artists.some((artist) => artist.includes(target));
    })
  ) {
    return false;
  }

  if (intent.excludeKeywords.length > 0 || intent.excludeTags.length > 0) {
    const haystack = normalizeName(
      `${track.name} ${track.album.name} ${track.artists.map((artist) => artist.name).join(" ")}`,
    );
    if (intent.excludeKeywords.some((keyword) => containsPhrase(haystack, keyword))) {
      return false;
    }
    if (intent.excludeTags.some((tag) => containsPhrase(haystack, tag))) {
      return false;
    }
  }

  return true;
}

type ScoreContext = {
  terms: string[];
  genreTerms: string[];
  artistGenres: Map<string, string[]>;
  seedArtists: Set<string>;
  seedAlbums: Set<string>;
  intent: Intent;
};

function scoreCandidate(candidate: Candidate, context: ScoreContext): number {
  const { track, groups } = candidate;
  const { intent } = context;

  let score = 0;
  let groupTotal = 0;
  for (const weight of groups.values()) groupTotal += weight;
  score += Math.min(groupTotal, 1.9);

  const genreStrings = track.artists.flatMap(
    (artist) => context.artistGenres.get(artist.id) ?? [],
  );
  const haystack = normalizeName(
    `${track.name} ${track.album.name} ${track.artists.map((artist) => artist.name).join(" ")} ${genreStrings.join(" ")}`,
  );

  let hits = 0;
  for (const term of context.terms) {
    if (hits >= 8) break;
    if (containsPhrase(haystack, term)) hits++;
  }
  score += hits * 0.4;

  let genreOverlap = 0;
  for (const genre of new Set(genreStrings)) {
    const lower = normalizeName(genre);
    if (context.genreTerms.some((term) => lower.includes(normalizeName(term)))) {
      genreOverlap++;
    }
  }
  score += Math.min(genreOverlap, 4) * 0.45;

  const year = Number((track.album.release_date ?? "").slice(0, 4));
  if (intent.yearRange && Number.isFinite(year) && year > 1900) {
    const [start, end] = intent.yearRange;
    score += year >= start && year <= end ? 0.5 : -0.8;
  }

  score += (1 - Math.abs(track.popularity - intent.popularityTarget) / 100) * 0.6;

  const artistName = normalizeName(primaryArtist(track)?.name ?? "");
  if (context.seedArtists.has(artistName)) score += 0.85;
  if (context.seedAlbums.has(normalizeName(track.album.name))) score += 0.3;

  if (
    intent.includeArtists.some((name) =>
      containsPhrase(artistName, normalizeName(name)),
    )
  ) {
    score += 1.4;
  }

  score += 0.3 * (1 - Math.min(candidate.bestRank, 50) / 50);

  if (intent.instrumental && normalizeName(track.name).includes("instrumental")) {
    score += 0.2;
  }

  return score;
}

function interleave(chosen: Scored[]): Scored[] {
  const buckets = new Map<QueryPlan["group"], Scored[]>();
  for (const item of chosen) {
    let best: QueryPlan["group"] = "fallback";
    let bestWeight = -1;
    for (const [group, weight] of item.groups) {
      if (weight > bestWeight) {
        best = group;
        bestWeight = weight;
      }
    }
    const bucket = buckets.get(best) ?? [];
    bucket.push(item);
    buckets.set(best, bucket);
  }

  const ordered: Scored[] = [];
  const active = GROUP_ORDER.filter((group) => buckets.has(group));
  let remaining = chosen.length;
  while (remaining > 0) {
    for (const group of active) {
      const bucket = buckets.get(group);
      const next = bucket?.shift();
      if (!next) continue;
      ordered.push(next);
      remaining--;
    }
  }
  return ordered;
}

/**
 * Search-driven generator. Spotify removed /recommendations, /related-artists
 * and audio features for new apps, so this builds a candidate pool from
 * description-derived searches, scores it, and enforces artist diversity.
 */
export async function generateTracks({
  intent,
  source,
  seeds = [],
  limit = 50,
  includeSeeds = true,
  concurrency = 4,
}: GenerateOptions): Promise<GeneratedPlaylist> {
  const seedTracks = includeSeeds ? seeds.slice(0, limit) : [];
  const seedArtists = new Set(
    seeds.map((track) => normalizeName(primaryArtist(track)?.name ?? "")).filter(Boolean),
  );
  const seedArtistNames = [...seedArtists].filter(Boolean);
  const seedAlbums = new Set(seeds.map((track) => normalizeName(track.album.name)));

  const plans = planQueries(intent, seedArtistNames);
  const responses = await mapLimit(plans, concurrency, async (plan) => {
    try {
      return { plan, tracks: await source.search(plan.q, 50) };
    } catch (error) {
      // A single failed query should not sink the whole generation.
      if (plan === plans[0]) throw error;
      return { plan, tracks: [] as SpotifyTrack[] };
    }
  });

  const candidates = new Map<string, Candidate>();
  for (const { plan, tracks } of responses) {
    tracks.forEach((track, index) => {
      if (!track?.id) return;
      const existing = candidates.get(track.id);
      if (existing) {
        const previous = existing.groups.get(plan.group) ?? 0;
        existing.groups.set(plan.group, Math.max(previous, plan.weight));
        existing.bestRank = Math.min(existing.bestRank, index + 1);
        return;
      }
      candidates.set(track.id, {
        track,
        groups: new Map([[plan.group, plan.weight]]),
        bestRank: index + 1,
      });
    });
  }

  if (candidates.size === 0) {
    throw new Error(
      "Spotify returned no tracks for this description. Try broader wording or different genres.",
    );
  }

  const allowed = [...candidates.values()].filter((candidate) =>
    isAllowed(candidate.track, intent),
  );

  const artistIds = [...new Set(allowed.flatMap((c) => c.track.artists.map((a) => a.id)))];
  const artistGenres = await source.getArtistGenres(artistIds.slice(0, 250));

  // Artist genres are authoritative for vetoes like "no rock"; the text check
  // above can only see titles and names.
  const excludeTags = intent.excludeTags.map(normalizeName).filter(Boolean);
  const allowedAfterGenres = allowed.filter((candidate) => {
    if (excludeTags.length === 0) return true;
    const genres = candidate.track.artists
      .flatMap((artist) => artistGenres.get(artist.id) ?? [])
      .map(normalizeName);
    return !genres.some((genre) => excludeTags.some((tag) => genre.includes(tag)));
  });

  const genreTerms = [...intent.genres, ...intent.moods];
  const context: ScoreContext = {
    terms: [
      ...intent.genres,
      ...intent.moods,
      ...intent.occasions,
      ...intent.languages,
      ...intent.keywords,
      ...intent.includeArtists,
    ].filter(Boolean),
    genreTerms,
    artistGenres,
    seedArtists,
    seedAlbums,
    intent,
  };

  const scored: Scored[] = allowedAfterGenres
    .map((candidate) => ({
      track: candidate.track,
      groups: candidate.groups,
      score: scoreCandidate(candidate, context),
    }))
    .sort((a, b) => b.score - a.score || a.track.id.localeCompare(b.track.id));

  const chosen: Scored[] = [];
  const chosenIds = new Set<string>();
  const nameKeys = new Set<string>();
  const artistCounts = new Map<string, number>();

  const addTrack = (item: Scored, artistCap: number): boolean => {
    if (chosen.length >= limit) return false;
    if (chosenIds.has(item.track.id)) return false;
    const key = trackKey(item.track);
    if (nameKeys.has(key)) return false;

    const artist = primaryArtist(item.track);
    if (artist) {
      const count = artistCounts.get(artist.id) ?? 0;
      if (count >= artistCap) return false;
      artistCounts.set(artist.id, count + 1);
    }
    chosenIds.add(item.track.id);
    nameKeys.add(key);
    chosen.push(item);
    return true;
  };

  const seedIds = new Set(seedTracks.map((track) => track.id));
  for (const track of seedTracks) {
    const existing = candidates.get(track.id);
    const item: Scored = {
      track,
      score: Number.POSITIVE_INFINITY,
      groups: existing?.groups ?? new Map([["seed", 1.3]]),
    };
    if (chosenIds.has(track.id)) continue;
    addTrack(item, Number.POSITIVE_INFINITY);
  }

  const caps = [intent.maxPerArtist, intent.maxPerArtist + 1, 6, Number.POSITIVE_INFINITY];
  for (const cap of caps) {
    for (const item of scored) {
      if (chosen.length >= limit) break;
      addTrack(item, cap);
    }
    if (chosen.length >= limit) break;
  }

  let candidateCount = candidates.size;

  if (chosen.length < limit) {
    try {
      const extra = await source.search(fallbackQuery(intent), 50);
      candidateCount += extra.length;
      const extraScored: Scored[] = extra
        .filter((track) => !seedIds.has(track.id) && isAllowed(track, intent))
        .map((track) => ({
          track,
          groups: new Map<QueryPlan["group"], number>([["fallback", 0.6]]),
          score: 0,
        }))
        .sort((a, b) => b.track.popularity - a.track.popularity);
      for (const item of extraScored) {
        if (chosen.length >= limit) break;
        addTrack(item, Number.POSITIVE_INFINITY);
      }
    } catch {
      // Fallback is best-effort; a partial playlist is still returned.
    }
  }

  const tracks = interleave(chosen).map((item) => item.track).slice(0, limit);

  // Report the real observed maximum instead of the cap that happened to fill the list.
  const perArtist = new Map<string, number>();
  for (const track of tracks) {
    const artistId = primaryArtist(track)?.id;
    if (!artistId) continue;
    perArtist.set(artistId, (perArtist.get(artistId) ?? 0) + 1);
  }
  const artistCap = Math.max(0, ...perArtist.values());

  return {
    tracks,
    stats: {
      queries: plans.length,
      candidates: candidateCount,
      sourceTracks: seedTracks.length,
      artistCap,
    },
  };
}
