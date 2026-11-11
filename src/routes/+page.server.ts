import { getDb } from '#lib/server/db/index.js';
import type { ShoppingList } from '#lib/types.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const lists = getDb()
		.prepare('SELECT * FROM lists ORDER BY position, id')
		.all() as unknown as ShoppingList[];

	return { lists };
};
