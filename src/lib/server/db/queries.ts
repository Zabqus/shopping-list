import type { SQLInputValue } from 'node:sqlite';
import type { Category, Item, ItemPatch, ShoppingList, Suggestion } from '#lib/types.js';
import { parseItem } from '#lib/parse.js';
import { guessCategoryName } from '../categories.js';
import { getDb } from './index.js';

type Row = Record<string, SQLInputValue>;

const toItem = (row: Row): Item => ({
	id: row.id as number,
	list_id: row.list_id as number,
	name: row.name as string,
	quantity: (row.quantity as number | null) ?? null,
	unit: (row.unit as string | null) ?? null,
	note: (row.note as string | null) ?? null,
	category_id: (row.category_id as number | null) ?? null,
	checked: Boolean(row.checked),
	checked_at: (row.checked_at as string | null) ?? null,
	position: row.position as number,
	created_at: row.created_at as string,
	updated_at: row.updated_at as string
});

function transaction<T>(fn: () => T): T {
	const db = getDb();
	db.exec('BEGIN');
	try {
		const result = fn();
		db.exec('COMMIT');
		return result;
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('pl') + text.slice(1);

// ───────────────────────── Listy ─────────────────────────

export function getLists(): ShoppingList[] {
	return getDb()
		.prepare(
			`SELECT l.*, (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id AND i.checked = 0) AS open_count
			 FROM lists l ORDER BY l.position, l.id`
		)
		.all() as unknown as ShoppingList[];
}

export function getList(id: number): ShoppingList | undefined {
	return getDb().prepare('SELECT * FROM lists WHERE id = ?').get(id) as unknown as ShoppingList | undefined;
}

export function createList(name: string, icon: string | null): ShoppingList {
	const db = getDb();
	const { next } = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM lists').get() as { next: number };
	const { lastInsertRowid } = db
		.prepare('INSERT INTO lists (name, icon, position) VALUES (?, ?, ?)')
		.run(name, icon, next);
	return getList(Number(lastInsertRowid))!;
}

export function updateList(id: number, patch: { name?: string; icon?: string | null }): ShoppingList | undefined {
	const list = getList(id);
	if (!list) return undefined;
	getDb()
		.prepare('UPDATE lists SET name = ?, icon = ? WHERE id = ?')
		.run(patch.name ?? list.name, patch.icon !== undefined ? patch.icon : list.icon, id);
	return getList(id);
}

export function deleteList(id: number): boolean {
	return getDb().prepare('DELETE FROM lists WHERE id = ?').run(id).changes > 0;
}

export function countLists(): number {
	return (getDb().prepare('SELECT COUNT(*) AS n FROM lists').get() as { n: number }).n;
}

// ───────────────────────── Kategorie ─────────────────────────

export function getCategories(): Category[] {
	return getDb().prepare('SELECT * FROM categories ORDER BY position, id').all() as unknown as Category[];
}

function categoryIdByName(name: string): number | null {
	const row = getDb().prepare('SELECT id FROM categories WHERE name = ?').get(name) as { id: number } | undefined;
	return row?.id ?? null;
}

/** Kategoria dla produktu: najpierw wcześniejszy wybór użytkownika, potem słownik, na końcu „Inne”. */
export function resolveCategory(productName: string): number | null {
	const learned = getDb()
		.prepare('SELECT category_id FROM products WHERE name = ? AND category_id IS NOT NULL')
		.get(productName) as { category_id: number } | undefined;
	if (learned) return learned.category_id;

	const guessed = guessCategoryName(productName);
	return categoryIdByName(guessed ?? 'Inne');
}

// ───────────────────────── Produkty (historia) ─────────────────────────

function rememberProduct(name: string, categoryId: number | null): void {
	getDb()
		.prepare(
			`INSERT INTO products (name, category_id) VALUES (?, ?)
			 ON CONFLICT (name) DO UPDATE SET
				use_count    = use_count + 1,
				last_used_at = datetime('now'),
				category_id  = COALESCE(products.category_id, excluded.category_id)`
		)
		.run(name, categoryId);
}

function learnCategory(name: string, categoryId: number | null): void {
	getDb()
		.prepare(
			`INSERT INTO products (name, category_id, use_count) VALUES (?, ?, 0)
			 ON CONFLICT (name) DO UPDATE SET category_id = excluded.category_id`
		)
		.run(name, categoryId);
}

export function suggest(query: string, listId: number | null, limit = 8): Suggestion[] {
	const q = query.trim();
	if (!q) return [];
	const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);

	// Produkty już (nieodhaczone) na liście pomijamy — nie ma sensu ich podpowiadać.
	return getDb()
		.prepare(
			`SELECT p.name, p.category_id, p.use_count
			 FROM products p
			 WHERE (p.name LIKE ? ESCAPE '\\' OR p.name LIKE ? ESCAPE '\\')
			   AND NOT EXISTS (
				SELECT 1 FROM items i
				WHERE i.list_id = ? AND i.checked = 0 AND i.name = p.name COLLATE NOCASE
			   )
			 ORDER BY (p.name LIKE ? ESCAPE '\\') DESC, p.use_count DESC, p.last_used_at DESC
			 LIMIT ?`
		)
		.all(`${escaped}%`, `% ${escaped}%`, listId ?? -1, `${escaped}%`, limit) as unknown as Suggestion[];
}

// ───────────────────────── Produkty na liście ─────────────────────────

export function getItems(listId: number): Item[] {
	return (
		getDb().prepare('SELECT * FROM items WHERE list_id = ? ORDER BY position, id').all(listId) as Row[]
	).map(toItem);
}

export function getItem(id: number): Item | undefined {
	const row = getDb().prepare('SELECT * FROM items WHERE id = ?').get(id) as Row | undefined;
	return row ? toItem(row) : undefined;
}

/**
 * Dodaje produkt z tekstu („2 mleko”). Jeśli taki produkt już jest na liście:
 * - odhaczony → wraca na listę z nową ilością,
 * - nieodhaczony → ilości się sumują (gdy jednostki pasują), bez duplikatu.
 */
export function addItemFromText(listId: number, text: string): { item: Item; created: boolean } | null {
	const parsed = parseItem(text);
	const name = capitalize(parsed.name.trim());
	if (!name) return null;

	return transaction(() => {
		const db = getDb();
		const categoryId = resolveCategory(name);
		rememberProduct(name, categoryId);

		const existing = db
			.prepare('SELECT * FROM items WHERE list_id = ? AND name = ? COLLATE NOCASE ORDER BY checked LIMIT 1')
			.get(listId, name) as Row | undefined;

		if (existing) {
			const item = toItem(existing);
			let quantity = parsed.quantity;
			let unit = parsed.unit;
			if (!item.checked && parsed.quantity !== null && item.quantity !== null && item.unit === parsed.unit) {
				quantity = item.quantity + parsed.quantity;
			} else if (!item.checked && parsed.quantity === null) {
				quantity = item.quantity;
				unit = item.unit;
			}
			db.prepare(
				`UPDATE items SET quantity = ?, unit = ?, checked = 0, checked_at = NULL, updated_at = datetime('now')
				 WHERE id = ?`
			).run(quantity, unit, item.id);
			return { item: getItem(item.id)!, created: false };
		}

		const { next } = db
			.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM items WHERE list_id = ?')
			.get(listId) as { next: number };
		const { lastInsertRowid } = db
			.prepare('INSERT INTO items (list_id, name, quantity, unit, category_id, position) VALUES (?, ?, ?, ?, ?, ?)')
			.run(listId, name, parsed.quantity, parsed.unit, categoryId, next);
		return { item: getItem(Number(lastInsertRowid))!, created: true };
	});
}

export function updateItem(id: number, patch: ItemPatch): Item | undefined {
	const item = getItem(id);
	if (!item) return undefined;

	const next = { ...item, ...patch };
	if (patch.name !== undefined) next.name = capitalize(patch.name.trim()) || item.name;
	if (patch.checked !== undefined && patch.checked !== item.checked) {
		next.checked_at = patch.checked ? new Date().toISOString() : null;
	}

	return transaction(() => {
		getDb()
			.prepare(
				`UPDATE items SET name = ?, quantity = ?, unit = ?, note = ?, category_id = ?,
					checked = ?, checked_at = ?, updated_at = datetime('now')
				 WHERE id = ?`
			)
			.run(
				next.name,
				next.quantity,
				next.unit,
				next.note,
				next.category_id,
				next.checked ? 1 : 0,
				next.checked_at,
				id
			);

		// Ręczna zmiana kategorii = nauka na przyszłość.
		if (patch.category_id !== undefined && patch.category_id !== item.category_id) {
			learnCategory(next.name, next.category_id);
		}
		return getItem(id);
	});
}

export function deleteItem(id: number): Item | undefined {
	const item = getItem(id);
	if (!item) return undefined;
	getDb().prepare('DELETE FROM items WHERE id = ?').run(id);
	return item;
}

export function clearChecked(listId: number): Item[] {
	return transaction(() => {
		const removed = (
			getDb().prepare('SELECT * FROM items WHERE list_id = ? AND checked = 1').all(listId) as Row[]
		).map(toItem);
		getDb().prepare('DELETE FROM items WHERE list_id = ? AND checked = 1').run(listId);
		return removed;
	});
}

/** Przywraca usunięte produkty (przycisk „Cofnij”) — z tymi samymi id. */
export function restoreItems(listId: number, items: Item[]): Item[] {
	return transaction(() => {
		const insert = getDb().prepare(
			`INSERT OR REPLACE INTO items
				(id, list_id, name, quantity, unit, note, category_id, checked, checked_at, position, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
		);
		for (const item of items) {
			insert.run(
				item.id,
				listId,
				item.name,
				item.quantity,
				item.unit,
				item.note,
				item.category_id,
				item.checked ? 1 : 0,
				item.checked_at,
				item.position,
				item.created_at
			);
		}
		return items.map((item) => getItem(item.id)!).filter(Boolean);
	});
}
