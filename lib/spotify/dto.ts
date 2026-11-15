import type { PlaylistSummaryDTO, TrackDTO } from "../types";
import type { SpotifyTrack } from "./types";

export function toTrackDTO(track: SpotifyTrack): TrackDTO {
  const releaseDate = track.album.release_date ?? "";
  const year = Number(releaseDate.slice(0, 4));
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((artist) => artist.name).join(", "),
    artistIds: track.artists.map((artist) => artist.id),
    album: track.album.name,
    albumImage: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    explicit: track.explicit,
    popularity: track.popularity,
    year: Number.isFinite(year) && year > 1900 ? year : null,
    url: track.external_urls?.spotify ?? `https://open.spotify.com/track/${track.id}`,
    uri: track.uri,
  };
}

export function toPlaylistSummary(playlist: {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: { display_name: string | null };
  images: { url: string }[] | null;
  external_urls?: { spotify?: string };
  tracks: { total: number };
}): PlaylistSummaryDTO {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description ?? "",
    isPublic: playlist.public ?? false,
    collaborative: playlist.collaborative,
    trackCount: playlist.tracks.total,
    ownerName: playlist.owner.display_name ?? "",
    image: playlist.images?.[0]?.url ?? null,
    url: playlist.external_urls?.spotify ?? `https://open.spotify.com/playlist/${playlist.id}`,
  };
}
