import { HttpError } from "../http";
import { getSpotifyAccessToken, requireUser } from "../session";
import type { TrackSource } from "../music/generate";
import { getArtists, searchTracks, SpotifyError } from "./client";

/** Adapter that lets the pure generator talk to Spotify. */
export function spotifyTrackSource(token: string): TrackSource {
  return {
    search: (query, limit) => searchTracks(token, query, { limit }),
    getArtistGenres: async (artistIds) => {
      const artists = await getArtists(token, [...artistIds]);
      return new Map(artists.map((artist) => [artist.id, artist.genres ?? []]));
    },
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
  return new HttpError(502, error.message);
}
