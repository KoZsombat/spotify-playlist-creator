import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseJson } from "@/lib/http";
import { generateTracks } from "@/lib/music/generate";
import { interpretDescription } from "@/lib/music/interpret";
import { getTracks, SpotifyError } from "@/lib/spotify/client";
import { toTrackDTO } from "@/lib/spotify/dto";
import { spotifyTrackSource, requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const TRACK_ID = /^[A-Za-z0-9]{22}$/;

const bodySchema = z.object({
  description: z.string().trim().min(3, "Describe the music first").max(1200),
  seedIds: z.array(z.string().regex(TRACK_ID, "Invalid track id")).max(20).default([]),
  includeSeeds: z.boolean().default(true),
  limit: z.number().int().min(10).max(100).default(50),
});

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, bodySchema);
    const { token } = await requireSpotify();

    const seeds = body.seedIds.length > 0 ? await getTracks(token, body.seedIds) : [];
    const interpreted = await interpretDescription(body.description);

    const generated = await generateTracks({
      intent: interpreted.intent,
      source: spotifyTrackSource(token),
      seeds,
      limit: body.limit,
      includeSeeds: body.includeSeeds,
    });

    return NextResponse.json({
      tracks: generated.tracks.map(toTrackDTO),
      intent: interpreted.intent,
      engine: interpreted.engine,
      stats: generated.stats,
    });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
