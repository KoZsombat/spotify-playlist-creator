import { NextResponse } from "next/server";
import { publicOrigin, spotifyConfigured } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CredentialStatus = "ok" | "invalid_client" | "unreachable" | `http_${number}`;

type Status = {
  configured: boolean;
  clientId?: string;
  redirectUri?: string;
  credentials?: CredentialStatus;
};

let cached: { at: number; status: Status } | undefined;

/**
 * Operational probe for the deployed Spotify app configuration. It never
 * returns the client secret: it only asks Spotify's client-credentials grant
 * whether the deployed ID/secret pair is valid. That distinguishes a stale
 * secret from a redirect-URI or allowlist problem. Cached so repeated polling
 * cannot drain the development quota.
 */
export async function GET() {
  if (!spotifyConfigured) {
    return NextResponse.json<Status>({ configured: false });
  }

  if (cached && Date.now() - cached.at < 60_000) {
    return NextResponse.json(cached.status);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID ?? "";
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? "";
  const status: Status = {
    configured: true,
    clientId,
    redirectUri: `${publicOrigin}/api/auth/callback/spotify`,
    credentials: "unreachable",
  };

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (response.ok) {
      status.credentials = "ok";
      // The token is intentionally discarded: only credential validity matters.
      await response.body?.cancel();
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      status.credentials =
        body?.error === "invalid_client" ? "invalid_client" : `http_${response.status}`;
    }
  } catch {
    status.credentials = "unreachable";
  }

  cached = { at: Date.now(), status };
  return NextResponse.json(status);
}
