#!/bin/sh
# Folder z bazą bywa podmontowany z hosta (Dockge tworzy ./data jako root),
# więc chown z Dockerfile nie wystarcza. Startujemy jako root, poprawiamy
# właściciela folderu i od razu przechodzimy na zwykłego użytkownika `node`.
set -e

DATA_DIR="$(dirname "${DATABASE_PATH:-/app/data/zakupy.db}")"

if [ "$(id -u)" = "0" ]; then
	mkdir -p "$DATA_DIR"
	chown -R node:node "$DATA_DIR"
	exec su-exec node "$@"
fi

# Kontener uruchomiony z `user:` w compose — nic nie zmieniamy.
exec "$@"
