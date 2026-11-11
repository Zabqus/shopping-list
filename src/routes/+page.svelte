<script lang="ts">
	let { data } = $props();
</script>

<main>
	<h1>🛒 Zakupy</h1>

	<ul>
		{#each data.lists as list (list.id)}
			<li>
				<span class="icon">{list.icon ?? '📝'}</span>
				{list.name}
			</li>
		{:else}
			<li class="empty">Brak list</li>
		{/each}
	</ul>
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: calc(var(--space) + env(safe-area-inset-top)) var(--space) var(--space);
	}

	h1 {
		font-size: 1.6rem;
		margin: 0 0 var(--space);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: var(--tap);
		padding: 0.5rem var(--space);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.empty {
		color: var(--text-muted);
	}
</style>
