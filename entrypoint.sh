#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "[fankarr] Exécution en tant que UID=${PUID} GID=${PGID}"

# Attribuer /config à PUID:PGID
chown -R "$PUID:$PGID" /config

exec gosu "$PUID:$PGID" node dist/server/index.js