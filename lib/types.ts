export type TrackDTO = {
  id: string;
  name: string;
  artists: string;
  artistIds: string[];
  album: string;
  albumImage: string | null;
  durationMs: number;
  explicit: boolean;
  popularity: number;
  year: number | null;
  url: string;
  uri: string;
};

export type PlaylistSummaryDTO = {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  collaborative: boolean;
  trackCount: number;
  ownerName: string;
  image: string | null;
  url: string;
};

export type PlaylistTrackDTO = {
  addedAt: string | null;
  track: TrackDTO;
};

export type PlaylistDetailDTO = PlaylistSummaryDTO & {
  tracks: PlaylistTrackDTO[];
  snapshotId: string;
};

export type Intent = {
  genres: string[];
  moods: string[];
  occasions: string[];
  languages: string[];
  keywords: string[];
  excludeKeywords: string[];
  /** Genres/moods/occasions the user vetoed; matched against artist genres too. */
  excludeTags: string[];
  includeArtists: string[];
  excludeArtists: string[];
  energy: number;
  popularityTarget: number;
  yearRange: [number, number] | null;
  instrumental: boolean;
  explicitAllowed: boolean;
  maxPerArtist: number;
  evidence: { label: string; kind: string }[];
  summary: string;
};

export type InterpretResult = {
  intent: Intent;
  engine: "llm" | "heuristic";
};

export type GenerateStats = {
  queries: number;
  candidates: number;
  sourceTracks: number;
  artistCap: number;
};

export type GenerateResult = {
  tracks: TrackDTO[];
  intent: Intent;
  engine: "llm" | "heuristic";
  stats: GenerateStats;
};
