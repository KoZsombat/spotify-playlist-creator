"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export function signInWithSpotify() {
  return authClient.signIn.social({
    provider: "spotify",
    callbackURL: "/dashboard",
    errorCallbackURL: "/?error=spotify_auth",
  });
}
