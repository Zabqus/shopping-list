import { CLIENT_ID } from '#lib/api.js';
import type { ChangeEvent } from '#lib/types.js';

/**
 * Połączenie SSE z /api/events. Wywołuje `onchange` dla cudzych zmian
 * i `onreconnect` po odzyskaniu połączenia (żeby dociągnąć to, co przegapiliśmy).
 * Zwraca stan połączenia (reaktywny) i funkcję zamykającą.
 */
export function connectLive(handlers: { onchange: (event: ChangeEvent) => void; onreconnect: () => void }) {
	const state = $state({ connected: true });
	let source: EventSource | null = null;
	let wasDisconnected = false;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;

	const open = () => {
		source?.close();
		source = new EventSource('/api/events');

		source.onopen = () => {
			state.connected = true;
			if (wasDisconnected) handlers.onreconnect();
			wasDisconnected = false;
		};

		source.onmessage = (message) => {
			try {
				const event = JSON.parse(message.data) as ChangeEvent;
				if (event.source !== CLIENT_ID) handlers.onchange(event);
			} catch {
				// pomijamy uszkodzone wiadomości
			}
		};

		source.onerror = () => {
			state.connected = false;
			wasDisconnected = true;
			// EventSource sam się wznawia, ale gdy przejdzie w CLOSED (np. 502 z nginx) — otwieramy ręcznie.
			if (source?.readyState === EventSource.CLOSED) {
				clearTimeout(retryTimer);
				retryTimer = setTimeout(open, 3000);
			}
		};
	};

	// Telefon po wybudzeniu: od razu odśwież i upewnij się, że połączenie żyje.
	const onVisibility = () => {
		if (document.visibilityState !== 'visible') return;
		if (!source || source.readyState === EventSource.CLOSED) open();
		handlers.onreconnect();
	};

	open();
	document.addEventListener('visibilitychange', onVisibility);

	return {
		state,
		close() {
			clearTimeout(retryTimer);
			document.removeEventListener('visibilitychange', onVisibility);
			source?.close();
		}
	};
}
