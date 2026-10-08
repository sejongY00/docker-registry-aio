#!/bin/sh
# Rebuild the app image from the current checkout and bring the stack up.
# Run from anywhere; used by the Jenkins Deploy stage and for manual deploys.
set -eu

cd "$(dirname "$0")/.."

HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"

echo "deploy: $(git log -1 --format='%h %s' 2>/dev/null || echo unknown)"

docker compose config -q
# Plain progress: the Jenkins SSH session has a pty, and the tty view floods the log.
BUILDKIT_PROGRESS=plain docker compose build app
docker compose up -d

# registry's healthcheck always passes, so the app health is what tells us the deploy worked.
cid="$(docker compose ps -q app)"
elapsed=0
while :; do
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
  case "$status" in
    healthy) break ;;
    unhealthy|exited|dead)
      echo "deploy: app is $status" >&2
      docker compose logs --tail 50 app >&2
      exit 1 ;;
  esac
  if [ "$elapsed" -ge "$HEALTH_TIMEOUT" ]; then
    echo "deploy: app not healthy after ${HEALTH_TIMEOUT}s (status: $status)" >&2
    docker compose logs --tail 50 app >&2
    exit 1
  fi
  sleep 5
  elapsed=$((elapsed + 5))
done

docker compose ps
echo "deploy: done"
