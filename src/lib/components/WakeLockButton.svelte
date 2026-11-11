<script lang="ts">
	import { onMount } from 'svelte';

	const KEY = 'zakupy:wakelock';

	let supported = $state(false);
	let enabled = $state(false);
	let sentinel: WakeLockSentinel | null = null;

	async function acquire() {
		try {
			sentinel = await navigator.wakeLock.request('screen');
			sentinel.addEventListener('release', () => (sentinel = null));
		} catch {
			// np. tryb oszczędzania baterii — przeglądarka odmówiła
			enabled = false;
		}
	}

	async function toggle() {
		enabled = !enabled;
		try {
			localStorage.setItem(KEY, enabled ? '1' : '0');
		} catch {
			// brak dostępu do localStorage — trudno, ustawienie nie przetrwa odświeżenia
		}
		if (enabled) await acquire();
		else await sentinel?.release();
		navigator.vibrate?.(10);
	}

	onMount(() => {
		// Wake Lock działa tylko przez HTTPS (lub localhost).
		supported = 'wakeLock' in navigator && window.isSecureContext;
		if (!supported) return;
		try {
			enabled = localStorage.getItem(KEY) === '1';
		} catch {
			enabled = false;
		}
		if (enabled) acquire();

		// Blokada znika, gdy karta schowa się w tle — po powrocie trzeba ją wziąć ponownie.
		const onVisibility = () => {
			if (enabled && document.visibilityState === 'visible' && !sentinel) acquire();
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			sentinel?.release();
		};
	});
</script>

{#if supported}
	<button
		type="button"
		class:on={enabled}
		aria-pressed={enabled}
		aria-label={enabled ? 'Ekran nie gaśnie — wyłącz' : 'Nie wygaszaj ekranu'}
		title={enabled ? 'Ekran nie gaśnie' : 'Nie wygaszaj ekranu'}
		onclick={toggle}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
		</svg>
	</button>
{/if}

<style>
	button {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: var(--chip);
		color: var(--text-muted);
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}

	button.on {
		background: var(--sun-bg);
		color: var(--sun);
	}

	svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}

	.on svg circle {
		fill: currentColor;
	}
</style>
