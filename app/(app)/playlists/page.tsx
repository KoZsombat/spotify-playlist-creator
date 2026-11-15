import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlaylistCard } from "@/components/playlist-card";
import { listCreations } from "@/lib/creations";
import { formatDate } from "@/lib/client-utils";
import { getSession, getSpotifyAccessToken } from "@/lib/session";
import { getMyPlaylists, SpotifyError } from "@/lib/spotify/client";
import { toPlaylistSummary } from "@/lib/spotify/dto";
import type { PlaylistSummaryDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlaylistsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const user = session.user;

  const creations = await listCreations(user.id);

  let library: PlaylistSummaryDTO[] = [];
  let error: string | null = null;
  try {
    const token = await getSpotifyAccessToken(user.id);
    const page = await getMyPlaylists(token, { limit: 50 });
    library = page.items.map(toPlaylistSummary);
  } catch (cause) {
    error =
      cause instanceof SpotifyError
        ? cause.message
        : "Could not load your Spotify library. Try signing in again.";
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Playlists</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your library</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Edit details, remove tracks, or start a new playlist from a description.
          </p>
        </div>
        <Link href="/create" className="btn-primary shrink-0">
          <Plus className="size-4" />
          New playlist
        </Link>
      </header>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Created with Crate
        </h2>
        {creations.length === 0 ? (
          <p className="card mt-3 p-4 text-xs text-muted">
            None yet. The creator is one click away.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {creations.map((creation) => (
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
          Spotify library
        </h2>
        {error ? (
          <p className="card mt-3 border-warn/30 bg-warn/[0.04] p-4 text-xs text-warn">
            {error}
          </p>
        ) : library.length === 0 ? (
          <p className="card mt-3 p-4 text-xs text-muted">
            No playlists found on this Spotify account.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {library.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                href={`/playlists/${playlist.id}`}
                title={playlist.name}
                description={playlist.description}
                image={playlist.image}
                meta={`${playlist.trackCount} tracks · ${playlist.ownerName}`}
                badge={playlist.isPublic ? "public" : "private"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
