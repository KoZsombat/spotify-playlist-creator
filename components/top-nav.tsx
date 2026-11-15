import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { initials } from "@/lib/client-utils";

export type NavUser = {
  name: string;
  email: string;
  image?: string | null;
};

export function TopNav({ user }: { user: NavUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="size-8 rounded-lg" />
            <span className="text-sm font-semibold tracking-tight">Crate</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              Create
            </Link>
            <Link
              href="/playlists"
              className="rounded-full px-3 py-1.5 text-muted transition hover:bg-surface-2 hover:text-fg"
            >
              Playlists
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium leading-tight">{user.name}</p>
            <p className="text-[11px] leading-tight text-muted">{user.email}</p>
          </div>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              className="size-8 rounded-full border border-border object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full border border-border bg-surface-2 text-[11px] font-semibold">
              {initials(user.name)}
            </span>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
