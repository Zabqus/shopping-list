<script lang="ts">
	import type { ShoppingList } from '#lib/types.js';

	let {
		lists,
		currentId,
		oncreate
	}: { lists: ShoppingList[]; currentId: number; oncreate: () => void } = $props();
</script>

<nav class="tabs" aria-label="Listy">
	{#each lists as list (list.id)}
		<a
			href="/l/{list.id}"
			class:active={list.id === currentId}
			aria-current={list.id === currentId ? 'page' : undefined}
			data-sveltekit-replacestate
		>
			<span aria-hidden="true">{list.icon ?? '📝'}</span>
			{list.name}
		</a>
	{/each}
	<button type="button" class="new" onclick={oncreate} aria-label="Nowa lista">＋</button>
</nav>

<style>
	.tabs {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 calc(var(--space) * -1);
		padding: 0 var(--space);
	}

	.tabs::-webkit-scrollbar {
		display: none;
	}

	a,
	button {
		flex: none;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 38px;
		padding: 0 0.9rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--text);
		font-size: 0.95rem;
		text-decoration: none;
		white-space: nowrap;
		cursor: pointer;
	}

	a.active {
		background: var(--text);
		border-color: var(--text);
		color: var(--bg);
		font-weight: 600;
	}

	.new {
		padding: 0;
		width: 38px;
		justify-content: center;
		color: var(--text-muted);
		font-size: 1.1rem;
	}
</style>
