"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TrackRow } from "@/components/track-row";
import { api } from "@/lib/client-utils";
import { interpretHeuristic, summarizeIntent } from "@/lib/music/intent";
import type {
  GenerateResult,
  PlaylistSummaryDTO,
  TrackDTO,
} from "@/lib/types";
import { IntentChips } from "./intent-chips";
import { SeedPicker } from "./seed-picker";

const STEPS = ["Basics", "Describe", "Your picks", "Review"];

const SUGGESTIONS = [
  "Rainy late-night synthwave for a long drive, 80s only, instrumental, nothing cheesy",
  "Warm Sunday morning: neo-soul, jazz and soft funk, no sad songs",
  "High-energy gym hip hop and drill, 2015+ only, explicit is fine",
  "Dreamy shoegaze and slow indie for reading in the rain",
];

type Created = PlaylistSummaryDTO & { warning: string | null; appended: number };

const DRAFT_KEY = "crate:create-draft:v1";
const DRAFT_VERSION = 1;

type Draft = {
  version: number;
  step: number;
  name: string;
  description: string;
  isPublic: boolean;
  collaborative: boolean;
  brief: string;
  seeds: TrackDTO[];
  includeSeeds: boolean;
  size: number;
  appendTo: string;
  result: GenerateResult | null;
  tracks: TrackDTO[];
};

function isTrackDTO(value: unknown): value is TrackDTO {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<TrackDTO>;
  return (
    typeof track.id === "string" &&
    typeof track.name === "string" &&
    typeof track.artists === "string" &&
    typeof track.uri === "string"
  );
}

