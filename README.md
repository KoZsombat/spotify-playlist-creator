# Crate — Spotify playlist creator

Sign in with Spotify, set the playlist basics, describe the music in your own words, optionally
add up to 200 tracks you already chose, review the generated tracklist, and publish it to your
account.

Built with Next.js 15 (App Router), Better Auth, Postgres, Tailwind v4 and Bun.

## What it actually does

Spotify retired `/recommendations`, `/artists/{id}/related-artists` and audio features for new
API apps in November 2024, and the February 2026 development-mode migration removed batch
fetches, track popularity, artist genres and the `/playlists/{id}/tracks` aliases. This app only
calls endpoints that are still available. Generation is search-driven:

1. **Interpret** — a deterministic parser turns free text into intent: genres, moods, occasions,
   languages, decades, energy, popularity target, instrumental/clean filters, named artists and
   vetoes (`no rock`, `nothing too upbeat`). An optional LLM pass refines the result when
   `LLM_API_KEY` is set; any failure silently falls back to the local parser.
2. **Plan** — intent becomes up to 18 weighted Spotify queries. Genres use the `genre:` field
   filter, so a tag never turns into tracks that merely spell the word in their title or artist
   name; era filters, seed-artist queries and a deep-cut `tag:hipster` pass widen the pool. Mood
   and occasion words are **not** sent to search — Spotify has no mood metadata left, so they
   would only match song titles. Search runs on a client-credentials token with an explicit
   market (the requested language's home market, else `SPOTIFY_MARKET`, default `US`), because a
   user token ignores `market` and ranks by the listener's country.
3. **Collect & score** — up to 100 catalog hits per query (Spotify caps a search at 10 results
   per page and 100 per query, so the client paginates with `offset`), scored on query-group
   agreement, era fit, seed-artist affinity and search rank. Track titles and artist names are
   never scored against the brief's words.
4. **Select** — duplicates, local files, explicit tracks (when clean was requested) and vetoed
   genres are filtered from titles, albums and artist names. Two tracks per artist by default,
   relaxed only when the pool is thin. The final list is interleaved across query groups so
   vibes do not clump.
5. **Review & publish** — playlist size is configurable from 10 to 200 tracks; nothing is written
   to Spotify until the user presses create. Then the app creates the playlist, adds at most 100
   tracks per request, and stores a local record.

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- Docker Desktop (for Postgres)
- A Spotify account

## 1. Create the Spotify app

1. Open <https://developer.spotify.com/dashboard> and log in.
2. **Create app**. Any name/description; for the redirect URI add exactly:
   `http://127.0.0.1:3000/api/auth/callback/spotify`
   Spotify rejects `localhost` redirect URIs — use the loopback IP.
3. Open the app → **Settings** and copy **Client ID** and **Client Secret**.
4. Still in **Settings → User Management**, add the Spotify account(s) that will sign in.
   New apps start in development mode: the app owner needs Premium, and up to 5 authenticated
   users can be allowlisted. Development mode cannot be switched off from the dashboard;
   extended quota is only granted to eligible organizations (see
   [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)).

## 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```dotenv
BETTER_AUTH_URL=http://127.0.0.1:3000
BETTER_AUTH_SECRET=<32+ random bytes>
SPOTIFY_CLIENT_ID=<from the dashboard>
SPOTIFY_CLIENT_SECRET=<from the dashboard>
DATABASE_URL=postgres://playlist:playlist@127.0.0.1:5433/playlist_creator
```

Generate a secret with `bun -e 'console.log(crypto.randomUUID().replaceAll("-","") + crypto.randomUUID().replaceAll("-",""))'`.

Optional market override for search (used when the brief names no language):

```dotenv
SPOTIFY_MARKET=US
```

Optional, for better interpretation of unusual descriptions:

```dotenv
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=...
LLM_MODEL=gpt-4o-mini
```

The endpoint must be OpenAI-compatible (`POST {base}/chat/completions`). Without it, the
deterministic parser is used and the UI says so.

## 3. Run

```bash
bun install
bun run setup     # starts Postgres in Docker and applies Better Auth + app migrations
bun run dev
```

Open **http://127.0.0.1:3000** — not `localhost:3000`, or Spotify's redirect URI will not match.

If Docker Desktop is not running, start it first; `bun run setup` fails fast with a connection
error otherwise.

## Scripts

| Command             | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `bun run dev`       | Next.js dev server on port 3000                                |
| `bun run build`     | Production build                                               |
| `bun run start`     | Start the production build                                     |
| `bun run typecheck` | `tsc --noEmit`                                                 |
| `bun test`          | Parser + generator tests (`bun test`)                          |
| `bun run db:up`     | Start Postgres via `docker compose` and wait for healthy       |
| `bun run db:migrate`| Idempotent Better Auth + app schema migration                  |
| `bun run db:down`   | Stop Postgres                                                  |
| `bun run build:migrate` | Bundle the migration script for the container runtime      |
| `bun run docker:prod` | Build and start the production stack locally               |
| `bun run setup`     | `db:up` then `db:migrate`                                      |


## Deploy on Launchpad

Launchpad (self-hosted, `KoZsombat/launchpad`) runs Docker on the VM, publishes containers
through Traefik, and puts its own dashboard behind a Cloudflare Tunnel. This repository's
production stack includes its **own `cloudflared` connector**, so the app route works even when
the panel host has no tunnel pointing at it. The connector joins both the project network and
Launchpad's external `web` network, so either ingress shape works:

```
Dedicated tunnel:  Browser -> Cloudflare -> crate cloudflared -> app:3000
Shared Launchpad:  Browser -> Cloudflare -> cloudflared -> traefik:80 -> app:3000
```

The production stack is `Dockerfile` + `docker-compose.prod.yml`: Next.js standalone output on
Node, Postgres behind it, a `/api/health` probe, a `cloudflared` connector and an entrypoint that
runs migrations before the server starts.

### Create the Cloudflare tunnel

1. Cloudflare Zero Trust → **Networks → Tunnels → Create a tunnel** → **Cloudflared**.
2. Add a **Public Hostname**, either:
   - `crate.<domain>` → **HTTP** → `app:3000` (dedicated tunnel), or
   - keep Launchpad's wildcard `*.<domain>` → `http://traefik:80` and use that tunnel's token
     (the app connector joins `web`, so it can reach Traefik too).
3. Copy the token.

`TUNNEL_TOKEN` is required by `docker-compose.prod.yml`. Reusing Launchpad's token is safe
(Cloudflare supports multiple connectors) but redundant; a dedicated tunnel keeps this app's
route independent from the panel.

### Create the project

1. Push this repo to GitHub (compose builds need a repository source).
2. In Launchpad: **New app** → **Compose project** (or **Use docker-compose** on the GitHub
   source tab). Repository URL, branch `main`.
3. **Compose path:** `docker-compose.prod.yml`. Launchpad defaults to `docker-compose.yml`,
   which is the local dev database only.
4. **Scan compose**, then keep these routes:
   - `app` — published, subdomain `crate`, internal port `3000`, health path `/api/health`.
   - `db` — not published. Publishing it would make Traefik probe Postgres with an HTTP health
     check.
   - `cloudflared` — not published. Its port field is unused; leave the suggested default.
5. Fill every required `${VAR}` under the project environment (Launchpad interpolates these into
   the generated compose file; no `.env` is uploaded):
   - `BETTER_AUTH_URL` — the exact public origin, e.g. `https://crate.example.com`
   - `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - `POSTGRES_PASSWORD` — `openssl rand -base64 32`; it is passed as `PGPASSWORD`, not inside a
     connection URL, so symbols such as `/`, `+` and `=` are safe.
   - `TUNNEL_TOKEN` — from the Cloudflare tunnel above.
   - Optional: `SPOTIFY_MARKET`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.
6. In the Spotify dashboard add the production redirect URI
   `https://crate.example.com/api/auth/callback/spotify` (keep the `127.0.0.1` one for local dev)
   and allowlist every Spotify account that will sign in (development mode caps it at 5).
7. Deploy. The first deployment builds the image on the panel host; compose `build:` services
   require a repository source, so do not switch the project to an inline compose file. A small
   VM may need more RAM for `next build`.
8. Check the deployment log for `Registered tunnel connection`; a wrong or expired token makes
   `cloudflared` exit and the deploy fails.

`BETTER_AUTH_URL` must match the public hostname exactly (`https://crate.<domain>`). Better Auth
derives the OAuth callback, trusted origin and secure-cookie prefix from it, and the connector
forwards the original `Host` header to `app:3000`.

Notes:

- The compose file only `expose`s 3000; Launchpad strips published ports and adds the Traefik
  labels and `web` network itself.
- The `pgdata` volume is prefixed and preserved per Launchpad project, so redeploys keep accounts
  and saved creations.
- The container applies Better Auth and app migrations on every start (idempotent) and exits
  non-zero if they fail, so a broken schema never reports healthy.
- The image runs Next.js standalone output on `node:24-alpine` rather than shipping the dev
  dependency tree.
- Do **not** add a Cloudflare Access policy to the app hostname: Spotify redirects the browser
  there, and the OAuth callback would stop at an Access login page. Protect only
  `panel.<BASE_DOMAIN>`.

Manual equivalent (the `web` network is shared with Launchpad/Traefik):

```bash
docker network create web 2>/dev/null || true
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## Spotify scopes requested

`user-read-email`, `user-read-private`, `playlist-read-private`, `playlist-read-collaborative`,
`playlist-modify-public`, `playlist-modify-private`, `user-library-read`.

Tokens are stored encrypted (Better Auth `encryptOAuthTokens`) and always read through
`auth.api.getAccessToken`, which refreshes them before use.

## API

All routes require a Spotify session except `/api/auth/*`, `/api/sign-in/spotify` and
`/api/spotify/status`.

| Route                               | Method      | Purpose                                    |
| ----------------------------------- | ----------- | ------------------------------------------ |
| `/api/sign-in/spotify`              | GET         | Starts Spotify OAuth; a plain link, so it works without client JS |
| `/api/spotify/status`               | GET         | Diagnostic: deployed Client ID, redirect URI, credential validity, last OAuth callback outcome and the caller's session state |
| `/api/health`                        | GET         | DB-aware health probe for Launchpad                       |
| `/api/generate`                     | POST        | `{description, seedIds, includeSeeds, limit}` → tracks + intent + stats |
| `/api/interpret`                    | POST        | `{description}` → parsed intent only       |
| `/api/tracks/search`                | GET         | `?q=` seed search                          |
| `/api/library/playlists`            | GET         | Your Spotify playlists                     |
| `/api/library/playlists/{id}`       | GET         | Tracks of one playlist (seed import)       |
| `/api/library/liked`                | GET         | Liked songs (seed import)                  |
| `/api/playlists`                    | GET / POST  | Local creations / create or append        |
| `/api/playlists/{id}`               | GET/PATCH/DELETE | Detail, edit metadata, remove from library |
| `/api/playlists/{id}/tracks`        | POST/DELETE | Add or remove tracks                       |

## Layout

```
app/                     routes (landing, dashboard, create wizard, playlists)
app/api/                 auth + generation + playlist endpoints
components/              UI (wizard, seed picker, track rows, editor)
lib/music/lexicon.ts     genre/mood/occasion vocabulary and search phrases
lib/music/intent.ts      deterministic parser (pure, also runs in the browser for live chips)
lib/music/llm.ts         optional OpenAI-compatible refinement
lib/music/planner.ts     intent → weighted search queries
lib/music/generate.ts    scoring, filtering, artist caps, interleaving
lib/spotify/             Web API client, DTOs, provider adapter
lib/auth.ts              Better Auth + Spotify provider
lib/db.ts                pg pool + app schema
scripts/migrate.ts       Better Auth programmatic migration + app tables
Dockerfile               Bun build → Node runtime image, migrations on start
docker-compose.prod.yml  app + Postgres stack for Launchpad
app/api/health/route.ts  Launchpad HTTP health probe (DB-aware)
```

## Known limits

- Spotify search pages cap at 10 results, a query returns at most 100 hits, and playlist item
  pages cap at 50; the client paginates. Playlists can request 10–200 tracks, and you can pick
  at most 200 seeds; narrow briefs can still yield fewer — the UI shows the real count.
- Development mode ships a small daily API quota (`QUOTA_EXCEEDED`). Search results are cached
  for five minutes and large playlists spread across era slices, but heavy use can still exhaust
  it; the app then reports the quota and when it recovers.
- Track popularity and artist genres are no longer in the API for development-mode apps, so
  popularity fit and genre-tag vetoes work only from text (titles, albums, artist names).
- Moods and occasions steer nothing but the brief: without audio features there is no way to
  rank by them, and as text queries they only surface songs named after the word.
- Search needs `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` (client-credentials token) and a
  market: `SPOTIFY_MARKET` (default `US`) is used when the brief names no language.
- Playlist contents are readable only for playlists you own or collaborate on; followed
  playlists appear as metadata but cannot be used as a track source.
- Development mode allows up to 5 authenticated Spotify accounts on the app's allowlist and
  requires the app owner to have Premium. Extended quota (unlimited users) is reserved for
  eligible organizations, so individual projects stay capped at those 5 accounts.
- The app is single-tenant per signed-in user; there is no admin surface.
