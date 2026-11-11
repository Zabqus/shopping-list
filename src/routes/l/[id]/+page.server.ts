import { error, redirect } from '@sveltejs/kit';
import { getCategories, getItems, getList, getLists } from '#lib/server/db/queries.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, cookies }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) error(404, 'Nie ma takiej listy');

	const list = getList(id);
	if (!list) redirect(307, '/');

	// Zapamiętujemy ostatnią listę — „/” otworzy ją następnym razem.
	cookies.set('list', String(id), { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });

	return {
		list,
		lists: getLists(),
		categories: getCategories(),
		items: getItems(id)
	};
};
