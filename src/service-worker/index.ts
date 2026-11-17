import { self as sw } from '$app/service-worker';
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `zakupy-${version}`;

// Ostatnio otwarta lista — offline start z ikony („/” to przekierowanie, którego nie da się podać z cache).
const LAST_LIST = '/__offline/last-list';
const LIST_PAGE = /^\/l\/\d+\/?$/;

/** Kopia odpowiedzi bez flagi `redirected` — przeglądarka odrzuca przekierowane odpowiedzi dla nawigacji. */
async function clean(response: Response): Promise<Response> {
	return new Response(await response.blob(), {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}

/** Nawigacja (otwarcie strony): sieć, a bez sieci zapisana strona albo ostatnia lista. */
async function navigate(request: Request): Promise<Response> {
	const cache = await caches.open(CACHE);
	const url = new URL(request.url);

	try {
		const response = await fetch(request);
		const finalPath = new URL(response.url || request.url).pathname;
		if (response.ok && LIST_PAGE.test(finalPath)) {
			const copy = await clean(response.clone());
			await cache.put(finalPath, copy.clone());
			await cache.put(LAST_LIST, copy);
		}
		return response;
	} catch (err) {
		const cached = LIST_PAGE.test(url.pathname) ? await cache.match(url.pathname) : undefined;
		const fallback = cached ?? (await cache.match(LAST_LIST));
		if (fallback) return fallback;
		throw err;
	}
}

// Ścieżki z manifestu są względne wobec base path — zamieniamy je na pełne ścieżki URL.
const toPath = (path: string) => new URL(path, sw.registration.scope).pathname;
const ASSETS = [...immutable, ...assets].map(({ path }) => toPath(path));

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin || url.pathname.startsWith('/api/')) return;

	if (request.mode === 'navigate') {
		event.respondWith(navigate(request));
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Pliki aplikacji (niezmienne) — zawsze z cache.
			if (ASSETS.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			// Strony i dane — najpierw sieć (świeże dane), bez sieci ostatnia zapisana wersja.
			try {
				const response = await fetch(request);
				if (response.ok) cache.put(request, response.clone());
				return response;
			} catch (err) {
				const cached = await cache.match(request);
				if (cached) return cached;
				throw err;
			}
		})()
	);
});
