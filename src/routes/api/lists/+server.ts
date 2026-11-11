import { json } from '@sveltejs/kit';
import { createList, getLists } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, optionalIcon, readJson, text } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json(getLists());

export const POST: RequestHandler = async ({ request }) => {
	const body = await readJson(request);
	const list = createList(text(body.name, 'name', 60), optionalIcon(body.icon));
	broadcast({ type: 'list', action: 'created', listId: list.id, source: clientId(request) });
	return json(list, { status: 201 });
};
