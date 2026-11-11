<script lang="ts">
	import type { ShoppingList } from '#lib/types.js';
	import BottomSheet from './BottomSheet.svelte';

	let {
		open = $bindable(false),
		lists,
		currentId,
		onselect,
		oncreate,
		onedit
	}: {
		open?: boolean;
		lists: ShoppingList[];
		currentId: number;
		onselect: (list: ShoppingList) => void;
		oncreate: () => void;
		onedit: (list: ShoppingList) => void;
	} = $props();

	const count = (n: number | undefined) =>
		!n ? 'pusta' : n === 1 ? '1 produkt' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? `${n} produkty` : `${n} produktów`;
</script>

<BottomSheet bind:open title="Twoje listy">
	<ul>
		{#each lists as list (list.id)}
			<li class:current={list.id === currentId}>
				<button type="button" class="select" onclick={() => onselect(list)}>
					<span class="icon" aria-hidden="true">{list.icon ?? '📝'}</span>
					<span class="text">
						<span class="name">{list.name}</span>
						<span class="count">{count(list.open_count)}</span>
					</span>
					{#if list.id === currentId}
						<svg class="tick" viewBox="0 0 24 24" aria-label="Otwarta"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
					{/if}
				</button>
				<button type="button" class="edit" aria-label="Edytuj listę {list.name}" onclick={() => onedit(list)}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></svg>
				</button>
			</li>
		{/each}
	</ul>

	<button type="button" class="new" onclick={oncreate}>
		<span aria-hidden="true">＋</span> Nowa lista
	</button>
</BottomSheet>

<style>
	ul {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}

	li {
		display: flex;
		align-items: stretch;
		border-radius: 16px;
		background: var(--bg);
		border: 2px solid transparent;
	}

	li.current {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	button {
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	.select {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		min-height: 62px;
		padding: 0.5rem 0.9rem;
		text-align: left;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		background: var(--surface);
		font-size: 1.35rem;
	}

	.text {
		flex: 1;
		min-width: 0;
		display: grid;
	}

	.name {
		font-weight: 700;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.count {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.tick {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: var(--accent);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.edit {
		width: 52px;
		display: grid;
		place-items: center;
		color: var(--text-muted);
	}

	.edit svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linejoin: round;
	}

	.new {
		width: 100%;
		height: 52px;
		border: 2px dashed var(--border-strong);
		border-radius: 16px;
		font-weight: 700;
		color: var(--text-muted);
	}
</style>
