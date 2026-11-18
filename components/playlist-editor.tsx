"use client";

import { ExternalLink, Music4, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TrackRow } from "@/components/track-row";
import { api } from "@/lib/client-utils";
import type { PlaylistDetailDTO, PlaylistTrackDTO } from "@/lib/types";

export function PlaylistEditor({ playlist }: { playlist: PlaylistDetailDTO }) {
  const router = useRouter();
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [isPublic, setIsPublic] = useState(playlist.isPublic);
  const [collaborative, setCollaborative] = useState(playlist.collaborative);
  const [tracks, setTracks] = useState<PlaylistTrackDTO[]>(playlist.tracks);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== playlist.name ||
    description !== playlist.description ||
    isPublic !== playlist.isPublic ||
    collaborative !== playlist.collaborative;

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description,
          isPublic,
          collaborative,
        }),
      });
      setNotice("Saved to Spotify.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    setRemovingId(trackId);
    setError(null);
    setNotice(null);
    try {
      await api(`/api/playlists/${playlist.id}/tracks`, {
        method: "DELETE",
        body: JSON.stringify({ trackIds: [trackId] }),
      });
      setTracks((current) => current.filter((item) => item.track.id !== trackId));
      setNotice("Track removed.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove track");
    } finally {
      setRemovingId(null);
    }
  };

  const removePlaylist = async () => {
    if (
      !window.confirm(
        "Remove this playlist from your Spotify library? The playlist itself stays on Spotify for anyone with the link.",
      )
    ) {
      return;
    }
    setError(null);
    try {
      await api(`/api/playlists/${playlist.id}`, { method: "DELETE" });
      router.push("/playlists");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove playlist");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="size-32 shrink-0 overflow-hidden rounded-2xl bg-surface-3 sm:size-40">
          {playlist.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={playlist.image} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-muted">
              <Music4 className="size-8" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{playlist.isPublic ? "Public playlist" : "Private playlist"}</p>
          <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">
            {playlist.name}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {tracks.length} shown · {playlist.trackCount} total · {playlist.ownerName}
            {playlist.collaborative ? " · collaborative" : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={playlist.url}
              target="_blank"
              rel="noreferrer"
              className="btn-primary btn-sm"
            >
              <ExternalLink className="size-3.5" />
              Open in Spotify
            </a>
            <button type="button" className="btn-danger btn-sm" onClick={removePlaylist}>
              <Trash2 className="size-3.5" />
              Remove from library
            </button>
          </div>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent-soft">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Details
          </h2>

          <label className="block">
            <span className="label">Name</span>
            <input
              className="input"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="label">Description</span>
            <textarea
              className="input min-h-24 resize-y"
              value={description}
              maxLength={300}
              onChange={(event) => setDescription(event.target.value)}
            />
            <span className="mt-1 block text-right font-mono text-[10px] text-muted">
              {description.length}/300
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Visibility</span>
              <select
                className="select"
                value={isPublic ? "public" : "private"}
                onChange={(event) => setIsPublic(event.target.value === "public")}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Collaborative</span>
              <select
                className="select"
                value={collaborative ? "yes" : "no"}
                onChange={(event) => setCollaborative(event.target.value === "yes")}
                disabled={isPublic}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="btn-primary w-full"
            disabled={!dirty || saving}
            onClick={save}
          >
            <Save className="size-4" />
            {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
          </button>
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Tracks
            </h2>
            <span className="text-xs text-muted">{tracks.length} shown</span>
          </div>
          <div className="mt-3 max-h-[38rem] space-y-0.5 overflow-y-auto pr-1">
            {tracks.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted">This playlist is empty.</p>
            ) : (
              tracks.map((item, index) => (
                <TrackRow
                  key={`${item.track.id}-${index}`}
                  track={item.track}
                  index={index + 1}
                  action={
                    <button
                      type="button"
                      aria-label={`Remove ${item.track.name}`}
                      title="Remove from playlist"
                      className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-danger disabled:opacity-40"
                      disabled={removingId === item.track.id}
                      onClick={() => removeTrack(item.track.id)}
                    >
                      <X className="size-4" />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
