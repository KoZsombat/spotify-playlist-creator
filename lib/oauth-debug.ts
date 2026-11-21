export type OAuthCallbackRecord = {
  at: number;
  status: number;
  location: string | null;
};

type GlobalWithOAuthDebug = typeof globalThis & {
  __crateOAuthCallback?: OAuthCallbackRecord;
};

/**
 * The auth handler redirects callback failures straight to the landing page
 * (`/?spotify_error=1&error=...`) or to `/dashboard` on success. Keeping the
 * last response lets `/api/spotify/status` report what actually happened
 * without exposing the authorization code or any token.
 */
export function recordOAuthCallback(record: OAuthCallbackRecord) {
  (globalThis as GlobalWithOAuthDebug).__crateOAuthCallback = record;
}

export function lastOAuthCallback(): OAuthCallbackRecord | null {
  return (globalThis as GlobalWithOAuthDebug).__crateOAuthCallback ?? null;
}
