export interface ShoppingList {
	id: number;
	name: string;
	icon: string | null;
	position: number;
	created_at: string;
	/** Liczba nieodhaczonych produktów (tylko w GET /api/lists i w danych strony). */
	open_count?: number;
}

export interface Category {
	id: number;
	name: string;
	icon: string | null;
	position: number;
}

export interface Item {
	id: number;
	list_id: number;
	name: string;
	quantity: number | null;
	unit: string | null;
	note: string | null;
	category_id: number | null;
	checked: boolean;
	checked_at: string | null;
	position: number;
	created_at: string;
	updated_at: string;
}

export interface Product {
	name: string;
	category_id: number | null;
	use_count: number;
	last_used_at: string;
}

export interface ParsedItem {
	name: string;
	quantity: number | null;
	unit: string | null;
}

/** Pola, które można zmienić przez PATCH /api/items/:id */
export interface ItemPatch {
	name?: string;
	quantity?: number | null;
	unit?: string | null;
	note?: string | null;
	category_id?: number | null;
	checked?: boolean;
}

/** Podpowiedź z historii zakupów (GET /api/suggest) */
export interface Suggestion {
	name: string;
	category_id: number | null;
	use_count: number;
}

/**
 * Zdarzenie live sync. `source` to identyfikator klienta, który wywołał zmianę
 * (nagłówek X-Client-Id) — klient ignoruje własne zdarzenia.
 */
export type ChangeEvent = (
	| { type: 'list'; action: 'created' | 'updated' | 'deleted'; listId: number }
	| { type: 'item'; action: 'created' | 'updated' | 'deleted'; listId: number; itemId: number }
	| { type: 'items-cleared'; listId: number }
	| { type: 'items-restored'; listId: number }
) & { source?: string };
