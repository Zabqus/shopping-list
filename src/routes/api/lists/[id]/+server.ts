import { error, json } from '@sveltejs/kit';
import { countLists, deleteList, getList, updateList } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, optionalIcon, parseId, readJson, text } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const list = getList(parseId(params.id));
	if (!list) error(404, 'Nie ma takiej listy');
	return json(list);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params.id);
	const body = await readJson(request);
	const list = updateList(id, {
		name: 'name' in body ? text(body.name, 'name', 60) : undefined,
		icon: 'icon' in body ? optionalIcon(body.icon) : undefined
	});
	if (!list) error(404, 'Nie ma takiej listy');
	broadcast({ type: 'list', action: 'updated', listId: id, source: clientId(request) });
	return json(list);
};

export const DELETE: RequestHandler = ({ params, request }) => {
	const id = parseId(params.id);
	if (!getList(id)) error(404, 'Nie ma takiej listy');
	if (countLists() <= 1) error(400, 'Nie można usunąć ostatniej listy');
	deleteList(id);
	broadcast({ type: 'list', action: 'deleted', listId: id, source: clientId(request) });
	return new Response(null, { status: 204 });
};
