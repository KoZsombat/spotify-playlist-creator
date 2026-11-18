#!/bin/sh
set -eu

: "${BETTER_AUTH_URL:?BETTER_AUTH_URL must be the public https origin, e.g. https://crate.example.com}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is required}"
: "${SPOTIFY_CLIENT_ID:?SPOTIFY_CLIENT_ID is required}"
: "${SPOTIFY_CLIENT_SECRET:?SPOTIFY_CLIENT_SECRET is required}"
if [ -z "${DATABASE_URL:-}" ] && [ -z "${PGHOST:-}" ]; then
  echo "DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE is required" >&2
  exit 1
fi

echo "Applying database migrations..."
node migrate.mjs

echo "Starting Crate on port ${PORT:-3000}..."
exec node server.js
