import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DATABASE_PATH } from '$app/env/private';
import { migrate } from './migrate.js';

let db: DatabaseSync | undefined;

export function getDb(): DatabaseSync {
	if (db) return db;

	const path = resolve(DATABASE_PATH);
	mkdirSync(dirname(path), { recursive: true });

	db = new DatabaseSync(path);
	db.exec('PRAGMA journal_mode = WAL;');
	db.exec('PRAGMA foreign_keys = ON;');
	db.exec('PRAGMA busy_timeout = 5000;');

	migrate(db);
	return db;
}
