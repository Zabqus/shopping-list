<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: { open?: boolean; title?: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	aria-label={title}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && (open = false)}
>
	<div class="panel">
		<!-- Fokus na uchwycie, nie na pierwszym polu — inaczej na telefonie od razu wyskakuje klawiatura. -->
		<!-- svelte-ignore a11y_autofocus -->
		<div class="handle" tabindex="-1" autofocus></div>
		{#if title}<h2>{title}</h2>{/if}
		{@render children()}
	</div>
</dialog>

<style>
	.sheet {
		width: 100%;
		max-width: 560px;
		max-height: calc(100dvh - 2rem);
		margin: auto auto 0;
		padding: 0;
		border: 0;
		border-radius: 24px 24px 0 0;
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-lg);
		overscroll-behavior: contain;
	}

	.sheet[open] {
		animation: up 0.28s cubic-bezier(0.2, 0.9, 0.3, 1);
	}

	.sheet::backdrop {
		background: rgb(10 12 16 / 0.5);
		backdrop-filter: blur(2px);
	}

	.sheet[open]::backdrop {
		animation: fade 0.2s ease-out;
	}

	.panel {
		padding: 0.5rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom));
	}

	.handle {
		width: 40px;
		height: 5px;
		margin: 0 auto 0.75rem;
		border-radius: 99px;
		background: var(--border-strong);
		outline: none;
	}

	h2 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
		font-weight: 750;
		letter-spacing: -0.01em;
	}

	@keyframes up {
		from {
			transform: translateY(100%);
		}
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet[open],
		.sheet[open]::backdrop {
			animation: none;
		}
	}
</style>
