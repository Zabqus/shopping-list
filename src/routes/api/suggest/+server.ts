import { json } from '@sveltejs/kit';
import { suggest } from '#lib/server/db/queries.js';
import type { RequestHandler } from './$types';

/** GET /api/suggest?q=ml&list=1 — podpowiedzi z historii (bez produktów już leżących na liście). */
export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const list = Number(url.searchParams.get('list')) || null;
	const limit = Math.min(Number(url.searchParams.get('limit')) || 8, 20);
	return json(suggest(q.slice(0, 100), list, limit));
};
