import { error, json } from '@sveltejs/kit';
import { getList, restoreItems } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, parseId, readJson } from '#lib/server/http.js';
import type { Item } from '#lib/types.js';
import type { RequestHandler } from './$types';

const isItem = (value: unknown): value is Item => {
	const v = value as Item;
	return (
		!!v &&
		typeof v === 'object' &&
		Number.isInteger(v.id) &&
		typeof v.name === 'string' &&
		v.name.trim() !== '' &&
		Number.isInteger(v.position) &&
		typeof v.created_at === 'string'
	);
};

/** Body: { items: Item[] } — przywraca produkty usunięte przez DELETE lub clear-checked. */
export const POST: RequestHandler = async ({ params, request }) => {
	const listId = parseId(params.id);
	if (!getList(listId)) error(404, 'Nie ma takiej listy');

	const body = await readJson(request);
	if (!Array.isArray(body.items) || !body.items.every(isItem)) error(400, 'Oczekiwano { items: Item[] }');

	const restored = restoreItems(listId, body.items);
	broadcast({ type: 'items-restored', listId, source: clientId(request) });
	return json(restored);
};
