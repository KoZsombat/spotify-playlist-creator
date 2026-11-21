import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { recordOAuthCallback } from "@/lib/oauth-debug";

export const runtime = "nodejs";

const handler = toNextJsHandler((request) => getAuth().handler(request));

async function handle(request: Request) {
  const isSpotifyCallback = new URL(request.url).pathname.endsWith("/callback/spotify");

  try {
    const response = await handler.GET(request);
    if (isSpotifyCallback) {
      recordOAuthCallback({
        at: Date.now(),
        status: response.status,
        location: response.headers.get("location"),
      });
    }
    return response;
  } catch (error) {
    if (isSpotifyCallback) {
      recordOAuthCallback({ at: Date.now(), status: 500, location: null });
    }
    throw error;
  }
}

export const GET = handle;
export const POST = handle;
