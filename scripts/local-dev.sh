#!/usr/bin/env bash
# One-shot local dev bootstrap.
#
# Assumes: git, Node 20+, and Docker installed on the host. Postgres and Redis
# are run as ephemeral Docker containers (no native installs needed).
#
# Idempotent: safe to re-run. Starts dev server + worker in the background and
# writes PIDs/logs into ./.local-dev/.
#
#   ./scripts/local-dev.sh         # bring up everything
#   ./scripts/local-dev.sh stop    # stop dev/worker/containers
#   ./scripts/local-dev.sh logs    # tail dev + worker logs

set -euo pipefail
cd "$(dirname "$0")/.."

STATE_DIR="$(pwd)/.local-dev"
mkdir -p "$STATE_DIR"
DEV_PID="$STATE_DIR/dev.pid"
WORKER_PID="$STATE_DIR/worker.pid"
DEV_LOG="$STATE_DIR/dev.log"
WORKER_LOG="$STATE_DIR/worker.log"

PG_CONTAINER=mf-postgres
REDIS_CONTAINER=mf-redis
PG_PORT=5432
REDIS_PORT=6379

cmd="${1:-up}"

stop_proc() {
  local pid_file="$1" name="$2"
  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "Stopping $name (pid $(cat "$pid_file"))..."
    kill "$(cat "$pid_file")" 2>/dev/null || true
  fi
  rm -f "$pid_file"
}

case "$cmd" in
  stop)
    stop_proc "$DEV_PID" dev
    stop_proc "$WORKER_PID" worker
    docker rm -f "$PG_CONTAINER" "$REDIS_CONTAINER" >/dev/null 2>&1 || true
    echo "Stopped."
    exit 0
    ;;
  logs)
    exec tail -f "$DEV_LOG" "$WORKER_LOG"
    ;;
  up) ;;
  *)
    echo "Usage: $0 [up|stop|logs]" >&2
    exit 1
    ;;
esac

command -v docker >/dev/null || { echo "docker not found in PATH"; exit 1; }
command -v node   >/dev/null || { echo "node not found in PATH";   exit 1; }
command -v npm    >/dev/null || { echo "npm not found in PATH";    exit 1; }

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Need Node 20+, found $(node -v)" >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  AUTH_SECRET=$(openssl rand -base64 32)
  SEED_PW=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-16)
  # Use | as sed delimiter since AUTH_SECRET contains /
  sed -i.bak "s|^AUTH_SECRET=.*|AUTH_SECRET=${AUTH_SECRET}|"           .env
  sed -i.bak "s|^SEED_ADMIN_PASSWORD=.*|SEED_ADMIN_PASSWORD=${SEED_PW}|" .env
  rm -f .env.bak
  echo "Wrote .env. Seed admin password: $SEED_PW"
else
  echo ".env already exists, leaving it alone."
fi

POSTGRES_PASSWORD=$(grep -E '^DATABASE_URL=' .env | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    docker start "$PG_CONTAINER" >/dev/null
  else
    docker run -d --name "$PG_CONTAINER" -p "$PG_PORT:5432" \
      -e POSTGRES_DB=mediumformat \
      -e POSTGRES_USER=mediumformat \
      -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
      postgres:16-alpine >/dev/null
  fi
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER"; then
    docker start "$REDIS_CONTAINER" >/dev/null
  else
    docker run -d --name "$REDIS_CONTAINER" -p "$REDIS_PORT:6379" \
      redis:7-alpine >/dev/null
  fi
fi

echo -n "Waiting for Postgres"
for _ in $(seq 1 30); do
  if docker exec "$PG_CONTAINER" pg_isready -U mediumformat >/dev/null 2>&1; then
    echo " up."
    break
  fi
  echo -n "."
  sleep 1
done

if [ ! -d node_modules ]; then
  npm install
fi

npx prisma migrate deploy
npx prisma generate >/dev/null

# Only seed if no admin exists yet.
SEED_NEEDED=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
  psql -U mediumformat -d mediumformat -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_name='User'" 2>/dev/null || true)
if [ -n "$SEED_NEEDED" ]; then
  COUNT=$(docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" "$PG_CONTAINER" \
    psql -U mediumformat -d mediumformat -tAc 'SELECT count(*) FROM "User"' 2>/dev/null || echo 0)
  if [ "${COUNT:-0}" = "0" ]; then
    npm run db:seed
  fi
fi

stop_proc "$DEV_PID" dev
stop_proc "$WORKER_PID" worker

nohup npm run dev    >"$DEV_LOG"    2>&1 &
echo $! > "$DEV_PID"
nohup npm run worker >"$WORKER_LOG" 2>&1 &
echo $! > "$WORKER_PID"

echo -n "Waiting for dev server on :8000"
for _ in $(seq 1 60); do
  if curl -fs -o /dev/null http://localhost:8000/; then
    echo " up."
    break
  fi
  echo -n "."
  sleep 1
done

ADMIN_PW=$(grep -E '^SEED_ADMIN_PASSWORD=' .env | cut -d= -f2-)
ADMIN_EMAIL=$(grep -E '^SEED_ADMIN_EMAIL=' .env | cut -d= -f2-)

cat <<EOF

Medium Format is running.

  Site:   http://localhost:8000
  Admin:  http://localhost:8000/admin/login
  Login:  $ADMIN_EMAIL / $ADMIN_PW

  Tail logs:  ./scripts/local-dev.sh logs
  Stop all:   ./scripts/local-dev.sh stop
EOF
