#!/usr/bin/env bash
# Bootstrap wrapper: generate all configs first, then start the stack.
# Usage: ./up.sh [-d] [any docker compose up flags]
#
# Stage 1: docker-compose.bootstrap.yml runs config-gen, which produces:
#   runtime/docker-compose.yml   (the full service stack)
#   runtime/                     (all other runtime configs)
# Stage 2: start the generated stack.
#   --project-directory . ensures volume/env_file paths in runtime/docker-compose.yml
#   resolve relative to the project root, not the runtime/ subdirectory.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Generating configs from config.yaml ..."
docker compose -f docker-compose.bootstrap.yml run --rm config-gen

echo "==> Starting stack ..."
exec docker compose -f runtime/docker-compose.yml --project-directory . up "$@"
