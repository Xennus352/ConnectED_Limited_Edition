#!/usr/bin/env bash
# Start/stop the MongoDB container without needing the docker compose plugin.
#   pnpm db:up    → start MongoDB (replica set rs0, ready for Prisma)
#   pnpm db:down  → stop MongoDB (data is kept in the named volume)
set -euo pipefail

NAME=connect-ed-mongodb
VOLUME=connect_ed_mongodb_data

case "${1:-up}" in
  up)
    if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
      docker start "$NAME" >/dev/null
    else
      docker run -d --name "$NAME" --restart unless-stopped \
        -p 27017:27017 -v "$VOLUME":/data/db \
        mongo:7 --replSet rs0 --bind_ip_all >/dev/null
    fi

    # Wait for mongod, initiating the single-node replica set if needed
    # (Prisma transactions require a replica set).
    for _ in $(seq 1 20); do
      if docker exec "$NAME" mongosh --quiet --eval \
        "try { rs.status().ok; quit(0) } catch(e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'127.0.0.1:27017'}]}).ok; quit(0) }" \
        >/dev/null 2>&1; then
        echo "✔ mongodb ready on 127.0.0.1:27017 (replica set rs0)"
        exit 0
      fi
      sleep 1
    done
    echo "✖ mongodb did not become ready" >&2
    exit 1
    ;;
  down)
    docker stop "$NAME" >/dev/null
    echo "■ mongodb stopped (data kept in volume $VOLUME)"
    ;;
  *)
    echo "usage: $0 [up|down]" >&2
    exit 1
    ;;
esac
