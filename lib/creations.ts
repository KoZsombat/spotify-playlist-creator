import { query } from "./db";

export type CreationRow = {
  id: string;
  spotifyPlaylistId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  trackCount: number;
  createdAt: string;
};

export async function listCreations(userId: string): Promise<CreationRow[]> {
  return query<CreationRow>(
    `SELECT id, "spotifyPlaylistId", title, description, visibility, "trackCount", "createdAt"
     FROM app_playlist WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [userId],
  );
}

export async function insertCreation(input: {
  userId: string;
  spotifyPlaylistId: string;
  title: string;
  description: string;
  visibility: "public" | "private";
  trackCount: number;
  intent: unknown;
}): Promise<void> {
  await query(
    `INSERT INTO app_playlist
      (id, "userId", "spotifyPlaylistId", title, description, visibility, "trackCount", intent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      crypto.randomUUID(),
      input.userId,
      input.spotifyPlaylistId,
      input.title,
      input.description,
      input.visibility,
      input.trackCount,
      input.intent ? JSON.stringify(input.intent) : null,
    ],
  );
}

export async function updateCreationMeta(
  userId: string,
  spotifyPlaylistId: string,
  input: {
    title?: string;
    description?: string;
    visibility?: "public" | "private";
    trackCount?: number;
  },
): Promise<void> {
  await query(
    `UPDATE app_playlist SET
       title = COALESCE($3, title),
       description = COALESCE($4, description),
       visibility = COALESCE($5, visibility),
       "trackCount" = COALESCE($6, "trackCount"),
       "updatedAt" = now()
     WHERE "userId" = $1 AND "spotifyPlaylistId" = $2`,
    [
      userId,
      spotifyPlaylistId,
      input.title ?? null,
      input.description ?? null,
      input.visibility ?? null,
      input.trackCount ?? null,
    ],
  );
}

export async function deleteCreation(
  userId: string,
  spotifyPlaylistId: string,
): Promise<void> {
  await query(
    `DELETE FROM app_playlist WHERE "userId" = $1 AND "spotifyPlaylistId" = $2`,
    [userId, spotifyPlaylistId],
  );
}
