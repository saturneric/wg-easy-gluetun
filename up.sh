#!/usr/bin/env bash
# Bootstrap wrapper: generate runtime configs first, then start the stack.
# Usage: ./up.sh [-d] [any docker compose up flags]
#
# Docker Compose validates env_file paths at parse time (before any service
# starts), so we run config-gen separately first to produce runtime/.env and
# runtime/conf/*, then hand off to `docker compose up`.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Generating configs from config.yaml ..."
docker compose run --rm config-gen

echo "==> Starting stack ..."
exec docker compose up "$@"
