<script lang="ts">
	import { cycleTheme, theme, type ThemePreference } from '#lib/theme.svelte.js';

	const labels: Record<ThemePreference, string> = {
		system: 'Motyw systemowy',
		light: 'Motyw jasny',
		dark: 'Motyw ciemny'
	};
</script>

<button
	type="button"
	class:dark={theme.resolved === 'dark'}
	aria-label="{labels[theme.preference]} — przełącz"
	title={labels[theme.preference]}
	onclick={cycleTheme}
>
	{#if theme.preference === 'system'}
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<rect x="3" y="4" width="18" height="12" rx="2" />
			<path d="M8 20h8M12 16v4" />
		</svg>
	{:else if theme.preference === 'light'}
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
			/>
		</svg>
	{:else}
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M20.5 14.5A8 8 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5z" />
		</svg>
	{/if}
</button>

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

	button.dark {
		color: var(--text);
	}

	svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
