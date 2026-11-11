<script lang="ts">
	import type { Category, Item, ItemPatch } from '#lib/types.js';
	import { categoryHue } from '#lib/categoryStyle.js';
	import BottomSheet from './BottomSheet.svelte';

	const UNITS = [null, 'szt', 'kg', 'g', 'l', 'ml', 'op'] as const;

	let {
		item,
		categories,
		onsave,
		ondelete,
		onclose
	}: {
		item: Item | null;
		categories: Category[];
		onsave: (item: Item, patch: ItemPatch) => void;
		ondelete: (item: Item) => void;
		onclose: () => void;
	} = $props();

	let open = $state(false);
	let name = $state('');
	let quantity = $state<number | null>(null);
	let unit = $state<string | null>(null);
	let note = $state('');
	let categoryId = $state<number | null>(null);

	// Nowy produkt do edycji → wypełniamy formularz i otwieramy panel.
	$effect(() => {
		if (!item) return;
		name = item.name;
		quantity = item.quantity;
		unit = item.unit;
		note = item.note ?? '';
		categoryId = item.category_id;
		open = true;
	});

	$effect(() => {
		if (!open && item) onclose();
	});

	const step = $derived(unit === 'g' || unit === 'ml' ? 100 : unit === 'kg' || unit === 'l' ? 0.5 : 1);
	const round = (n: number) => Math.round(n * 1000) / 1000;

	function inc() {
		quantity = round((quantity ?? 0) + step);
	}

	function dec() {
		if (quantity === null) return;
		const next = round(quantity - step);
		quantity = next > 0 ? next : null;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!item || !name.trim()) return;

		const patch: ItemPatch = {};
		if (name.trim() !== item.name) patch.name = name.trim();
		if (quantity !== item.quantity) patch.quantity = quantity;
		if (unit !== item.unit) patch.unit = unit;
		if ((note.trim() || null) !== item.note) patch.note = note.trim() || null;
		if (categoryId !== item.category_id) patch.category_id = categoryId;

		if (Object.keys(patch).length > 0) onsave(item, patch);
		open = false;
	}

	function remove() {
		if (!item) return;
		ondelete(item);
		open = false;
	}
</script>

<BottomSheet bind:open title="Edytuj produkt">
	<form onsubmit={save}>
		<input class="name" bind:value={name} maxlength="200" aria-label="Nazwa" autocomplete="off" />

		<div class="field">
			<span class="label">Ilość</span>
			<div class="stepper">
				<button type="button" onclick={dec} aria-label="Mniej" disabled={quantity === null}>−</button>
				<input
					type="text"
					inputmode="decimal"
					aria-label="Ilość"
					placeholder="—"
					value={quantity === null ? '' : String(quantity).replace('.', ',')}
					onchange={(e) => {
						const v = Number(e.currentTarget.value.replace(',', '.'));
						quantity = e.currentTarget.value.trim() && Number.isFinite(v) && v > 0 ? round(v) : null;
					}}
				/>
				<button type="button" onclick={inc} aria-label="Więcej">+</button>
			</div>
			<div class="chips" role="radiogroup" aria-label="Jednostka">
				{#each UNITS as option (option)}
					<button
						type="button"
						role="radio"
						aria-checked={unit === option}
						class:selected={unit === option}
						onclick={() => (unit = option)}>{option ?? '×'}</button
					>
				{/each}
			</div>
		</div>

		<label class="field">
			<span class="label">Notatka</span>
			<input class="note" bind:value={note} maxlength="500" placeholder="np. bez laktozy, ta z promocji" />
		</label>

		<div class="field">
			<span class="label">Kategoria</span>
			<div class="categories" role="radiogroup" aria-label="Kategoria">
				{#each categories as c (c.id)}
					<button
						type="button"
						role="radio"
						aria-checked={categoryId === c.id}
						class:selected={categoryId === c.id}
						style:--hue={categoryHue(c)}
						onclick={() => (categoryId = c.id)}
					>
						<span class="emoji" aria-hidden="true">{c.icon}</span>
						<span class="cat-name">{c.name}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="buttons">
			<button type="button" class="delete" onclick={remove}>Usuń</button>
			<button type="submit" class="save" disabled={!name.trim()}>Zapisz</button>
		</div>
	</form>
</BottomSheet>

<style>
	form {
		display: grid;
		gap: 1.1rem;
	}

	input {
		width: 100%;
		min-height: 48px;
		padding: 0 0.9rem;
		border: 1.5px solid var(--border);
		border-radius: 14px;
		background: var(--bg);
		color: var(--text);
		font-size: 17px;
		outline: none;
	}

	input:focus {
		border-color: var(--accent);
	}

	.name {
		font-size: 1.15rem;
		font-weight: 650;
	}

	.field {
		display: grid;
		gap: 0.5rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	button {
		border: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.stepper {
		display: grid;
		grid-template-columns: 52px 1fr 52px;
		gap: 0.5rem;
	}

	.stepper button {
		height: 48px;
		border-radius: 14px;
		background: var(--chip);
		font-size: 1.5rem;
		font-weight: 500;
	}

	.stepper button:disabled {
		opacity: 0.4;
	}

	.stepper input {
		text-align: center;
		font-size: 1.2rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	.chips {
		display: flex;
		gap: 0.3rem;
	}

	.chips button {
		flex: 1;
		min-width: 0;
		height: 40px;
		padding: 0;
		border-radius: 99px;
		background: var(--chip);
		font-size: 0.95rem;
		font-weight: 600;
	}

	.chips button.selected {
		background: var(--text);
		color: var(--bg);
	}

	.categories {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 0.4rem;
	}

	.categories button {
		display: grid;
		justify-items: center;
		gap: 0.15rem;
		padding: 0.55rem 0.25rem;
		border: 2px solid transparent;
		border-radius: 14px;
		background: hsl(var(--hue) 70% var(--tint-l));
	}

	.categories button.selected {
		border-color: hsl(var(--hue) 55% 50%);
	}

	.emoji {
		font-size: 1.4rem;
	}

	.cat-name {
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1.15;
		text-align: center;
		color: hsl(var(--hue) 45% var(--tint-text-l));
	}

	.buttons {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.buttons button {
		height: 52px;
		padding: 0 1.25rem;
		border-radius: 16px;
		font-weight: 700;
		font-size: 1rem;
	}

	.delete {
		background: var(--danger-soft);
		color: var(--danger);
	}

	.save {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.save:disabled {
		opacity: 0.5;
	}
</style>
