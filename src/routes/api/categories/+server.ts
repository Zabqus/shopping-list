import { error, json } from '@sveltejs/kit';
import { clientId, readJson } from '#lib/server/http.js';
import { broadcast } from '#lib/server/events.js';
import { getCategories, reorderCategories } from '#lib/server/db/queries.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json(getCategories());

/** PUT /api/categories — kolejność alejek: { ids: number[] } (wszystkie id kategorii). */
export const PUT: RequestHandler = async ({ request }) => {
	const body = await readJson(request);
	const raw = body.ids;
	if (!Array.isArray(raw) || raw.length === 0 || raw.some((id) => typeof id !== 'number' || !Number.isInteger(id))) {
		error(400, 'Pole „ids” musi być listą liczb całkowitych');
	}

	const categories = reorderCategories(raw as number[]);
	if (!categories) error(400, 'Lista „ids” musi zawierać dokładnie wszystkie kategorie');

	broadcast({ type: 'categories', action: 'reordered', source: clientId(request) });
	return json(categories);
};
