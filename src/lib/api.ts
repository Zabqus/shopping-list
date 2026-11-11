import type { Item, ItemPatch, ShoppingList, Suggestion } from '#lib/types.js';

/**
 * Id tej karty przeglądarki — wysyłany w X-Client-Id, wraca w zdarzeniach SSE,
 * dzięki czemu klient pomija własne zmiany (już widoczne lokalnie).
 * crypto.randomUUID wymaga HTTPS, a w sieci lokalnej bywa zwykły HTTP — stąd fallback.
 */
export const CLIENT_ID =
	typeof crypto !== 'undefined' && 'randomUUID' in crypto
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2) + Date.now().toString(36);

export class ApiError extends Error {}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers: {
				'x-client-id': CLIENT_ID,
				...(body !== undefined ? { 'content-type': 'application/json' } : {})
			},
			body: body !== undefined ? JSON.stringify(body) : undefined
		});
	} catch {
		throw new ApiError('Brak połączenia z serwerem');
	}

	if (!response.ok) {
		const data = await response.json().catch(() => null);
		throw new ApiError(data?.message ?? `Błąd serwera (${response.status})`);
	}
	return response.status === 204 ? (undefined as T) : response.json();
}

export const api = {
	createList: (name: string, icon: string | null) => request<ShoppingList>('POST', '/api/lists', { name, icon }),
	updateList: (id: number, patch: { name?: string; icon?: string | null }) =>
		request<ShoppingList>('PATCH', `/api/lists/${id}`, patch),
	deleteList: (id: number) => request<void>('DELETE', `/api/lists/${id}`),

	getItems: (listId: number) => request<Item[]>('GET', `/api/lists/${listId}/items`),
	addItem: (listId: number, text: string) => request<Item>('POST', `/api/lists/${listId}/items`, { text }),
	updateItem: (id: number, patch: ItemPatch) => request<Item>('PATCH', `/api/items/${id}`, patch),
	deleteItem: (id: number) => request<Item>('DELETE', `/api/items/${id}`),
	clearChecked: (listId: number) => request<Item[]>('POST', `/api/lists/${listId}/clear-checked`),
	restoreItems: (listId: number, items: Item[]) =>
		request<Item[]>('POST', `/api/lists/${listId}/restore`, { items }),

	suggest: (q: string, listId: number, signal?: AbortSignal) =>
		fetch(`/api/suggest?q=${encodeURIComponent(q)}&list=${listId}`, { signal }).then(
			(r) => (r.ok ? (r.json() as Promise<Suggestion[]>) : [])
		)
};
