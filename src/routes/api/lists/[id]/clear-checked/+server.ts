import { error, json } from '@sveltejs/kit';
import { clearChecked, getList } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, parseId } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

/** Usuwa odhaczone produkty. Zwraca usunięte — klient może je przywrócić („Cofnij”). */
export const POST: RequestHandler = ({ params, request }) => {
	const listId = parseId(params.id);
	if (!getList(listId)) error(404, 'Nie ma takiej listy');
	const removed = clearChecked(listId);
	if (removed.length > 0) broadcast({ type: 'items-cleared', listId, source: clientId(request) });
	return json(removed);
};
