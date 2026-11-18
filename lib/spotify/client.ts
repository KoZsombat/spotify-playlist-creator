import { mapLimit } from "../async";
import type {
  SpotifyPage,
  SpotifyPlaylist,
  SpotifyPlaylistTrackItem,
  SpotifyTrack,
} from "./types";

const API = "https://api.spotify.com/v1";

/** Spotify caps search pages at 10 results since the February 2026 migration. */
const SEARCH_PAGE_LIMIT = 10;
/** Playlist item pages cap at 50. */
const PLAYLIST_PAGE_LIMIT = 50;

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

  const MAX_ATTEMPTS = 4;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (response.status === 429) {
      const payload = (await response.clone().json().catch(() => null)) as {
        error?: { reason?: string };
      } | null;
      if (payload?.error?.reason === "QUOTA_EXCEEDED") {
        throw new SpotifyError(
          429,
          "Spotify's daily API quota is exhausted. Try again later or use fewer tracks.",
        );
      }
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new SpotifyError(429, "Spotify is rate limiting. Try again in a moment.");
      }
      // Big playlists fan out into many searches; wait out the reported window.
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, Math.min(Math.max(retryAfter, 1), 20) * 1000);
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
        const hint =
          message.toLowerCase() === "insufficient client scope"
            ? "Sign out and sign in again to grant the new permission."
            : "The Spotify app may be in development mode without this account allowlisted, or the endpoint is unavailable to it.";
        throw new SpotifyError(403, `${message}. ${hint}`);
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
  { limit = 10, offset = 0, market }: { limit?: number; offset?: number; market?: string } = {},
): Promise<SpotifyTrack[]> {
  if (!query.trim() || limit <= 0) return [];
  const tracks: SpotifyTrack[] = [];
  let cursor = offset;
  while (tracks.length < limit) {
    const pageSize = Math.min(SEARCH_PAGE_LIMIT, limit - tracks.length);
    const data = await spotifyFetch<{
      tracks?: { items: (SpotifyTrack | null)[] };
    }>(token, "/search", {
      query: { q: query, type: "track", limit: pageSize, offset: cursor, market },
    });
    const items = (data.tracks?.items ?? []).filter(
      (track): track is SpotifyTrack => Boolean(track?.id),
    );
    tracks.push(...items);
    if (items.length < pageSize) break;
    cursor += pageSize;
  }
  return tracks;
}

/** Batch endpoints were removed in February 2026; fetch each id separately. */
export async function getTracks(
  token: string,
  ids: readonly string[],
): Promise<SpotifyTrack[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  const tracks = await mapLimit(unique, 6, async (id) => {
    try {
      return await spotifyFetch<SpotifyTrack>(token, `/tracks/${id}`);
    } catch (error) {
      if (error instanceof SpotifyError && error.status === 404) return null;
      throw error;
    }
  });
  return tracks.filter((track): track is SpotifyTrack => Boolean(track?.id));
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
  const items: SpotifyPlaylistTrackItem[] = [];
  let cursor = offset;
  let total = 0;
  while (items.length < limit) {
    const pageSize = Math.min(PLAYLIST_PAGE_LIMIT, limit - items.length);
    const data = await spotifyFetch<{
      items: ({
        added_at?: string | null;
        item?: SpotifyTrack | null;
        track?: SpotifyTrack | null;
      } | null)[];
      total: number;
    }>(token, `/playlists/${playlistId}/items`, {
      query: { limit: pageSize, offset: cursor },
    });
    total = data.total;
    for (const entry of data.items) {
      if (!entry) continue;
      const track = entry.item ?? entry.track ?? null;
      if (track) items.push({ added_at: entry.added_at ?? null, track });
    }
    if (data.items.length < pageSize) break;
    cursor += pageSize;
  }
  return { items, total, next: null, offset, limit };
}

export async function getLikedTracks(
  token: string,
  { limit = 50, offset = 0 } = {},
): Promise<SpotifyPage<{ track: SpotifyTrack | null; added_at: string | null }>> {
  return spotifyFetch(token, "/me/tracks", { query: { limit, offset } });
}

export async function createPlaylist(
  token: string,
  input: {
    name: string;
    description?: string;
    isPublic?: boolean;
    collaborative?: boolean;
  },
): Promise<SpotifyPlaylist> {
  return spotifyFetch(token, "/me/playlists", {
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
      `/playlists/${playlistId}/items`,
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
      `/playlists/${playlistId}/items`,
      {
        method: "DELETE",
        body: { items: uris.slice(i, i + 100).map((uri) => ({ uri })) },
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
  await spotifyFetch(token, "/me/library", {
    method: "DELETE",
    query: { uris: `spotify:playlist:${playlistId}` },
  });
}
