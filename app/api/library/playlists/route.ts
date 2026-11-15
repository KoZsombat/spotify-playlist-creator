import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getMyPlaylists, SpotifyError } from "@/lib/spotify/client";
import { toPlaylistSummary } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { token } = await requireSpotify();
    const page = await getMyPlaylists(token, { limit: 50 });
    return NextResponse.json({
      playlists: page.items.map(toPlaylistSummary),
      total: page.total,
    });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
