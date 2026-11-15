import { notFound, redirect } from "next/navigation";
import { PlaylistEditor } from "@/components/playlist-editor";
import { getSession, getSpotifyAccessToken } from "@/lib/session";
import { getPlaylist, getPlaylistTracks, SpotifyError } from "@/lib/spotify/client";
import { toPlaylistSummary, toTrackDTO } from "@/lib/spotify/dto";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9]{22}$/;

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ playlistId: string }>;
}) {
  const { playlistId } = await params;
  if (!ID.test(playlistId)) notFound();

  const session = await getSession();
  if (!session) redirect("/");
  const user = session.user;

  try {
    const token = await getSpotifyAccessToken(user.id);
    const [playlist, page] = await Promise.all([
      getPlaylist(token, playlistId),
      getPlaylistTracks(token, playlistId, { limit: 100 }),
    ]);

    const detail = {
      ...toPlaylistSummary(playlist),
      snapshotId: playlist.snapshot_id ?? "",
      tracks: page.items
        .filter((item) => item.track)
        .map((item) => ({ addedAt: item.added_at, track: toTrackDTO(item.track!) })),
    };

    return <PlaylistEditor playlist={detail} />;
  } catch (error) {
    return (
      <div className="card border-warn/30 bg-warn/[0.04] p-6">
        <h1 className="text-lg font-semibold text-warn">Playlist unavailable</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          {error instanceof SpotifyError
            ? error.message
            : "Spotify did not return this playlist. It may have been deleted or belongs to another account."}
        </p>
      </div>
    );
  }
}
