#!/bin/sh
set -e

# Optionally load env vars from ENV_FILE (space-separated KEY=VALUE list)
if [ -n "$ENV_FILE" ]; then
  echo "Parsing environment variables from ENV_FILE..."
  echo "$ENV_FILE" | tr ' ' '\n' | sed 's/^/export /' > /tmp/env.sh
  . /tmp/env.sh
  echo "Environment variables loaded"
fi

# Railway sets PORT; app expects BACKEND_PORT
if [ -n "$PORT" ] && [ -z "$BACKEND_PORT" ]; then
  export BACKEND_PORT="$PORT"
fi

echo "🚀 Starting application on port ${BACKEND_PORT:-3000}..."
exec node dist/main.js
