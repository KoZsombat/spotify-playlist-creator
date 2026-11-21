import { ArrowRight, ListMusic, Music2, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlaylistCard } from "@/components/playlist-card";
import { listCreations } from "@/lib/creations";
import { formatDate } from "@/lib/client-utils";
import { getSession } from "@/lib/session";
import { getMyPlaylists, SpotifyError } from "@/lib/spotify/client";
import { toPlaylistSummary } from "@/lib/spotify/dto";
import type { PlaylistSummaryDTO } from "@/lib/types";
import { getSpotifyAccessToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const user = session.user;
  const creations = await listCreations(user.id);

  let library: PlaylistSummaryDTO[] = [];
  let libraryError: string | null = null;
  try {
    const token = await getSpotifyAccessToken(user.id);
    const page = await getMyPlaylists(token, { limit: 6 });
    library = page.items.map(toPlaylistSummary);
  } catch (error) {
    libraryError =
      error instanceof SpotifyError
        ? error.message
        : "Could not reach Spotify. Try signing in again.";
  }

  const totalTracks = creations.reduce((sum, row) => sum + row.trackCount, 0);
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <div className="space-y-10">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Hey {firstName}, what should this one sound like?
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Describe a vibe in your own words, anchor it with a few tracks, and publish a
            playlist of up to 200 tracks to Spotify.
          </p>
        </div>
        <Link href="/create" className="btn-primary shrink-0">
          <Plus className="size-4" />
          New playlist
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Sparkles,
            value: creations.length,
            label: "playlists created here",
          },
          { icon: Music2, value: totalTracks, label: "tracks published" },
          { icon: ListMusic, value: library.length, label: "playlists in your library" },
        ].map((stat) => (
          <div key={stat.label} className="card flex items-center gap-3 p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-surface-2 text-accent">
              <stat.icon className="size-4" />
            </span>
            <div>
              <p className="font-mono text-xl leading-none">{stat.value}</p>
              <p className="mt-1 text-xs text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Made with Crate</h2>
            <p className="text-xs text-muted">
              Every playlist this app created on your account.
            </p>
          </div>
          <Link
            href="/playlists"
            className="text-xs font-medium text-accent hover:text-accent-soft"
          >
            All playlists
          </Link>
        </div>

        {creations.length === 0 ? (
          <div className="card mt-4 flex flex-col items-start gap-3 p-6">
            <p className="text-sm font-medium">Nothing here yet.</p>
            <p className="max-w-md text-xs leading-relaxed text-muted">
              Your first playlist takes about a minute: pick a name, describe the music,
              and review the tracks before publishing.
            </p>
            <Link href="/create" className="btn-ghost btn-sm">
              Start the creator
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {creations.slice(0, 6).map((creation) => (
              <PlaylistCard
                key={creation.id}
                href={`/playlists/${creation.spotifyPlaylistId}`}
                title={creation.title}
                description={creation.description}
                meta={`${creation.trackCount} tracks · ${formatDate(creation.createdAt)}`}
                badge={creation.visibility}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">From your library</h2>
            <p className="text-xs text-muted">Fetched live from Spotify.</p>
          </div>
          <Link
            href="/playlists"
            className="text-xs font-medium text-accent hover:text-accent-soft"
          >
            Browse all
          </Link>
        </div>

        {libraryError ? (
          <p className="card mt-4 border-warn/30 bg-warn/[0.04] p-4 text-xs text-warn">
            {libraryError}
          </p>
        ) : library.length === 0 ? (
          <p className="card mt-4 p-4 text-xs text-muted">
            No playlists in your Spotify library yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {library.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                title={playlist.name}
                description={playlist.description}
                image={playlist.image}
                meta={`${playlist.trackCount} tracks · ${playlist.ownerName}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
