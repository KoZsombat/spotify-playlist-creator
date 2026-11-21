"use client";

import { Heart, ListMusic, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PlayTrackButton } from "@/components/track-player";
import { api } from "@/lib/client-utils";
import type { PlaylistSummaryDTO, TrackDTO } from "@/lib/types";

const MAX_SEEDS = 200;

export function SeedPicker({
  seeds,
  onChange,
}: {
  seeds: TrackDTO[];
  onChange: (seeds: TrackDTO[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<"search" | "liked" | "playlist">("search");
  const [sourceTracks, setSourceTracks] = useState<TrackDTO[]>([]);
  const [libraryPlaylists, setLibraryPlaylists] = useState<PlaylistSummaryDTO[] | null>(
    null,
  );
  const [selectedPlaylist, setSelectedPlaylist] = useState("");
  const [loadingSource, setLoadingSource] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picksRef = useRef<HTMLUListElement>(null);
  const lastSeedCount = useRef(seeds.length);

  useEffect(() => {
    const grew = seeds.length > lastSeedCount.current;
    lastSeedCount.current = seeds.length;
    const list = picksRef.current;
    if (grew && list) list.scrollTop = list.scrollHeight;
  }, [seeds.length]);

  useEffect(() => {
    if (mode !== "search") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await api<{ tracks: TrackDTO[] }>(
          `/api/tracks/search?q=${encodeURIComponent(trimmed)}&limit=8`,
        );
        if (!cancelled) setResults(data.tracks);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Search failed");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, mode]);

  const isSelected = (id: string) => seeds.some((seed) => seed.id === id);

  const add = (track: TrackDTO) => {
    if (seeds.length >= MAX_SEEDS || isSelected(track.id)) return;
    onChange([...seeds, track]);
    setError(null);
  };

  const addMany = (tracks: TrackDTO[]) => {
    if (seeds.length >= MAX_SEEDS) return;
    setError(null);
    const next = [...seeds];
    const ids = new Set(next.map((seed) => seed.id));
    for (const track of tracks) {
      if (next.length >= MAX_SEEDS) break;
      if (ids.has(track.id)) continue;
      ids.add(track.id);
      next.push(track);
    }
    if (next.length !== seeds.length) onChange(next);
  };

  const remove = (id: string) => {
    onChange(seeds.filter((seed) => seed.id !== id));
  };

  const loadLiked = async () => {
    setMode("liked");
    setLoadingSource(true);
    setError(null);
    try {
      const data = await api<{ tracks: TrackDTO[] }>("/api/library/liked?limit=200");
      setSourceTracks(data.tracks);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load liked songs");
    } finally {
      setLoadingSource(false);
    }
  };

  const loadPlaylists = async () => {
    setMode("playlist");
    setError(null);
    if (libraryPlaylists) return;
    setLoadingSource(true);
    try {
      const data = await api<{ playlists: PlaylistSummaryDTO[] }>(
        "/api/library/playlists",
      );
      setLibraryPlaylists(data.playlists);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load playlists");
    } finally {
      setLoadingSource(false);
    }
  };

  const loadPlaylistTracks = async (playlistId: string) => {
    setSelectedPlaylist(playlistId);
    if (!playlistId) return;
    setLoadingSource(true);
    setError(null);
    try {
      const data = await api<{ tracks: { track: TrackDTO }[] }>(
        `/api/library/playlists/${playlistId}?limit=200`,
      );
      setSourceTracks(data.tracks.map((item) => item.track));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load that playlist");
    } finally {
      setLoadingSource(false);
    }
  };

  const visibleTracks = mode === "search" ? results : sourceTracks;

  const renderResult = (track: TrackDTO) => (
    <div
      key={track.id}
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
    >
      <div className="size-8 shrink-0 overflow-hidden rounded bg-surface-3">
        {track.albumImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.albumImage} alt="" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{track.name}</p>
        <p className="truncate text-[11px] text-muted">{track.artists}</p>
      </div>
      <PlayTrackButton track={track} />
      <button
        type="button"
        className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-accent disabled:opacity-30"
        aria-label={`Add ${track.name}`}
        disabled={isSelected(track.id) || seeds.length >= MAX_SEEDS}
        onClick={() => add(track)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
            Your picks ({seeds.length}/{MAX_SEEDS})
          </p>
          {seeds.length > 0 ? (
            <button
              type="button"
              className="text-[11px] text-muted underline-offset-2 hover:text-fg hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          ) : null}
        </div>
        {seeds.length === 0 ? (
          <p className="mt-2 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted">
            Optional. Add up to {MAX_SEEDS} tracks you already want — the engine
            builds around them.
          </p>
        ) : (
          <ul
            ref={picksRef}
            className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1"
          >
            {seeds.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-2 rounded-lg bg-surface-2 px-2 py-1.5"
              >
                <div className="size-7 shrink-0 overflow-hidden rounded bg-surface-3">
                  {track.albumImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={track.albumImage} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{track.name}</p>
                  <p className="truncate text-[11px] text-muted">{track.artists}</p>
                </div>
                <PlayTrackButton track={track} />
                <button
                  type="button"
                  aria-label={`Remove ${track.name}`}
                  className="grid size-7 place-items-center rounded-full text-muted hover:bg-surface-3 hover:text-danger"
                  onClick={() => remove(track.id)}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm ${mode === "search" ? "bg-surface-3" : "border border-border"}`}
          onClick={() => setMode("search")}
        >
          <Search className="size-3.5" />
          Search
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "liked" ? "bg-surface-3" : "border border-border"}`}
          onClick={loadLiked}
        >
          <Heart className="size-3.5" />
          Liked songs
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === "playlist" ? "bg-surface-3" : "border border-border"}`}
          onClick={loadPlaylists}
        >
          <ListMusic className="size-3.5" />
          Your playlists
        </button>
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
          {error}
        </p>
      ) : null}

      {mode === "search" ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Search Spotify tracks…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />
          ) : null}
        </div>
      ) : null}

      {mode === "playlist" && !selectedPlaylist && libraryPlaylists ? (
        <div className="space-y-1">
          {libraryPlaylists.length === 0 ? (
            <p className="text-xs text-muted">
              No playlists you own yet. Spotify only exposes tracks of playlists you
              own or collaborate on.
            </p>
          ) : (
            libraryPlaylists.map((playlist) => (
              <button
                key={playlist.id}
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-surface-2"
                onClick={() => loadPlaylistTracks(playlist.id)}
              >
                <span className="min-w-0 flex-1 truncate">{playlist.name}</span>
                <span className="shrink-0 text-[11px] text-muted">
                  {playlist.trackCount}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {loadingSource ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-4 animate-spin" />
          Loading…
        </div>
      ) : null}

      {mode !== "playlist" || selectedPlaylist ? (
        <div className="space-y-1">
          {visibleTracks.length > 0 ? (
            <div className="flex items-center justify-between px-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                {visibleTracks.length}{" "}
                {mode === "search" ? "results" : "tracks"}
              </p>
              <button
                type="button"
                className="text-[11px] text-muted underline-offset-2 hover:text-fg hover:underline disabled:opacity-40 disabled:hover:no-underline"
                disabled={
                  seeds.length >= MAX_SEEDS ||
                  visibleTracks.every((track) => isSelected(track.id))
                }
                onClick={() => addMany(visibleTracks)}
              >
                Add all
              </button>
            </div>
          ) : null}
          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {visibleTracks.length === 0 && !loadingSource ? (
              <p className="py-4 text-center text-xs text-muted">
                {mode === "search"
                  ? "Type at least two characters to search."
                  : "Nothing to show here."}
              </p>
            ) : (
              visibleTracks.map(renderResult)
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
