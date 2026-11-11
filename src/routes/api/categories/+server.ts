import { json } from '@sveltejs/kit';
import { getCategories } from '#lib/server/db/queries.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => json(getCategories());
