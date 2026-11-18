import { HttpError } from "../http";

let cached: { token: string; expiresAt: number } | null = null;

/**
 * Client-credentials token for catalog search.
 *
 * Search ranks by the signed-in user's country and ignores `market` when a
 * user token is used, which fills English briefs with artistically unrelated
 * local tracks. The app token is not tied to a user, so the explicit market in
 * `marketForIntent` takes effect.
 */
export async function getAppAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) {
    throw new HttpError(500, "Spotify client credentials are not configured");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new HttpError(502, "Could not obtain a Spotify app token");
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cached = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cached.token;
}
