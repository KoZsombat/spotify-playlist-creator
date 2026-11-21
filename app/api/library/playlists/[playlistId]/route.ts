import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getPlaylistTracks, SpotifyError } from "@/lib/spotify/client";
import { toTrackDTO } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { token } = await requireSpotify();
    const { playlistId } = await params;
    const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200, 200);
    const page = await getPlaylistTracks(token, playlistId, { limit });
    const tracks = page.items
      .filter((item) => item.track)
      .map((item) => ({
        addedAt: item.added_at,
        track: toTrackDTO(item.track!),
      }));
    return NextResponse.json({ tracks, total: page.total });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
