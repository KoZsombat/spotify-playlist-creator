#!/bin/sh
set -eu

: "${BETTER_AUTH_URL:?BETTER_AUTH_URL must be the public https origin, e.g. https://crate.example.com}"
: "${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is required}"
: "${SPOTIFY_CLIENT_ID:?SPOTIFY_CLIENT_ID is required}"
: "${SPOTIFY_CLIENT_SECRET:?SPOTIFY_CLIENT_SECRET is required}"
: "${DATABASE_URL:?DATABASE_URL is required}"

echo "Applying database migrations..."
node migrate.mjs

echo "Starting Crate on port ${PORT:-3000}..."
exec node server.js
