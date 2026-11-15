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
  popularity: number;
  artists: SpotifyArtistRef[];
  album: SpotifyAlbumRef;
  external_urls?: { spotify?: string };
  is_local?: boolean;
};

export type SpotifyArtist = {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: SpotifyImage[];
  uri: string;
  external_urls?: { spotify?: string };
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
  tracks: { total: number; href?: string };
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
