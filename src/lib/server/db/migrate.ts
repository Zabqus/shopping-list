import type { DatabaseSync } from 'node:sqlite';

// Migracje są wbudowywane w bundle podczas builda, więc obraz Dockera nie potrzebuje plików .sql.
const files = import.meta.glob<string>('./migrations/*.sql', {
	query: '?raw',
	import: 'default',
	eager: true
});

const migrations = Object.entries(files)
	.map(([path, sql]) => ({ name: path.split('/').pop()!, sql }))
	.sort((a, b) => a.name.localeCompare(b.name));

export function migrate(db: DatabaseSync): void {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			name       TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL DEFAULT (datetime('now'))
		);
	`);

	const applied = new Set(
		db
			.prepare('SELECT name FROM schema_migrations')
			.all()
			.map((row) => row.name as string)
	);

	const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

	for (const { name, sql } of migrations) {
		if (applied.has(name)) continue;

		db.exec('BEGIN');
		try {
			db.exec(sql);
			record.run(name);
			db.exec('COMMIT');
			console.log(`[db] migracja zastosowana: ${name}`);
		} catch (err) {
			db.exec('ROLLBACK');
			throw new Error(`[db] migracja ${name} nie powiodła się: ${(err as Error).message}`);
		}
	}
}
