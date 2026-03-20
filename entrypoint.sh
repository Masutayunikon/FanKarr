#!/bin/sh
set -e

PUID=${PUID:-1000}
PGID=${PGID:-1000}

echo "[fankarr] Running as UID=${PUID} GID=${PGID}"

# Corriger les permissions du dossier data
chown -R "$PUID:$PGID" /config

exec gosu "$PUID:$PGID" node dist/server/index.js