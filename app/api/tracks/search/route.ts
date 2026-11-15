import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { searchTracks, SpotifyError } from "@/lib/spotify/client";
import { toTrackDTO } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { token } = await requireSpotify();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 8) || 8, 20);
    if (q.length < 2) {
      return NextResponse.json({ tracks: [] });
    }
    const tracks = await searchTracks(token, q, { limit });
    return NextResponse.json({ tracks: tracks.map(toTrackDTO) });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
