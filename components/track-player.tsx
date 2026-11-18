"use client";

import { ExternalLink, Pause, Play, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { TrackDTO } from "@/lib/types";

export type PlayableTrack = Pick<
  TrackDTO,
  "id" | "name" | "artists" | "albumImage" | "url"
>;

type SpotifyController = {
  play: () => unknown;
  togglePlay: () => unknown;
  destroy: () => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

/** The embed API sometimes returns a promise and sometimes undefined. */
function ignoreResult(result: unknown) {
  if (result && typeof (result as Promise<unknown>).catch === "function") {
    (result as Promise<unknown>).catch(() => {});
  }
}

const IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
let iframeApi: Promise<SpotifyIframeApi> | null = null;

/** Loads Spotify's embed controller once; previews need no token or scope. */
function loadIframeApi(): Promise<SpotifyIframeApi> {
  if (iframeApi) return iframeApi;
  iframeApi = new Promise((resolve) => {
    window.onSpotifyIframeApiReady = (api) => resolve(api);
    const script = document.createElement("script");
    script.src = IFRAME_API_SRC;
    script.async = true;
    document.body.appendChild(script);
  });
  return iframeApi;
}

type PlayerContextValue = {
  currentId: string | null;
  playing: boolean;
  toggle: (track: PlayableTrack) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function useTrackPlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("useTrackPlayer must be used inside TrackPlayerProvider");
  return context;
}

export function TrackPlayerProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<PlayableTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SpotifyController | null>(null);

  const currentId = current?.id ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!currentId || !host) return;
    // The embed API owns this element; keeping it out of React's tree avoids
    // removeChild conflicts when the track changes.
    const target = document.createElement("div");
    host.appendChild(target);
    let cancelled = false;
    loadIframeApi().then((api) => {
      if (cancelled) {
        target.remove();
        return;
      }
      api.createController(
        target,
        { uri: `spotify:track:${currentId}`, width: "100%", height: 80 },
        (controller) => {
          if (cancelled) {
            controller.destroy();
            return;
          }
          controllerRef.current = controller;
          // A click opened this track, so the browser should allow playback.
          ignoreResult(controller.play());
        },
      );
    });

    return () => {
      cancelled = true;
      const previous = controllerRef.current;
      controllerRef.current = null;
      try {
        previous?.destroy();
      } catch {
        // The container may already be gone; nothing to clean up then.
      }
      target.remove();
    };
  }, [currentId]);

  const toggle = useCallback(
    (track: PlayableTrack) => {
      if (current?.id === track.id) {
        const controller = controllerRef.current;
        if (!controller) return;
        setPlaying((value) => !value);
        ignoreResult(controller.togglePlay());
        return;
      }
      setCurrent(track);
      setPlaying(true);
    },
    [current?.id],
  );

  const close = () => {
    const controller = controllerRef.current;
    controllerRef.current = null;
    try {
      controller?.destroy();
    } catch {
      // Ignore teardown races.
    }
    setCurrent(null);
    setPlaying(false);
  };

  return (
    <PlayerContext.Provider value={{ currentId, playing, toggle }}>
      {children}
      {current ? (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-md rounded-2xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[380px]">
          <div className="flex items-center gap-3">
            <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-3">
              {current.albumImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.albumImage} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{current.name}</p>
              <p className="truncate text-[11px] text-muted">{current.artists}</p>
            </div>
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Spotify"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-fg"
            >
              <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              aria-label="Close player"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-3 hover:text-danger"
              onClick={close}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div ref={hostRef} className="mt-2 h-20 overflow-hidden rounded-lg" />
        </div>
      ) : null}
    </PlayerContext.Provider>
  );
}

export function PlayTrackButton({
  track,
  size = "sm",
}: {
  track: PlayableTrack;
  size?: "sm" | "md";
}) {
  const { currentId, playing, toggle } = useTrackPlayer();
  const active = currentId === track.id;
  const Icon = active && playing ? Pause : Play;
  return (
    <button
      type="button"
      aria-label={`${active && playing ? "Pause" : "Play"} ${track.name}`}
      aria-pressed={active && playing}
      className={`grid shrink-0 place-items-center rounded-full transition ${
        size === "md" ? "size-8" : "size-7"
      } ${
        active
          ? "bg-accent text-bg hover:opacity-90"
          : "text-muted hover:bg-surface-3 hover:text-fg"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        toggle(track);
      }}
    >
      <Icon className={size === "md" ? "size-4" : "size-3.5"} />
    </button>
  );
}
