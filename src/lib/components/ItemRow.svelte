<script lang="ts">
	import type { Category, Item } from '#lib/types.js';
	import { formatQuantity } from '#lib/format.js';

	let {
		item,
		categories,
		ontoggle,
		ondelete,
		oncategory
	}: {
		item: Item;
		categories: Category[];
		ontoggle: (item: Item) => void;
		ondelete: (item: Item) => void;
		oncategory: (item: Item, categoryId: number) => void;
	} = $props();

	const category = $derived(categories.find((c) => c.id === item.category_id));
	const quantity = $derived(formatQuantity(item.quantity, item.unit));
</script>

<div class="row" class:checked={item.checked}>
	<button class="main" aria-pressed={item.checked} onclick={() => ontoggle(item)}>
		<span class="box" aria-hidden="true">
			{#if item.checked}
				<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
			{/if}
		</span>
		<span class="text">
			<span class="name">{item.name}</span>
			{#if item.note}<span class="note">{item.note}</span>{/if}
		</span>
		{#if quantity}<span class="qty">{quantity}</span>{/if}
	</button>

	<label class="category" title="Kategoria: {category?.name ?? 'brak'}">
		<span aria-hidden="true">{category?.icon ?? '📦'}</span>
		<select
			aria-label="Zmień kategorię produktu {item.name}"
			value={item.category_id}
			onchange={(e) => oncategory(item, Number(e.currentTarget.value))}
		>
			{#each categories as c (c.id)}
				<option value={c.id}>{c.icon} {c.name}</option>
			{/each}
		</select>
	</label>

	<button class="delete" aria-label="Usuń {item.name}" onclick={() => ondelete(item)}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
	</button>
</div>

<style>
	.row {
		display: flex;
		align-items: stretch;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	button {
		border: 0;
		background: none;
		cursor: pointer;
		padding: 0;
	}

	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 52px;
		padding: 0.5rem 0 0.5rem var(--space);
		text-align: left;
	}

	.box {
		flex: none;
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 2px solid var(--border-strong);
		border-radius: 50%;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.box svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: var(--accent-contrast);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.checked .box {
		background: var(--accent);
		border-color: var(--accent);
	}

	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.name {
		overflow-wrap: anywhere;
	}

	.note {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.qty {
		flex: none;
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: var(--chip);
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.checked .name {
		color: var(--text-muted);
		text-decoration: line-through;
	}

	.checked .qty {
		opacity: 0.5;
	}

	.category {
		position: relative;
		flex: none;
		display: grid;
		place-items: center;
		width: var(--tap);
		font-size: 1.1rem;
		cursor: pointer;
		opacity: 0.75;
	}

	.checked .category {
		opacity: 0.4;
	}

	/* Natywny select na całej ikonie — na telefonie otwiera systemowy wybór. */
	.category select {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
		font-size: 16px;
	}

	.category:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: -4px;
		border-radius: 8px;
	}

	.delete {
		flex: none;
		display: grid;
		place-items: center;
		width: var(--tap);
		margin-right: 0.25rem;
		color: var(--text-muted);
	}

	.delete svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
	}

	@media (hover: hover) {
		.main:hover .box {
			border-color: var(--accent);
		}

		.delete:hover {
			color: var(--danger);
		}
	}
</style>
