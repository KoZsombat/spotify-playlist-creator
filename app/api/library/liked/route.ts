import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getLikedTracks, SpotifyError } from "@/lib/spotify/client";
import { toTrackDTO } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { token } = await requireSpotify();
    const page = await getLikedTracks(token, { limit: 50 });
    const tracks = page.items
      .filter((item) => item.track)
      .map((item) => toTrackDTO(item.track!));
    return NextResponse.json({ tracks, total: page.total });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
