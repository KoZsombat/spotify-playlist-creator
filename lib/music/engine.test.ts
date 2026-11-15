import { describe, expect, test } from "bun:test";
import type { SpotifyTrack } from "../spotify/types";
import type { Intent } from "../types";
import { generateTracks, type TrackSource } from "./generate";
import { interpretHeuristic, summarizeIntent } from "./intent";

type FakeTrack = SpotifyTrack & { genres: string[] };

const ARTISTS = Array.from({ length: 40 }, (_, index) => ({
  id: `artist-${index}`,
  name: `Artist ${index}`,
}));

const GENRE_POOL = [
  "synthwave",
  "chill",
  "rock",
  "pop",
  "hip hop",
  "ambient",
  "instrumental",
  "lofi",
  "jazz",
];

function buildCatalog(): FakeTrack[] {
  const tracks: FakeTrack[] = [];
  for (let index = 0; index < 400; index++) {
    const artist = ARTISTS[index % ARTISTS.length];
    if (!artist) continue;
    const genres = [
      GENRE_POOL[index % GENRE_POOL.length] ?? "pop",
      GENRE_POOL[(index + 3) % GENRE_POOL.length] ?? "chill",
    ];
    const year = 1970 + (index % 56);
    const id = `track-${index}`;
    tracks.push({
      id,
      name: `${genres[0]} song ${index}`,
      uri: `spotify:track:${id}`,
      duration_ms: 180_000 + index * 100,
      explicit: index % 7 === 0,
      popularity: 20 + (index % 70),
      artists: [artist],
      album: {
        id: `album-${index}`,
        name: `${genres[0]} album ${index}`,
        release_date: `${year}-05-01`,
        images: [{ url: `https://img/${index}`, height: 640, width: 640 }],
      },
      external_urls: { spotify: `https://open.spotify.com/track/${id}` },
      genres,
    });
  }
  return tracks;
}

const CATALOG = buildCatalog();

function fakeSource(calls: string[] = []): TrackSource {
  return {
    async search(query, limit) {
      calls.push(query);
      const tokens = query
        .replace(/\b\w+:\S+/g, " ")
        .replace(/"/g, " ")
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(
          (token) =>
            token.length > 2 &&
            !["hits", "songs", "music", "mix", "popular", "playlist", "the", "and"].includes(
              token,
            ),
        );
      if (tokens.length === 0) return [];
      return CATALOG.filter((track) => {
        const haystack = `${track.name} ${track.album.name} ${track.artists
          .map((artist) => artist.name)
          .join(" ")} ${track.genres.join(" ")}`.toLowerCase();
        return tokens.some((token) => haystack.includes(token));
      }).slice(0, limit);
    },
    async getArtistGenres(artistIds) {
      const map = new Map<string, string[]>();
      for (const id of artistIds) {
        const track = CATALOG.find((candidate) =>
          candidate.artists.some((artist) => artist.id === id),
        );
        map.set(id, track?.genres ?? []);
      }
      return map;
    },
  };
}

function intentFrom(description: string): Intent {
  const intent = interpretHeuristic(description);
  intent.summary = summarizeIntent(intent);
  return intent;
}

describe("interpretHeuristic", () => {
  test("extracts genre, mood, era, instrumental and clean filters", () => {
    const intent = intentFrom(
      "chill lofi beats for studying, instrumental, 90s, clean",
    );
    expect(intent.genres).toContain("lo-fi");
    expect(intent.moods).toContain("chill");
    expect(intent.occasions).toContain("study");
    expect(intent.instrumental).toBe(true);
    expect(intent.explicitAllowed).toBe(false);
    expect(intent.yearRange).toEqual([1990, 1999]);
  });

  test("moves negated genres into exclusions", () => {
    const intent = intentFrom("synthwave but no rock and no sad songs");
    expect(intent.genres).toContain("synthwave");
    expect(intent.genres).not.toContain("rock");
    expect(intent.moods).not.toContain("sad");
    expect(intent.excludeTags).toContain("rock");
  });

  test("prefers the longest alias so pop punk is not pop", () => {
    const intent = intentFrom("pop punk for a skate session");
    expect(intent.genres).toContain("pop punk");
    expect(intent.genres).not.toContain("pop");
  });

  test("pulls named artists out of the text", () => {
    const intent = intentFrom("something similar to Tame Impala and Fred again, mellow");
    expect(intent.includeArtists.map((a) => a.toLowerCase())).toEqual(
      expect.arrayContaining(["tame impala"]),
    );
  });
});

describe("generateTracks", () => {
  test("fills 50 unique tracks while enforcing artist diversity", async () => {
    const intent = intentFrom("rainy synthwave and chill songs, clean");
    const result = await generateTracks({ intent, source: fakeSource(), limit: 50 });

    expect(result.tracks).toHaveLength(50);
    expect(new Set(result.tracks.map((track) => track.id)).size).toBe(50);
    expect(result.tracks.every((track) => track.explicit === false)).toBe(true);

    const perArtist = new Map<string, number>();
    for (const track of result.tracks) {
      for (const id of track.artists.map((artist) => artist.id)) {
        perArtist.set(id, (perArtist.get(id) ?? 0) + 1);
      }
    }
    expect(Math.max(...perArtist.values())).toBeLessThanOrEqual(2);
  });

  test("includes seeds and honors excluded genres", async () => {
    const intent = intentFrom("synthwave but no rock");
    const seed = CATALOG[0] as SpotifyTrack;
    const result = await generateTracks({
      intent,
      source: fakeSource(),
      seeds: [seed],
      limit: 50,
    });

    expect(result.tracks.some((track) => track.id === seed.id)).toBe(true);
    const rockTracks = result.tracks.filter((track) =>
      String(track.album.name).includes("rock"),
    );
    expect(rockTracks).toHaveLength(0);
    expect(result.stats.sourceTracks).toBe(1);
  });

  test("is deterministic for identical input", async () => {
    const intent = intentFrom("late night synthwave drive");
    const first = await generateTracks({ intent, source: fakeSource(), limit: 50 });
    const second = await generateTracks({ intent, source: fakeSource(), limit: 50 });
    expect(first.tracks.map((track) => track.id)).toEqual(
      second.tracks.map((track) => track.id),
    );
  });

  test("never exceeds the requested limit and still returns something when the pool is small", async () => {
    const intent = intentFrom("jazz");
    const source: TrackSource = {
      async search() {
        return CATALOG.slice(0, 5);
      },
      async getArtistGenres() {
        return new Map();
      },
    };
    const result = await generateTracks({ intent, source, limit: 50 });
    expect(result.tracks.length).toBe(5);
  });
});
