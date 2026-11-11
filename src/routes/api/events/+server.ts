import { subscribe } from '#lib/server/events.js';
import type { RequestHandler } from './$types';

const KEEPALIVE_MS = 25_000;

export const GET: RequestHandler = ({ request }) => {
	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (chunk: string) => controller.enqueue(encoder.encode(chunk));

			send('retry: 3000\n\n');

			const unsubscribe = subscribe((event) => {
				send(`data: ${JSON.stringify(event)}\n\n`);
			});
			const keepalive = setInterval(() => send(': ping\n\n'), KEEPALIVE_MS);

			cleanup = () => {
				clearInterval(keepalive);
				unsubscribe();
			};
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					// strumień mógł zostać już zamknięty przez cancel()
				}
			});
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
};
