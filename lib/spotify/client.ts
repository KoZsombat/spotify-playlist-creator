import { mapLimit } from "../async";
import type {
  SpotifyArtist,
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyPlaylistTrackItem,
  SpotifyTrack,
} from "./types";

const API = "https://api.spotify.com/v1";

export class SpotifyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SpotifyError";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

async function spotifyFetch<T>(
  token: string,
  path: string,
  { method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, Math.min(retryAfter, 5) * 1000);
      await promise;
      continue;
    }

    if (!response.ok) {
      let message = `Spotify request failed (${response.status})`;
      try {
        const payload = (await response.json()) as { error?: { message?: string } };
        if (payload.error?.message) message = payload.error.message;
      } catch {
        // Non-JSON error body; keep the status message.
      }
      if (response.status === 401) {
        throw new SpotifyError(401, "Spotify rejected the token. Sign in again.");
      }
      if (response.status === 403) {
        throw new SpotifyError(
          403,
          `${message}. The Spotify app may be in development mode without this account allowlisted, or the scope was not granted.`,
        );
      }
      throw new SpotifyError(response.status, message);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  throw new SpotifyError(429, "Spotify is rate limiting. Try again in a moment.");
}

export async function searchTracks(
  token: string,
  query: string,
  { limit = 50, offset = 0, market }: { limit?: number; offset?: number; market?: string } = {},
): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];
  const data = await spotifyFetch<{
    tracks?: { items: (SpotifyTrack | null)[] };
  }>(token, "/search", {
    query: { q: query, type: "track", limit: Math.min(limit, 50), offset, market },
  });
  return (data.tracks?.items ?? []).filter(
    (track): track is SpotifyTrack => Boolean(track?.id),
  );
}

export async function getTracks(
  token: string,
  ids: readonly string[],
): Promise<SpotifyTrack[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i + 50));
  const responses = await mapLimit(chunks, 3, (chunk) =>
    spotifyFetch<{ tracks: (SpotifyTrack | null)[] }>(token, "/tracks", {
      query: { ids: chunk.join(",") },
    }),
  );
  return responses
    .flatMap((response) => response.tracks)
    .filter((track): track is SpotifyTrack => Boolean(track?.id));
}

export async function getArtists(
  token: string,
  ids: readonly string[],
): Promise<SpotifyArtist[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return [];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 50) chunks.push(unique.slice(i, i + 50));
  const responses = await mapLimit(chunks, 3, (chunk) =>
    spotifyFetch<{ artists: (SpotifyArtist | null)[] }>(token, "/artists", {
      query: { ids: chunk.join(",") },
    }),
  );
  return responses
    .flatMap((response) => response.artists)
    .filter((artist): artist is SpotifyArtist => Boolean(artist?.id));
}

export async function getMe(token: string): Promise<{
  id: string;
  display_name: string | null;
  images: { url: string }[];
}> {
  return spotifyFetch(token, "/me");
}

export async function getMyPlaylists(
  token: string,
  { limit = 50, offset = 0 } = {},
): Promise<SpotifyPage<SpotifyPlaylist>> {
  return spotifyFetch(token, "/me/playlists", { query: { limit, offset } });
}

export async function getPlaylist(
  token: string,
  playlistId: string,
): Promise<SpotifyPlaylist> {
  return spotifyFetch(token, `/playlists/${playlistId}`);
}

export async function getPlaylistTracks(
  token: string,
  playlistId: string,
  { limit = 100, offset = 0 } = {},
): Promise<SpotifyPage<SpotifyPlaylistTrackItem>> {
  const data = await spotifyFetch<{
    items: SpotifyPlaylistTrackItem[];
    total: number;
    next: string | null;
    offset: number;
    limit: number;
  }>(token, `/playlists/${playlistId}/tracks`, {
    query: { limit, offset, additional_types: "track" },
  });
  return data;
}

export async function getLikedTracks(
  token: string,
  { limit = 50, offset = 0 } = {},
): Promise<SpotifyPage<{ track: SpotifyTrack | null; added_at: string | null }>> {
  return spotifyFetch(token, "/me/tracks", { query: { limit, offset } });
}

export async function createPlaylist(
  token: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    isPublic?: boolean;
    collaborative?: boolean;
  },
): Promise<SpotifyPlaylist> {
  return spotifyFetch(token, `/users/${encodeURIComponent(userId)}/playlists`, {
    method: "POST",
    body: {
      name: input.name,
      description: input.description ?? "",
      public: input.isPublic ?? false,
      collaborative: input.collaborative ?? false,
    },
  });
}

export async function addPlaylistItems(
  token: string,
  playlistId: string,
  uris: readonly string[],
): Promise<string | null> {
  let snapshotId: string | null = null;
  for (let i = 0; i < uris.length; i += 100) {
    const data = await spotifyFetch<{ snapshot_id: string }>(
      token,
      `/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        body: { uris: uris.slice(i, i + 100) },
      },
    );
    snapshotId = data?.snapshot_id ?? snapshotId;
  }
  return snapshotId;
}

export async function updatePlaylist(
  token: string,
  playlistId: string,
  input: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    collaborative?: boolean;
  },
): Promise<void> {
  await spotifyFetch(token, `/playlists/${playlistId}`, {
    method: "PUT",
    body: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isPublic !== undefined ? { public: input.isPublic } : {}),
      ...(input.collaborative !== undefined ? { collaborative: input.collaborative } : {}),
    },
  });
}

export async function removePlaylistItems(
  token: string,
  playlistId: string,
  uris: readonly string[],
): Promise<string | null> {
  let snapshotId: string | null = null;
  for (let i = 0; i < uris.length; i += 100) {
    const data = await spotifyFetch<{ snapshot_id: string }>(
      token,
      `/playlists/${playlistId}/tracks`,
      {
        method: "DELETE",
        body: { tracks: uris.slice(i, i + 100).map((uri) => ({ uri })) },
      },
    );
    snapshotId = data?.snapshot_id ?? snapshotId;
  }
  return snapshotId;
}

export async function unfollowPlaylist(
  token: string,
  playlistId: string,
): Promise<void> {
  await spotifyFetch(token, `/playlists/${playlistId}/followers`, {
    method: "DELETE",
  });
}
