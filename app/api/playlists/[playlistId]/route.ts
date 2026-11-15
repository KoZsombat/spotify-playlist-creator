import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteCreation, updateCreationMeta } from "@/lib/creations";
import { jsonError, parseJson } from "@/lib/http";
import {
  getPlaylist,
  getPlaylistTracks,
  SpotifyError,
  unfollowPlaylist,
  updatePlaylist,
} from "@/lib/spotify/client";
import { toPlaylistSummary, toTrackDTO } from "@/lib/spotify/dto";
import { requireSpotify, toHttpError } from "@/lib/spotify/provider";

export const runtime = "nodejs";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(300).optional(),
    isPublic: z.boolean().optional(),
    collaborative: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { token } = await requireSpotify();
    const { playlistId } = await params;
    const [playlist, page] = await Promise.all([
      getPlaylist(token, playlistId),
      getPlaylistTracks(token, playlistId, { limit: 100 }),
    ]);

    return NextResponse.json({
      ...toPlaylistSummary(playlist),
      snapshotId: playlist.snapshot_id ?? "",
      tracks: page.items
        .filter((item) => item.track)
        .map((item) => ({ addedAt: item.added_at, track: toTrackDTO(item.track!) })),
    });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { user, token } = await requireSpotify();
    const { playlistId } = await params;
    const body = await parseJson(request, patchSchema);

    await updatePlaylist(token, playlistId, body);
    await updateCreationMeta(user.id, playlistId, {
      title: body.name,
      description: body.description,
      visibility:
        body.isPublic === undefined ? undefined : body.isPublic ? "public" : "private",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playlistId: string }> },
) {
  try {
    const { user, token } = await requireSpotify();
    const { playlistId } = await params;

    await unfollowPlaylist(token, playlistId);
    await deleteCreation(user.id, playlistId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SpotifyError) return jsonError(toHttpError(error));
    return jsonError(error);
  }
}
