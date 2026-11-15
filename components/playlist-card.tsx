import Link from "next/link";
import { Music4 } from "lucide-react";

export function PlaylistCard({
  href,
  title,
  description,
  image,
  meta,
  badge,
}: {
  href: string;
  title: string;
  description?: string;
  image?: string | null;
  meta: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group card flex gap-3 p-3 transition hover:border-accent/40 hover:bg-surface-2"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-muted">
            <Music4 className="size-5" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-accent-soft">
            {title}
          </p>
          {badge ? <span className="chip shrink-0">{badge}</span> : null}
        </div>
        {description ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted">{description}</p>
        ) : null}
        <p className="mt-1 text-[11px] uppercase tracking-wide text-muted/80">{meta}</p>
      </div>
    </Link>
  );
}