function isGenerateResult(value: unknown): value is GenerateResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<GenerateResult>;
  const intent = result.intent;
  return (
    Boolean(intent) &&
    typeof intent?.summary === "string" &&
    Array.isArray(intent?.genres) &&
    Array.isArray(intent?.moods) &&
    Array.isArray(intent?.occasions) &&
    Array.isArray(intent?.languages) &&
    Array.isArray(intent?.keywords) &&
    Array.isArray(intent?.excludeKeywords) &&
    Array.isArray(intent?.excludeTags) &&
    Array.isArray(intent?.includeArtists) &&
    Array.isArray(intent?.excludeArtists) &&
    Array.isArray(intent?.evidence) &&
    typeof intent?.energy === "number" &&
    typeof result.stats === "object" &&
    result.stats !== null &&
    typeof result.stats.queries === "number"
  );
}

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Draft>;
    if (data.version !== DRAFT_VERSION) return null;
    const isPublic = data.isPublic === true;
    return {
      version: DRAFT_VERSION,
      step: Math.min(3, Math.max(0, Math.trunc(Number(data.step) || 0))),
      name: typeof data.name === "string" ? data.name.slice(0, 100) : "",
      description:
        typeof data.description === "string" ? data.description.slice(0, 300) : "",
      isPublic,
      collaborative: data.collaborative === true && !isPublic,
      brief: typeof data.brief === "string" ? data.brief.slice(0, 1200) : "",
      seeds: Array.isArray(data.seeds)
        ? data.seeds.filter(isTrackDTO).slice(0, 200)
        : [],
      includeSeeds: data.includeSeeds !== false,
      size: Math.min(200, Math.max(10, Math.trunc(Number(data.size) || 50))),
      appendTo: typeof data.appendTo === "string" ? data.appendTo : "",
      result: isGenerateResult(data.result) ? data.result : null,
      tracks: Array.isArray(data.tracks)
        ? data.tracks.filter(isTrackDTO).slice(0, 200)
        : [],
    };
  } catch {
    return null;
  }
}

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [collaborative, setCollaborative] = useState(false);
  const [brief, setBrief] = useState("");
  const [seeds, setSeeds] = useState<TrackDTO[]>([]);
  const [includeSeeds, setIncludeSeeds] = useState(true);
  const [size, setSize] = useState(50);
  const [library, setLibrary] = useState<PlaylistSummaryDTO[] | null>(null);
  const [appendTo, setAppendTo] = useState("");

  const [result, setResult] = useState<GenerateResult | null>(null);
  const [tracks, setTracks] = useState<TrackDTO[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftRef = useRef<Draft | null>(null);

  const preview = useMemo(() => {
    const intent = interpretHeuristic(brief);
    intent.summary = summarizeIntent(intent);
    return intent;
  }, [brief]);

  const shownIntent = result?.intent ?? preview;

  const setPickedSeeds = (next: TrackDTO[]) => {
    setSeeds(next);
    if (includeSeeds && next.length > size) {
      setSize(Math.min(200, next.length));
    }
  };

  const canContinue =
    step === 0
      ? name.trim().length > 0
      : step === 1
        ? brief.trim().length >= 3
        : true;

  const loadLibrary = async () => {
    if (library) return;
    try {
      const data = await api<{ playlists: PlaylistSummaryDTO[] }>(
        "/api/library/playlists",
      );
      setLibrary(data.playlists);
    } catch {
      setLibrary([]);
    }
  };

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setStep(draft.step);
      setName(draft.name);
      setDescription(draft.description);
      setIsPublic(draft.isPublic);
      setCollaborative(draft.collaborative);
      setBrief(draft.brief);
      setSeeds(draft.seeds);
      setIncludeSeeds(draft.includeSeeds);
      setSize(draft.size);
      setAppendTo(draft.appendTo);
      setResult(draft.result);
      setTracks(draft.tracks);
      if (draft.step === 3) void loadLibrary();
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    if (created) {
      draftRef.current = null;
      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Storage can be unavailable in private mode; the creation still works.
      }
      return;
    }
    const draft: Draft = {
      version: DRAFT_VERSION,
      step,
      name,
      description,
      isPublic,
      collaborative,
      brief,
      seeds,
      includeSeeds,
      size,
      appendTo,
      result: result ? { ...result, tracks: [] } : null,
      tracks,
    };
    draftRef.current = draft;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Quota or disabled storage should not break the wizard.
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    draftLoaded,
    created,
    step,
    name,
    description,
    isPublic,
    collaborative,
    brief,
    seeds,
    includeSeeds,
    size,
    appendTo,
    result,
    tracks,
  ]);

  useEffect(() => {
    const flush = () => {
      const draft = draftRef.current;
      if (!draft) return;
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Ignore disabled storage.
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const goNext = async () => {
    setError(null);
    if (step === 3) return;
    if (isPublic) setCollaborative(false);
    const next = step + 1;
    setStep(next);
    if (next === 3) await loadLibrary();
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api<GenerateResult>("/api/generate", {
        method: "POST",
        body: JSON.stringify({
          description: brief,
          seedIds: seeds.map((seed) => seed.id),
          includeSeeds,
          limit: size,
        }),
      });
      setResult(data);
      setTracks(data.tracks);
      setStep(3);
      await loadLibrary();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const response = await api<{
        playlist: PlaylistSummaryDTO;
        appended: number;
        warning: string | null;
      }>("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: (description.trim() || brief.trim()).slice(0, 300),
          isPublic,
          collaborative,
          trackIds: tracks.map((track) => track.id),
          intent: result?.intent ?? null,
          ...(appendTo ? { appendTo } : {}),
        }),
      });
      setCreated({
        ...response.playlist,
        appended: response.appended,
        warning: response.warning,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create playlist");
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore disabled storage.
    }
    setStep(0);
    setName("");
    setDescription("");
    setIsPublic(false);
    setCollaborative(false);
    setBrief("");
    setSeeds([]);
    setIncludeSeeds(true);
    setSize(50);
    setResult(null);
    setTracks([]);
    setCreated(null);
    setError(null);
    setAppendTo("");
  };

  if (created) {
    return (
      <div className="card mx-auto max-w-2xl p-8 text-center">
        <div className="mx-auto size-28 overflow-hidden rounded-2xl bg-surface-3">
          {created.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={created.image} alt="" className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center text-accent">
              <Check className="size-10" />
            </span>
          )}
        </div>
        <p className="eyebrow mt-5">Done</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{created.name}</h2>
        <p className="mt-2 text-sm text-muted">
          {created.appended > 0
            ? `${created.appended} tracks are now on Spotify.`
            : "The playlist was created, but Spotify reported a problem adding tracks."}
        </p>
        {created.warning ? (
          <p className="mx-auto mt-3 max-w-md rounded-xl border border-warn/30 bg-warn/[0.06] px-3 py-2 text-xs text-warn">
            {created.warning}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a
            href={created.url}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            <ExternalLink className="size-4" />
            Open in Spotify
          </a>
          <Link href={`/playlists/${created.id}`} className="btn-ghost">
            Manage in Crate
          </Link>
          <button type="button" className="btn-ghost" onClick={reset}>
            <RefreshCw className="size-4" />
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_0.55fr]">
      <div className="card overflow-hidden">
        <div className="flex items-center gap-1 border-b border-border px-4 py-3 sm:px-5">
          {STEPS.map((label, index) => {
            const state =
              index === step ? "current" : index < step ? "done" : "upcoming";
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={index >= step}
                  onClick={() => {
                    setError(null);
                    setStep(index);
                  }}
                  className="flex min-w-0 items-center gap-2 text-left disabled:cursor-default"
                >
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px] ${
                      state === "current"
                        ? "border-accent bg-accent/15 text-accent"
                        : state === "done"
                          ? "border-accent/40 bg-accent/10 text-accent-soft"
                          : "border-border text-muted"
                    }`}
                  >
                    {state === "done" ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span
                    className={`hidden truncate text-[11px] font-medium sm:block ${
                      state === "upcoming" ? "text-muted" : "text-fg"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {index < STEPS.length - 1 ? (
                  <span className="h-px flex-1 bg-border" />
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-5 p-4 sm:p-6">
          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          {step === 0 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Give the playlist a home
                </h2>
                <p className="text-xs text-muted">
                  These settings are applied on Spotify exactly as chosen here.
                </p>
              </div>

              <label className="block">
                <span className="label">Title</span>
                <input
                  className="input"
                  placeholder="Late night drive, 1986"
                  value={name}
                  maxLength={100}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="label">Playlist description (optional)</span>
                <textarea
                  className="input min-h-20 resize-y"
                  placeholder="What is this playlist for?"
                  value={description}
                  maxLength={300}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <div>
                <span className="label">Visibility</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      value: false,
                      title: "Private",
                      body: "Only you (and collaborators) can open it.",
                    },
                    {
                      value: true,
                      title: "Public",
                      body: "Anyone with the link can listen.",
                    },
                  ].map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => setIsPublic(option.value)}
                      className={`rounded-xl border p-3 text-left transition ${
                        isPublic === option.value
                          ? "border-accent/50 bg-accent/[0.07]"
                          : "border-border hover:bg-surface-2"
                      }`}
                    >
                      <span className="flex items-center justify-between text-sm font-medium">
                        {option.title}
                        <span
                          className={`size-3 rounded-full border ${
                            isPublic === option.value
                              ? "border-accent bg-accent"
                              : "border-muted"
                          }`}
                        />
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                        {option.body}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border p-3">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-[var(--color-accent)]"
                  checked={collaborative}
                  disabled={isPublic}
                  onChange={(event) => setCollaborative(event.target.checked)}
                />
                <span>
                  <span className="block text-sm font-medium">Collaborative</span>
                  <span className="block text-[11px] leading-relaxed text-muted">
                    Let friends add tracks. Spotify requires collaborative playlists to
                    be private, so this turns visibility off.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Describe the music in your own words
                </h2>
                <p className="text-xs text-muted">
                  Mentions of genres, moods, decades, languages and vetoes are parsed
                  live. Searches use genre tags, eras, languages and artists: Spotify
                  no longer exposes moods, so mood words only shape the brief.
                </p>
              </div>

              <textarea
                className="input min-h-40 resize-y text-base leading-relaxed"
                placeholder="e.g. melancholic city pop for a rainy train ride, Japanese vocals welcome, nothing too upbeat"
                value={brief}
                maxLength={1200}
                onChange={(event) => setBrief(event.target.value)}
                autoFocus
              />

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="chip text-left transition hover:border-accent/40 hover:text-accent-soft"
                    onClick={() => setBrief(suggestion)}
                  >
                    {suggestion.length > 52
                      ? `${suggestion.slice(0, 52)}…`
                      : suggestion}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border bg-bg/40 p-4">
                <IntentChips intent={preview} />
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Anchor it with music you already chose
                </h2>
                <p className="text-xs text-muted">
                  Seeds steer the search and stay in the playlist unless you turn that
                  off in review.
                </p>
              </div>
              <SeedPicker seeds={seeds} onChange={setPickedSeeds} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg/40 px-4 py-3">
                <div>
                  <p className="text-xs font-medium">Playlist size</p>
                  <p className="text-[11px] text-muted">10–200 tracks</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    step={10}
                    value={size}
                    aria-label="Playlist size"
                    className="input w-24 text-right font-mono"
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isFinite(value)) return;
                      setSize(Math.min(200, Math.max(10, Math.round(value))));
                    }}
                  />
                  <span className="text-[11px] text-muted">tracks</span>
                </label>
              </div>

              {tracks.length === 0 ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                      Ready to build {size} tracks
                    </h2>
                    <p className="text-xs text-muted">
                      {seeds.length > 0
                        ? `${seeds.length} seed track${seeds.length === 1 ? "" : "s"} will guide the search.`
                        : "No seeds — the description alone drives the search."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-bg/40 p-4">
                    <IntentChips intent={preview} />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-accent)]"
                      checked={includeSeeds}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setIncludeSeeds(checked);
                        if (checked && seeds.length > size) {
                          setSize(Math.min(200, seeds.length));
                        }
                      }}
                    />
                    <span className="text-xs text-muted">
                      Include my {seeds.length} pick{seeds.length === 1 ? "" : "s"} in the
                      final {size}
                    </span>
                  </label>

                  {includeSeeds && seeds.length > size ? (
                    <p className="rounded-lg border border-warn/30 bg-warn/[0.06] px-3 py-2 text-[11px] text-warn">
                      Only the first {size} of your {seeds.length} picks fit. Raise the
                      playlist size to include them all.
                    </p>
                  ) : null}

                  <button
                    type="button"
                    className="btn-primary w-full"
                    disabled={generating}
                    onClick={generate}
                  >
                    {generating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wand2 className="size-4" />
                    )}
                    {generating ? "Digging through Spotify…" : `Generate ${size} tracks`}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">
                        {tracks.length} tracks ready
                      </h2>
                      <p className="text-xs text-muted">
                        {result
                          ? `${result.stats.queries} searches · ${result.stats.candidates} candidates · ${result.stats.artistCap > 0 ? `${result.stats.artistCap} per artist max` : "no artist cap"} · ${result.engine === "llm" ? "LLM-refined" : "local parser"}`
                          : null}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      disabled={generating}
                      onClick={generate}
                    >
                      {generating ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      Regenerate
                    </button>
                  </div>

                  <div className="rounded-xl border border-border bg-bg/40 p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                      Interpretation
                    </p>
                    <p className="mt-1 text-xs text-fg/80">{shownIntent.summary}</p>
                  </div>

                  <div className="max-h-[30rem] space-y-0.5 overflow-y-auto pr-1">
                    {tracks.map((track, index) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        index={index + 1}
                        action={
                          <button
                            type="button"
                            aria-label={`Remove ${track.name}`}
                            className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-danger"
                            onClick={() =>
                              setTracks((current) =>
                                current.filter((item) => item.id !== track.id),
                              )
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        }
                      />
                    ))}
                  </div>

                  <div className="space-y-3 rounded-xl border border-border bg-bg/40 p-4">
                    <label className="block">
                      <span className="label">Destination</span>
                      <select
                        className="select"
                        value={appendTo}
                        onChange={(event) => setAppendTo(event.target.value)}
                      >
                        <option value="">Create a new playlist</option>
                        {(library ?? []).map((playlist) => (
                          <option key={playlist.id} value={playlist.id}>
                            Append to: {playlist.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    {appendTo ? (
                      <p className="text-[11px] leading-relaxed text-muted">
                        Tracks are appended to the selected playlist. The title and
                        description from step one are ignored.
                      </p>
                    ) : (
                      <p className="text-[11px] leading-relaxed text-muted">
                        Will be created as{" "}
                        <span className="text-fg">{name || "Untitled playlist"}</span> ·{" "}
                        {isPublic ? "public" : "private"}
                        {collaborative ? " · collaborative" : ""}.
                      </p>
                    )}

                    <button
                      type="button"
                      className="btn-primary w-full"
                      disabled={publishing || tracks.length === 0}
                      onClick={publish}
                    >
                      {publishing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      {publishing
                        ? "Talking to Spotify…"
                        : appendTo
                          ? `Add ${tracks.length} tracks to playlist`
                          : `Create playlist with ${tracks.length} tracks`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={step === 0 || generating || publishing}
            onClick={() => {
              setError(null);
              setStep((current) => Math.max(0, current - 1));
            }}
          >
            <ArrowLeft className="size-3.5" />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!canContinue}
              onClick={goNext}
            >
              Continue
              <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={generating || publishing}
              onClick={() => setStep(0)}
            >
              Edit basics
            </button>
          )}
        </div>
      </div>

      <aside className="card space-y-4 p-5 lg:sticky lg:top-24">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Brief</p>
          <p className="mt-1 truncate text-sm font-semibold">
            {name || "Untitled playlist"}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">
            {isPublic ? "public" : "private"}
            {collaborative ? " · collaborative" : ""}
          </p>
        </div>

        <p className="line-clamp-4 text-xs leading-relaxed text-fg/70">
          {brief || "No description yet."}
        </p>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-border px-2 py-2">
            <p className="font-mono text-base">{seeds.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">seeds</p>
          </div>
          <div className="rounded-lg border border-border px-2 py-2">
            <p className="font-mono text-base">{tracks.length || "—"}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted">tracks</p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <IntentChips intent={shownIntent} />
        </div>

        {result ? (
          <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted">
            {result.stats.sourceTracks > 0
              ? `${result.stats.sourceTracks} seeds kept at the core`
              : "Generated from the description"}
            {result.stats.artistCap > 0
              ? ` · max ${result.stats.artistCap} tracks by one artist`
              : " · no artist cap"}
            .
          </p>
        ) : null}
      </aside>
    </div>
  );
}
