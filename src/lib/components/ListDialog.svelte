<script lang="ts">
	import type { ShoppingList } from '#lib/types.js';
	import BottomSheet from './BottomSheet.svelte';

	const ICONS = ['🛒', '🏠', '🧴', '🔨', '🌱', '🎉', '🍖', '💊', '🐾', '👶', '🎁', '📝'];

	let {
		onsave,
		ondelete
	}: {
		onsave: (data: { id: number | null; name: string; icon: string }) => void;
		ondelete: (list: ShoppingList) => void;
	} = $props();

	let open = $state(false);
	let editing = $state<ShoppingList | null>(null);
	let name = $state('');
	let icon = $state(ICONS[0]);
	let canDelete = $state(false);

	/** Otwiera panel: bez argumentu — nowa lista, z listą — edycja. */
	export function show(list: ShoppingList | null = null, deletable = false) {
		editing = list;
		name = list?.name ?? '';
		icon = list?.icon ?? ICONS[0];
		canDelete = deletable;
		open = true;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		onsave({ id: editing?.id ?? null, name: name.trim(), icon });
		open = false;
	}

	function remove() {
		if (!editing) return;
		if (!confirm(`Usunąć listę „${editing.name}” razem ze wszystkimi produktami?`)) return;
		ondelete(editing);
		open = false;
	}
</script>

<BottomSheet bind:open title={editing ? 'Edytuj listę' : 'Nowa lista'}>
	<form onsubmit={save}>
		<input bind:value={name} maxlength="60" placeholder="Nazwa, np. Budowlane" aria-label="Nazwa listy" required />

		<div class="icons" role="radiogroup" aria-label="Ikona">
			{#each ICONS as option (option)}
				<button
					type="button"
					role="radio"
					aria-checked={icon === option}
					class:selected={icon === option}
					onclick={() => (icon = option)}>{option}</button
				>
			{/each}
		</div>

		<div class="buttons" class:with-delete={editing && canDelete}>
			{#if editing && canDelete}
				<button type="button" class="delete" onclick={remove}>Usuń listę</button>
			{/if}
			<button type="submit" class="save" disabled={!name.trim()}>
				{editing ? 'Zapisz' : 'Utwórz listę'}
			</button>
		</div>
	</form>
</BottomSheet>

<style>
	form {
		display: grid;
		gap: 1rem;
	}

	input {
		min-height: 50px;
		padding: 0 0.9rem;
		border: 1.5px solid var(--border);
		border-radius: 14px;
		background: var(--bg);
		color: var(--text);
		font-size: 17px;
		font-weight: 600;
		outline: none;
	}

	input:focus {
		border-color: var(--accent);
	}

	button {
		border: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
	}

	.icons {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.4rem;
	}

	.icons button {
		height: 48px;
		border: 2px solid transparent;
		border-radius: 14px;
		background: var(--chip);
		font-size: 1.4rem;
	}

	.icons button.selected {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.buttons {
		display: grid;
		gap: 0.5rem;
	}

	.buttons.with-delete {
		grid-template-columns: auto 1fr;
	}

	.buttons button {
		height: 52px;
		padding: 0 1.25rem;
		border-radius: 16px;
		font-weight: 700;
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
