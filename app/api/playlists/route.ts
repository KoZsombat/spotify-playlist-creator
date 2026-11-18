import { NextResponse } from "next/server";
import { z } from "zod";
import { insertCreation, listCreations, updateCreationMeta } from "@/lib/creations";
import { jsonError, parseJson } from "@/lib/http";
import {
  addPlaylistItems,
  createPlaylist,
  getPlaylist,
  SpotifyError,
} from "@/lib/spotify/client";
import { toPlaylistSummary } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";
export const maxDuration = 60;

const ID = /^[A-Za-z0-9]{22}$/;

const createSchema = z.object({
  name: z.string().trim().min(1, "Name the playlist").max(100),
  description: z.string().trim().max(300).default(""),
  isPublic: z.boolean().default(false),
  collaborative: z.boolean().default(false),
  trackIds: z.array(z.string().regex(ID, "Invalid track id")).min(1).max(200),
  appendTo: z.string().regex(ID, "Invalid playlist id").optional(),
  intent: z.unknown().optional(),
});

export async function GET() {
  try {
    const { user } = await requireSpotify();
    return NextResponse.json({ creations: await listCreations(user.id) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, createSchema);
    const { user, token } = await requireSpotify();
    const uris = body.trackIds.map((id) => `spotify:track:${id}`);
    const isPublic = body.collaborative ? false : body.isPublic;

    if (body.appendTo) {
      const playlist = await getPlaylist(token, body.appendTo);
      await addPlaylistItems(token, body.appendTo, uris);
      const existing = playlist.items?.total ?? playlist.tracks?.total ?? 0;
      await updateCreationMeta(user.id, body.appendTo, {
        trackCount: existing + uris.length,
      });
      return NextResponse.json({
        playlist: toPlaylistSummary(playlist),
        appended: uris.length,
        warning: null,
      });
    }

    const playlist = await createPlaylist(token, {
      name: body.name,
      description: body.description,
      isPublic,
      collaborative: body.collaborative,
    });

    let warning: string | null = null;
    try {
      await addPlaylistItems(token, playlist.id, uris);
    } catch (error) {
      // The playlist exists now; report the link instead of losing it.
      warning = `Playlist created but adding tracks failed: ${
        error instanceof Error ? error.message : "unknown error"
      }`;
    }

    await insertCreation({
      userId: user.id,
      spotifyPlaylistId: playlist.id,
      title: playlist.name,
      description: body.description,
      visibility: isPublic ? "public" : "private",
      trackCount: warning ? 0 : uris.length,
      intent: body.intent ?? null,
    });

    return NextResponse.json({
      playlist: toPlaylistSummary(playlist),
      appended: warning ? 0 : uris.length,
      warning,
    });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
