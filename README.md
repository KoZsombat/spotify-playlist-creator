# Crate — Spotify playlist creator

Sign in with Spotify, set the playlist basics, describe the music in your own words, optionally
add a few tracks you already chose, review the generated tracklist, and publish it to your account.

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
   New apps are in development mode and capped at 5 allowlisted users. For more users you must
   request an extended quota from Spotify.

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

The repo ships a self-contained production stack: `Dockerfile`, `docker-compose.prod.yml`, a
`/api/health` probe and a container entrypoint that runs migrations before `next start`.

1. Push this repo to GitHub (the compose stack builds from the repo context).
2. In Launchpad: **New app** → source **GitHub repository**, branch `main`.
3. **Compose path:** `docker-compose.prod.yml` (Launchpad defaults to `docker-compose.yml`,
   which is the local dev database only).
4. Services and routing:
   - `app` — publish it, subdomain e.g. `crate`, internal port `3000`, health path `/api/health`.
   - `db` — do not publish.
5. Project environment (all required; Launchpad fails the deploy if one is missing):
   `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`,
   `POSTGRES_PASSWORD`. Optional: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`.
6. `BETTER_AUTH_URL` must be the exact public origin, e.g. `https://crate.example.com`.
   Better Auth derives the OAuth callback and secure-cookie prefix from it.
7. In the Spotify dashboard, add the production redirect URI:
   `https://crate.example.com/api/auth/callback/spotify` (keep the `127.0.0.1` one for local dev),
   and allowlist every Spotify account that will sign in (development mode caps it at 25).

Notes:

- Launchpad strips published ports and routes through Traefik; the compose file only `expose`s
  3000 on purpose.
- The `pgdata` volume is prefixed and preserved per Launchpad project, so redeploys keep accounts
  and saved creations.
- The container applies Better Auth and app migrations on every start (idempotent) and exits
  non-zero if they fail, so a broken schema never reports healthy.
- The image runs Next.js standalone output on `node:24-alpine` — about 80 MB uncompressed —
  rather than shipping the dev dependency tree.

Manual equivalent:

```bash
cp .env.prod.example .env.prod
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

## Spotify scopes requested

`user-read-email`, `user-read-private`, `playlist-read-private`, `playlist-read-collaborative`,
`playlist-modify-public`, `playlist-modify-private`, `user-library-read`.

Tokens are stored encrypted (Better Auth `encryptOAuthTokens`) and always read through
`auth.api.getAccessToken`, which refreshes them before use.

## API

All routes require a Spotify session except `/api/auth/*`.

| Route                               | Method      | Purpose                                    |
| ----------------------------------- | ----------- | ------------------------------------------ |
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
  pages cap at 50; the client paginates. Playlists can request 10–200 tracks, but narrow briefs
  can still yield fewer — the UI shows the real count.
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
- Development mode allows 5 allowlisted Spotify accounts (grandfathered apps keep more).
- The app is single-tenant per signed-in user; there is no admin surface.
