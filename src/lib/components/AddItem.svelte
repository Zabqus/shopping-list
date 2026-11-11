<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/api.js';
	import { quantityPrefix } from '#lib/format.js';
	import { parseItem } from '#lib/parse.js';
	import type { Category, Suggestion } from '#lib/types.js';

	let {
		listId,
		categories,
		onadd
	}: {
		listId: number;
		categories: Category[];
		onadd: (text: string) => void;
	} = $props();

	let input: HTMLInputElement;
	let text = $state('');
	let suggestions = $state<Suggestion[]>([]);
	let highlighted = $state(-1);
	let open = $state(false);

	const icon = (id: number | null) => categories.find((c) => c.id === id)?.icon ?? '📦';

	// Autofocus tylko na urządzeniach z myszką — na telefonie od razu wyskakiwałaby klawiatura.
	onMount(() => {
		if (matchMedia('(pointer: fine)').matches) input.focus();
	});

	// Podpowiedzi: szukamy po samej nazwie, bez ilości („2 ml” → „ml”), z małym opóźnieniem.
	$effect(() => {
		const query = parseItem(text).name.trim();
		const list = listId;
		if (query.length < 1) {
			suggestions = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				suggestions = await api.suggest(query, list, controller.signal);
				highlighted = -1;
			} catch {
				// przerwane lub brak sieci — podpowiedzi nie są krytyczne
			}
		}, 120);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	function submit(value: string) {
		const trimmed = value.trim();
		if (!trimmed) return;
		onadd(trimmed);
		text = '';
		suggestions = [];
		open = false;
		input.focus();
	}

	function pick(suggestion: Suggestion) {
		const { quantity, unit } = parseItem(text);
		submit(quantityPrefix(quantity, unit) + suggestion.name);
	}

	function onkeydown(event: KeyboardEvent) {
		const visible = open && suggestions.length > 0;
		if (event.key === 'ArrowDown' && visible) {
			event.preventDefault();
			highlighted = (highlighted + 1) % suggestions.length;
		} else if (event.key === 'ArrowUp' && visible) {
			event.preventDefault();
			highlighted = highlighted <= 0 ? suggestions.length - 1 : highlighted - 1;
		} else if (event.key === 'Escape') {
			open = false;
			highlighted = -1;
		} else if (event.key === 'Enter') {
			event.preventDefault();
			if (visible && highlighted >= 0) pick(suggestions[highlighted]);
			else submit(text);
		}
	}
</script>

<form
	class="add"
	role="search"
	onsubmit={(e) => {
		e.preventDefault();
		submit(text);
	}}
>
	<div class="field">
		<input
			bind:this={input}
			bind:value={text}
			{onkeydown}
			oninput={() => (open = true)}
			onfocus={() => (open = true)}
			onblur={() => setTimeout(() => (open = false), 150)}
			type="text"
			placeholder="Dodaj produkt, np. 2 mleko"
			aria-label="Nowy produkt"
			autocomplete="off"
			autocapitalize="sentences"
			enterkeyhint="done"
			role="combobox"
			aria-expanded={open && suggestions.length > 0}
			aria-controls="suggestions"
			aria-activedescendant={highlighted >= 0 ? `suggestion-${highlighted}` : undefined}
		/>
		<button type="submit" class="submit" aria-label="Dodaj" disabled={!text.trim()}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
		</button>
	</div>

	{#if open && suggestions.length > 0}
		<ul id="suggestions" class="suggestions" role="listbox">
			{#each suggestions as suggestion, i (suggestion.name)}
				<!-- Klawiatura obsługiwana w polu (combobox: strzałki + Enter), stąd brak onkeydown tutaj. -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id="suggestion-{i}"
					role="option"
					aria-selected={i === highlighted}
					class:active={i === highlighted}
					onpointerdown={(e) => e.preventDefault()}
					onclick={() => pick(suggestion)}
				>
					<span aria-hidden="true">{icon(suggestion.category_id)}</span>
					{suggestion.name}
				</li>
			{/each}
		</ul>
	{/if}
</form>

<style>
	.add {
		position: relative;
	}

	.field {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
		min-width: 0;
		min-height: 50px;
		padding: 0 1rem;
		border: 1.5px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 17px;
		outline: none;
		transition: border-color 0.15s;
	}

	input:focus {
		border-color: var(--accent);
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.submit {
		flex: none;
		display: grid;
		place-items: center;
		width: 50px;
		border: 0;
		border-radius: var(--radius);
		background: var(--accent);
		color: var(--accent-contrast);
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.submit:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.submit svg {
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.suggestions {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		right: 0;
		z-index: 10;
		margin: 0;
		padding: 0.35rem;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: var(--tap);
		padding: 0 0.75rem;
		border-radius: 8px;
		cursor: pointer;
	}

	li.active,
	li:hover {
		background: var(--chip);
	}
</style>
