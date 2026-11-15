import { NextResponse } from "next/server";
import { z } from "zod";
import { updateCreationMeta } from "@/lib/creations";
import { jsonError, parseJson } from "@/lib/http";
import {
  addPlaylistItems,
  getPlaylist,
  removePlaylistItems,
  SpotifyError,
} from "@/lib/spotify/client";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{22}$/;

const bodySchema = z.object({
  trackIds: z.array(z.string().regex(ID, "Invalid track id")).min(1).max(100),
});

async function refreshCount(
  token: string,
  userId: string,
  playlistId: string,
): Promise<number> {
  const playlist = await getPlaylist(token, playlistId);
  await updateCreationMeta(userId, playlistId, {
    trackCount: playlist.tracks.total,
  });
  return playlist.tracks.total;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { user, token } = await requireSpotify();
    const { playlistId } = await params;
    const { trackIds } = await parseJson(request, bodySchema);

    await addPlaylistItems(
      token,
      playlistId,
      trackIds.map((id) => `spotify:track:${id}`),
    );
    const trackCount = await refreshCount(token, user.id, playlistId);

    return NextResponse.json({ ok: true, added: trackIds.length, trackCount });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { user, token } = await requireSpotify();
    const { playlistId } = await params;
    const { trackIds } = await parseJson(request, bodySchema);

    await removePlaylistItems(
      token,
      playlistId,
      trackIds.map((id) => `spotify:track:${id}`),
    );
    const trackCount = await refreshCount(token, user.id, playlistId);

    return NextResponse.json({ ok: true, removed: trackIds.length, trackCount });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
