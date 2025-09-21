#!/bin/sh
set -e

# Optionally load env vars from ENV_FILE (space-separated KEY=VALUE list)
if [ -n "$ENV_FILE" ]; then
  echo "Parsing environment variables from ENV_FILE..."
  echo "$ENV_FILE" | tr ' ' '\n' | sed 's/^/export /' > /tmp/env.sh
  . /tmp/env.sh
  echo "Environment variables loaded"
fi

# Auto-load .env if present (mounted or present in WORKDIR). Safe for simple KEY=VALUE lines.
if [ -f "/app/.env" ]; then
  echo "Loading /app/.env..."
  set -a
  . /app/.env
  set +a
  echo ".env loaded"
fi

# Railway sets PORT; app expects BACKEND_PORT
if [ -n "$PORT" ] && [ -z "$BACKEND_PORT" ]; then
  export BACKEND_PORT="$PORT"
fi

echo "🚀 Starting application on port ${BACKEND_PORT:-3000}..."
exec node dist/main.js
