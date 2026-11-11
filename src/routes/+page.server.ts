import { redirect } from '@sveltejs/kit';
import { createList, getLists } from '#lib/server/db/queries.js';
import type { PageServerLoad } from './$types';

/** Strona startowa → ostatnio otwierana lista (cookie) albo pierwsza. */
export const load: PageServerLoad = ({ cookies }) => {
	const lists = getLists();
	const last = Number(cookies.get('list'));
	const target = lists.find((l) => l.id === last) ?? lists[0] ?? createList('Spożywcze', '🛒');
	redirect(307, `/l/${target.id}`);
};
