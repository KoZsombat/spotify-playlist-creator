import type { ReactNode } from "react";
import type { TrackDTO } from "@/lib/types";
import { formatDuration } from "@/lib/client-utils";

export function TrackRow({
  track,
  index,
  action,
}: {
  track: TrackDTO;
  index?: number;
  action?: ReactNode;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2">
      {index !== undefined ? (
        <span className="w-5 shrink-0 text-right font-mono text-[11px] text-muted">
          {index}
        </span>
      ) : null}
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-surface-3">
        {track.albumImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={track.albumImage}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <a
            href={track.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium hover:text-accent-soft"
          >
            {track.name}
          </a>
          {track.explicit ? (
            <span className="rounded bg-surface-3 px-1 font-mono text-[9px] text-muted">
              E
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-muted">{track.artists}</p>
      </div>
      <p className="hidden max-w-48 truncate text-xs text-muted md:block">
        {track.album}
      </p>
      {track.year ? (
        <span className="hidden w-10 text-right font-mono text-[11px] text-muted sm:block">
          {track.year}
        </span>
      ) : null}
      <span className="w-9 text-right font-mono text-[11px] text-muted">
        {formatDuration(track.durationMs)}
      </span>
      {action}
    </div>
  );
}
