import type { ChangeEvent } from '#lib/types.js';

type Listener = (event: ChangeEvent) => void;

const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function broadcast(event: ChangeEvent): void {
	for (const listener of listeners) {
		try {
			listener(event);
		} catch (err) {
			console.error('[events] błąd listenera', err);
		}
	}
}
