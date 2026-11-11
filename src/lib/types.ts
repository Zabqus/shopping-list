export interface ShoppingList {
	id: number;
	name: string;
	icon: string | null;
	position: number;
	created_at: string;
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

export type ChangeEvent =
	| { type: 'list'; action: 'created' | 'updated' | 'deleted'; listId: number }
	| { type: 'item'; action: 'created' | 'updated' | 'deleted'; listId: number; itemId: number }
	| { type: 'items-cleared'; listId: number };
