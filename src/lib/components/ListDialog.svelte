<script lang="ts">
	import type { ShoppingList } from '#lib/types.js';

	const ICONS = ['🛒', '🏠', '🧴', '🔨', '🌱', '🎉', '🍖', '💊', '🐾', '👶', '🎁', '📝'];

	let {
		onsave,
		ondelete
	}: {
		onsave: (data: { id: number | null; name: string; icon: string }) => void;
		ondelete: (list: ShoppingList) => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let editing = $state<ShoppingList | null>(null);
	let name = $state('');
	let icon = $state(ICONS[0]);
	let canDelete = $state(false);

	/** Otwiera okno: bez argumentu — nowa lista, z listą — edycja. */
	export function show(list: ShoppingList | null = null, deletable = false) {
		editing = list;
		name = list?.name ?? '';
		icon = list?.icon ?? ICONS[0];
		canDelete = deletable;
		dialog.showModal();
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!name.trim()) return;
		onsave({ id: editing?.id ?? null, name: name.trim(), icon });
		dialog.close();
	}

	function remove() {
		if (!editing) return;
		if (!confirm(`Usunąć listę „${editing.name}” razem ze wszystkimi produktami?`)) return;
		ondelete(editing);
		dialog.close();
	}
</script>

<dialog bind:this={dialog} onclick={(e) => e.target === dialog && dialog.close()}>
	<form onsubmit={save}>
		<h2>{editing ? 'Edytuj listę' : 'Nowa lista'}</h2>

		<label class="name">
			<span>Nazwa</span>
			<!-- svelte-ignore a11y_autofocus -->
			<input bind:value={name} maxlength="60" placeholder="np. Budowlane" required autofocus />
		</label>

		<fieldset>
			<legend>Ikona</legend>
			<div class="icons">
				{#each ICONS as option (option)}
					<label class:selected={icon === option}>
						<input type="radio" name="icon" value={option} bind:group={icon} />
						<span aria-hidden="true">{option}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<div class="actions">
			{#if editing && canDelete}
				<button type="button" class="danger" onclick={remove}>Usuń listę</button>
			{/if}
			<span class="spacer"></span>
			<button type="button" onclick={() => dialog.close()}>Anuluj</button>
			<button type="submit" class="primary" disabled={!name.trim()}>Zapisz</button>
		</div>
	</form>
</dialog>

<style>
	dialog {
		width: min(calc(100% - 2rem), 420px);
		padding: 0;
		border: 0;
		border-radius: 16px;
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}

	form {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.name {
		display: grid;
		gap: 0.35rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.name input {
		min-height: var(--tap);
		padding: 0 0.85rem;
		border: 1.5px solid var(--border);
		border-radius: 10px;
		background: var(--bg);
		color: var(--text);
		font-size: 17px;
		outline: none;
	}

	.name input:focus {
		border-color: var(--accent);
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		margin-bottom: 0.35rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.icons {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.35rem;
	}

	.icons label {
		display: grid;
		place-items: center;
		height: var(--tap);
		border: 1.5px solid transparent;
		border-radius: 10px;
		background: var(--bg);
		font-size: 1.3rem;
		cursor: pointer;
	}

	.icons label.selected {
		border-color: var(--accent);
	}

	.icons label:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.icons input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.spacer {
		flex: 1;
	}

	button {
		min-height: var(--tap);
		padding: 0 1rem;
		border: 0;
		border-radius: 10px;
		background: var(--chip);
		font-weight: 600;
		cursor: pointer;
	}

	.primary {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.primary:disabled {
		opacity: 0.5;
	}

	.danger {
		background: none;
		color: var(--danger);
		padding: 0 0.5rem;
	}
</style>
