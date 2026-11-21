import { betterAuth, type Auth, type BetterAuthOptions } from "better-auth";
import { getPool } from "./db";

const SPOTIFY_SCOPES = [
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

export const publicOrigin = (
  process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000"
).replace(/\/+$/, "");

const authOptions = {
  baseURL: publicOrigin,
  secret: process.env.BETTER_AUTH_SECRET,
  // Better Auth's built-in error page is disabled in production. Send every
  // callback/state failure back to the landing page, where the error is shown
  // next to the redirect URI that Spotify must have registered.
  onAPIError: { errorURL: `${publicOrigin}/?spotify_error=1` },
  database: getPool(),
  account: {
    // Tokens are encrypted with BETTER_AUTH_SECRET; always read them through
    // getAuth().api.getAccessToken instead of querying the account table.
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
} satisfies BetterAuthOptions;

export type AuthInstance = Auth<typeof authOptions>;

let instance: AuthInstance | undefined;

/**
 * Better Auth validates its secret when the instance is created, and
 * `next build` imports every route module in production mode without the
 * runtime environment. Creating the instance lazily keeps the build working
 * without baking a fake secret into the image.
 */
export function getAuth(): AuthInstance {
  instance ??= betterAuth(authOptions);
  return instance;
}
