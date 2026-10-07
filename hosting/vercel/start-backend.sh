#!/usr/bin/env bash
set -euo pipefail
cd /vercel/sandbox/oy-orders
if curl --fail --silent http://127.0.0.1:8787/health >/dev/null; then exit 0; fi
exec 9>/tmp/oy-orders-start.lock
flock 9
if curl --fail --silent http://127.0.0.1:8787/health >/dev/null; then exit 0; fi
export PATH="/vercel/sandbox/oy-orders/.local/bin:$PATH"
nohup node node_modules/tsx/dist/cli.mjs apps/api/src/server.ts 9>&- </dev/null >/data/backend.log 2>&1 &
echo $! > /data/backend.pid
for attempt in {1..40}; do
  if curl --fail --silent http://127.0.0.1:8787/health >/dev/null; then exit 0; fi
  sleep 0.25
done
exit 1
