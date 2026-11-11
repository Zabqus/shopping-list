CREATE TABLE lists (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	name       TEXT    NOT NULL,
	icon       TEXT,
	position   INTEGER NOT NULL DEFAULT 0,
	created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categories (
	id       INTEGER PRIMARY KEY AUTOINCREMENT,
	name     TEXT    NOT NULL UNIQUE,
	icon     TEXT,
	position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	list_id     INTEGER NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
	name        TEXT    NOT NULL,
	quantity    REAL,
	unit        TEXT,
	note        TEXT,
	category_id INTEGER REFERENCES categories (id) ON DELETE SET NULL,
	checked     INTEGER NOT NULL DEFAULT 0,
	checked_at  TEXT,
	position    INTEGER NOT NULL DEFAULT 0,
	created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
	updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_items_list ON items (list_id, checked, position);

CREATE TABLE products (
	name         TEXT PRIMARY KEY COLLATE NOCASE,
	category_id  INTEGER REFERENCES categories (id) ON DELETE SET NULL,
	use_count    INTEGER NOT NULL DEFAULT 1,
	last_used_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_products_usage ON products (use_count DESC, last_used_at DESC);
