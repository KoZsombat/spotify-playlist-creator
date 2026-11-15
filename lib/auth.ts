import { betterAuth } from "better-auth";
import { getPool } from "./db";

export const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-library-read",
];

export const spotifyConfigured = Boolean(
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET,
);

const baseURL = (process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000").replace(
  /\/+$/,
  "",
);

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: getPool(),
  account: {
    // Tokens are encrypted with BETTER_AUTH_SECRET; always read them through
    // auth.api.getAccessToken instead of querying the account table.
    encryptOAuthTokens: true,
  },
  socialProviders: {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
      scope: SPOTIFY_SCOPES,
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
