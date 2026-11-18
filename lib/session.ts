import { headers } from "next/headers";
import { getAuth } from "./auth";
import { getPool } from "./db";
import { HttpError } from "./http";

export async function getSession() {
  // Read request state first: during `next build` this throws Next's dynamic
  // usage error, so Better Auth is never initialized without a runtime secret.
  const requestHeaders = await headers();
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new HttpError(401, "Sign in with Spotify to continue");
  }
  return session.user;
}

async function getSpotifyAccountId(userId: string): Promise<string> {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM account WHERE "userId" = $1 AND "providerId" = 'spotify' LIMIT 1`,
    [userId],
  );
  const id = rows[0]?.id;
  if (!id) {
    throw new HttpError(401, "Spotify account is not linked. Sign in again.");
  }
  return id;
}

/**
 * Returns a valid Spotify access token, refreshing it through Better Auth when
 * it has expired. Callers must never read account.accessToken directly: it is
 * encrypted at rest.
 */
export async function getSpotifyAccessToken(userId: string): Promise<string> {
  const accountId = await getSpotifyAccountId(userId);
  const token = await getAuth().api.getAccessToken({
    body: { accountId, userId },
  });
  if (!token.accessToken) {
    throw new HttpError(401, "Spotify session expired. Sign in again.");
  }
  return token.accessToken;
}
