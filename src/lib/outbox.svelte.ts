import { api, ApiError } from '#lib/api.js';
import type { Item } from '#lib/types.js';

/**
 * Kolejka zmian offline (odhaczanie / usuwanie) w IndexedDB.
 * Po powrocie sieci wysyła się FIFO; UI nakłada oczekujące operacje na dane z serwera.
 */

export type OutboxOp =
	| { id: number; type: 'update'; itemId: number; checked: boolean; enqueuedAt: number }
	| { id: number; type: 'delete'; itemId: number; enqueuedAt: number };

const DB_NAME = 'zakupy-offline';
const STORE = 'outbox';
const DB_VERSION = 1;

/** Reaktywny stan kolejki — `pending` do wskaźnika w UI. */
export const outbox = $state({
	ready: false,
	syncing: false,
	pending: 0,
	ops: [] as OutboxOp[]
});

let dbPromise: Promise<IDBDatabase> | null = null;
let flushPromise: Promise<void> | null = null;
let initPromise: Promise<void> | null = null;
let nextId = 1;

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE, { keyPath: 'id' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('IndexedDB niedostępne'));
	});
	return dbPromise;
}

function idbAll(db: IDBDatabase): Promise<OutboxOp[]> {
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
		req.onsuccess = () => resolve(req.result as OutboxOp[]);
		req.onerror = () => reject(req.error);
	});
}

function idbPut(db: IDBDatabase, op: OutboxOp): Promise<void> {
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(op);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function idbDelete(db: IDBDatabase, id: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}

function setOps(ops: OutboxOp[]) {
	ops.sort((a, b) => a.id - b.id);
	outbox.ops = ops;
	outbox.pending = ops.length;
	nextId = ops.reduce((max, op) => Math.max(max, op.id), 0) + 1;
}

/** Czy błąd to brak sieci (albo serwer nieosiągalny). */
export function isNetworkError(err: unknown): boolean {
	return err instanceof ApiError && err.message === 'Brak połączenia z serwerem';
}

/** Nałóż oczekujące zmiany na listę z serwera (bez mutacji wejścia). */
export function applyOutbox(items: Item[]): Item[] {
	let result = items;
	for (const op of outbox.ops) {
		if (op.type === 'delete') {
			result = result.filter((i) => i.id !== op.itemId);
		} else {
			result = result.map((i) =>
				i.id === op.itemId
					? {
							...i,
							checked: op.checked,
							checked_at: op.checked ? (i.checked_at ?? new Date().toISOString()) : null
						}
					: i
			);
		}
	}
	return result;
}

/**
 * Zwieź operacje dla tego samego produktu:
 * - kolejny update zastępuje poprzedni update,
 * - delete kasuje wcześniejsze update/delete i zostaje sam.
 */
function coalesce(ops: OutboxOp[], incoming: OutboxOp): OutboxOp[] {
	if (incoming.type === 'delete') {
		return [...ops.filter((o) => o.itemId !== incoming.itemId), incoming];
	}
	const withoutUpdates = ops.filter((o) => !(o.type === 'update' && o.itemId === incoming.itemId));
	if (withoutUpdates.some((o) => o.type === 'delete' && o.itemId === incoming.itemId)) {
		return withoutUpdates;
	}
	return [...withoutUpdates, incoming];
}

export async function initOutbox() {
	if (outbox.ready) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		if (typeof indexedDB === 'undefined') {
			outbox.ready = true;
			return;
		}
		try {
			const db = await openDb();
			setOps(await idbAll(db));
		} catch {
			setOps([]);
		}
		outbox.ready = true;
	})();

	return initPromise;
}

async function ensureReady() {
	if (!outbox.ready) await initOutbox();
}

async function persist(ops: OutboxOp[], removedIds: number[] = []) {
	setOps(ops);
	try {
		const db = await openDb();
		for (const id of removedIds) await idbDelete(db, id);
		for (const op of ops) await idbPut(db, op);
	} catch {
		// Pamięć i tak trzyma kolejkę do końca sesji.
	}
}

export async function enqueueUpdate(itemId: number, checked: boolean) {
	await ensureReady();
	const op: OutboxOp = { id: nextId++, type: 'update', itemId, checked, enqueuedAt: Date.now() };
	const prev = outbox.ops;
	const next = coalesce(prev, op);
	const removed = prev.filter((o) => !next.includes(o)).map((o) => o.id);
	await persist(next, removed);
}

export async function enqueueDelete(itemId: number) {
	await ensureReady();
	const op: OutboxOp = { id: nextId++, type: 'delete', itemId, enqueuedAt: Date.now() };
	const prev = outbox.ops;
	const next = coalesce(prev, op);
	const removed = prev.filter((o) => !next.includes(o)).map((o) => o.id);
	await persist(next, removed);
}

/** Cofa jeszcze niewysłane usunięcie (przycisk „Cofnij” w toaście). */
export async function cancelDelete(itemId: number) {
	await ensureReady();
	const prev = outbox.ops;
	const doomed = prev.filter((o) => o.type === 'delete' && o.itemId === itemId);
	if (doomed.length === 0) return false;
	const next = prev.filter((o) => !(o.type === 'delete' && o.itemId === itemId));
	await persist(next, doomed.map((o) => o.id));
	return true;
}

async function dropOp(op: OutboxOp) {
	await persist(
		outbox.ops.filter((o) => o.id !== op.id),
		[op.id]
	);
}

function isGone(err: unknown): boolean {
	return err instanceof ApiError && err.status === 404;
}

/**
 * Wyślij kolejkę po kolei. Bezpieczne przy równoległych wywołaniach (jedna pętla naraz).
 * `onSynced` — po udanym update, zanim zdejmiemy op (żeby UI nie mignął starą wartością).
 */
export function flushOutbox(handlers?: { onSynced?: (item: Item) => void }) {
	if (flushPromise) return flushPromise;

	flushPromise = (async () => {
		if (!outbox.ops.length) return;
		outbox.syncing = true;
		try {
			while (outbox.ops.length > 0) {
				const op = outbox.ops[0]!;
				try {
					if (op.type === 'update') {
						const item = await api.updateItem(op.itemId, { checked: op.checked });
						handlers?.onSynced?.(item);
					} else {
						await api.deleteItem(op.itemId);
					}
					await dropOp(op);
				} catch (err) {
					if (isNetworkError(err)) break;
					if (isGone(err)) {
						await dropOp(op);
						continue;
					}
					// Inny błąd serwera — zostaw w kolejce, spróbujemy później.
					break;
				}
			}
		} finally {
			outbox.syncing = false;
			flushPromise = null;
		}
	})();

	return flushPromise;
}

/** Nasłuch online / widoczność — wywołaj raz z onMount. Zwraca cleanup. */
export function listenOutboxFlush(flush: () => void) {
	const onOnline = () => flush();
	window.addEventListener('online', onOnline);
	return () => window.removeEventListener('online', onOnline);
}
