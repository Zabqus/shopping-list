import { error, json } from '@sveltejs/kit';
import { addItemFromText, getItems, getList } from '#lib/server/db/queries.js';
import { broadcast } from '#lib/server/events.js';
import { clientId, parseId, readJson, text } from '#lib/server/http.js';
import type { RequestHandler } from './$types';

function requireList(value: string) {
	const id = parseId(value);
	if (!getList(id)) error(404, 'Nie ma takiej listy');
	return id;
}

export const GET: RequestHandler = ({ params }) => json(getItems(requireList(params.id)));

/** Body: { text: "2 mleko" } — ilość i jednostka są parsowane z tekstu. */
export const POST: RequestHandler = async ({ params, request }) => {
	const listId = requireList(params.id);
	const body = await readJson(request);
	const result = addItemFromText(listId, text(body.text, 'text'));
	if (!result) error(400, 'Pusta nazwa produktu');

	broadcast({
		type: 'item',
		action: result.created ? 'created' : 'updated',
		listId,
		itemId: result.item.id,
		source: clientId(request)
	});
	return json(result.item, { status: result.created ? 201 : 200 });
};
