$root = Split-Path -Parent $PSScriptRoot
docker compose --env-file (Join-Path $root '.env.production') -f (Join-Path $root 'docker-compose.prod.yml') @args
