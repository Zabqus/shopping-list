import { json } from '@sveltejs/kit';
import { frequentProducts, suggest } from '#lib/server/db/queries.js';
import type { RequestHandler } from './$types';

/**
 * GET /api/suggest?q=ml&list=1 — podpowiedzi z historii (bez nieodhaczonych na liście).
 * GET /api/suggest?list=1 — „Kup znowu”: najczęściej kupowane, których nie ma na liście.
 */
export const GET: RequestHandler = ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').slice(0, 100);
	const list = Number(url.searchParams.get('list')) || null;
	const trimmed = q.trim();
	const limit = Math.min(Number(url.searchParams.get('limit')) || (trimmed ? 8 : 12), 20);
	return json(trimmed ? suggest(trimmed, list, limit) : frequentProducts(list, limit));
};
