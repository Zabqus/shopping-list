import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	DATABASE_PATH: {
		description: 'Ścieżka do pliku bazy SQLite',
		schema: (value) => value || './data/zakupy.db'
	}
});
