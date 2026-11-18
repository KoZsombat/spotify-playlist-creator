import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getMe, getMyPlaylists, SpotifyError } from "@/lib/spotify/client";
import { toPlaylistSummary } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { token } = await requireSpotify();
    const [me, page] = await Promise.all([
      getMe(token),
      getMyPlaylists(token, { limit: 50 }),
    ]);
    // Playlist contents are only readable for playlists the user owns or
    // collaborates on, so only those are offered as a track source.
    const usable = page.items.filter(
      (playlist) => playlist.owner.id === me.id || playlist.collaborative,
    );
    return NextResponse.json({
      playlists: usable.map(toPlaylistSummary),
      total: usable.length,
    });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
