import { error, json } from '@sveltejs/kit';
import { deleteItem, getCategories, getItem, updateItem } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, itemPatch, parseId, readJson } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const item = getItem(parseId(params.id));
	if (!item) error(404, 'Nie ma takiego produktu');
	return json(item);
};

/** Body: dowolny podzbiór { name, quantity, unit, note, category_id, checked }. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params.id);
	const patch = itemPatch(await readJson(request));

	if (patch.category_id != null && !getCategories().some((c) => c.id === patch.category_id)) {
		error(400, 'Nie ma takiej kategorii');
	}

	const item = updateItem(id, patch);
	if (!item) error(404, 'Nie ma takiego produktu');
	broadcast({ type: 'item', action: 'updated', listId: item.list_id, itemId: id, source: clientId(request) });
	return json(item);
};

/** Zwraca usunięty produkt — klient może go przywrócić przez /api/lists/:id/restore. */
export const DELETE: RequestHandler = ({ params, request }) => {
	const item = deleteItem(parseId(params.id));
	if (!item) error(404, 'Nie ma takiego produktu');
	broadcast({ type: 'item', action: 'deleted', listId: item.list_id, itemId: item.id, source: clientId(request) });
	return json(item);
};
