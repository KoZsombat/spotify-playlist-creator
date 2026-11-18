export type SpotifyImage = {
  url: string;
  height: number | null;
  width: number | null;
};

export type SpotifyArtistRef = {
  id: string;
  name: string;
  uri?: string;
};

export type SpotifyAlbumRef = {
  id: string;
  name: string;
  release_date?: string;
  images: SpotifyImage[];
  album_type?: string;
};

export type SpotifyTrack = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  explicit: boolean;
  /** Removed from the Web API in February 2026; extended-quota apps still get it. */
  popularity?: number;
  artists: SpotifyArtistRef[];
  album: SpotifyAlbumRef;
  external_urls?: { spotify?: string };
  is_local?: boolean;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string | null;
  public: boolean | null;
  collaborative: boolean;
  owner: { id: string; display_name: string | null };
  images: SpotifyImage[] | null;
  external_urls?: { spotify?: string };
  /** Contents are only included for playlists the user owns or collaborates on. */
  items?: { total: number; href?: string } | null;
  /** Pre-February-2026 name for `items`; still returned to extended-quota apps. */
  tracks?: { total: number; href?: string } | null;
  snapshot_id?: string;
};

export type SpotifyPlaylistTrackItem = {
  added_at: string | null;
  track: SpotifyTrack | null;
};

export type SpotifyPage<T> = {
  items: T[];
  total: number;
  next: string | null;
  offset: number;
  limit: number;
};
