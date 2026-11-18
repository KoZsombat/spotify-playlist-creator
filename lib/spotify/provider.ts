import { HttpError } from "../http";
import { getSpotifyAccessToken, requireUser } from "../session";
import type { TrackSource } from "../music/generate";
import type { SpotifyTrack } from "./types";
import { getAppAccessToken } from "./app-token";
import { searchTracks, SpotifyError } from "./client";

const SEARCH_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map<string, { expires: number; tracks: SpotifyTrack[] }>();

/**
 * Regenerating the same brief, or appending another playlist of the same size,
 * would otherwise re-run dozens of identical searches against a small dev-mode
 * quota. Results are cached for a few minutes.
 */
async function cachedSearch(
  market: string,
  query: string,
  limit: number,
): Promise<SpotifyTrack[]> {
  const key = `${market}|${limit}|${query}`;
  const hit = searchCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.tracks;

  const token = await getAppAccessToken();
  let tracks = await searchTracks(token, query, { limit, market });
  if (tracks.length === 0 && query.includes("genre:")) {
    // Spotify has no tag for this genre; fall back to the plain phrase.
    const text = query.replace(/genre:"([^"]*)"/g, "$1").replace(/\s+/g, " ").trim();
    tracks = await searchTracks(token, text || "popular hits", { limit, market });
  }

  if (tracks.length > 0) {
    if (searchCache.size >= 200) {
      const oldest = searchCache.keys().next().value;
      if (oldest) searchCache.delete(oldest);
    }
    searchCache.set(key, { expires: Date.now() + SEARCH_TTL_MS, tracks });
  }
  return tracks;
}

/** Adapter that lets the pure generator talk to Spotify. */
export function spotifyTrackSource(market: string): TrackSource {
  return {
    search: (query, limit) => cachedSearch(market, query, limit),
  };
}

export async function requireSpotify() {
  const user = await requireUser();
  const token = await getSpotifyAccessToken(user.id);
  return { user, token };
}

/** Normalizes Spotify failures into API-safe HTTP errors. */
export function toHttpError(error: unknown): unknown {
  if (!(error instanceof SpotifyError)) return error;
  if (error.status === 401) return new HttpError(401, "Spotify session expired. Sign in again.");
  if (error.status === 403) return new HttpError(403, error.message);
  if (error.status === 404) return new HttpError(404, "Spotify resource not found");
  if (error.status === 429) return new HttpError(429, error.message);
  return new HttpError(502, error.message);
}
