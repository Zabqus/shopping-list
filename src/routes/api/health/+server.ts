import { json } from '@sveltejs/kit';
import { getDb } from '#lib/server/db/index.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	try {
		getDb().prepare('SELECT 1').get();
		return json({ status: 'ok' });
	} catch (err) {
		return json({ status: 'error', message: (err as Error).message }, { status: 503 });
	}
};
