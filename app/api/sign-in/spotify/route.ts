import { getAuth, publicOrigin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_LOCATION = `${publicOrigin}/?spotify_error=1`;

/**
 * Starts the Spotify OAuth flow with a plain GET so the landing-page button
 * does not depend on client-side hydration or a fetch-then-navigate handoff.
 * Better Auth still writes the PKCE/state cookies; they are copied onto the
 * redirect because the response body is the only thing we need from the API.
 */
export async function GET(request: Request) {
  try {
    const response = await getAuth().api.signInSocial({
      body: {
        provider: "spotify",
        callbackURL: "/dashboard",
        errorCallbackURL: "/?spotify_error=1",
        disableRedirect: true,
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!response.ok) return errorRedirect();

    const { url } = (await response.json()) as { url?: string };
    if (!url) return errorRedirect();

    const headers = new Headers({
      Location: url,
      "Cache-Control": "no-store",
    });
    for (const cookie of response.headers.getSetCookie()) {
      headers.append("Set-Cookie", cookie);
    }

    return new Response(null, { status: 302, headers });
  } catch {
    return errorRedirect();
  }
}

function errorRedirect() {
  return new Response(null, {
    status: 302,
    headers: { Location: ERROR_LOCATION, "Cache-Control": "no-store" },
  });
}
