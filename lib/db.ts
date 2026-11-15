import { Pool } from "pg";

const DEFAULT_DATABASE_URL =
  "postgres://playlist:playlist@127.0.0.1:5433/playlist_creator";

const globalForDb = globalThis as unknown as { __pool?: Pool };

/**
 * Single pool per process. Next.js dev reloads modules, so cache on globalThis
 * or every HMR pass leaks a pool.
 */
export function getPool(): Pool {
  if (!globalForDb.__pool) {
    globalForDb.__pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
      max: 10,
    });
  }
  return globalForDb.__pool;
}

export async function query<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, values);
  return result.rows as T[];
}

/** App-owned tables. Better Auth's own tables are created by `bun run db:migrate`. */
export async function initAppSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS app_playlist (
      id text PRIMARY KEY,
      "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "spotifyPlaylistId" text NOT NULL,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      visibility text NOT NULL DEFAULT 'private',
      "intent" jsonb,
      "trackCount" integer NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS app_playlist_user_idx ON app_playlist ("userId", "createdAt" DESC)`,
  );
}
