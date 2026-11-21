import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getLikedTracks, SpotifyError } from "@/lib/spotify/client";
import { toTrackDTO } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { token } = await requireSpotify();
    const limit = Math.min(
      Number(new URL(request.url).searchParams.get("limit") ?? 200) || 200,
      200,
    );
    const page = await getLikedTracks(token, { limit });
    const tracks = page.items
      .filter((item) => item.track)
      .map((item) => toTrackDTO(item.track!));
    return NextResponse.json({ tracks, total: page.total });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
