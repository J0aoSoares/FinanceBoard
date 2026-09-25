#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec docker compose \
  --env-file "$root/.env.production" \
  -f "$root/docker-compose.prod.yml" \
  "$@"
