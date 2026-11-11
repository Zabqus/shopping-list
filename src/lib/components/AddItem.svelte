<script lang="ts">
	import { api } from '#lib/api.js';
	import { categoryHue } from '#lib/categoryStyle.js';
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
	let focused = $state(false);
	let keyboard = $state(0);

	const category = (id: number | null) => categories.find((c) => c.id === id);
	const parsed = $derived(parseItem(text));
	const showSuggestions = $derived(focused && suggestions.length > 0);

	// Podpowiedzi: szukamy po samej nazwie, bez ilości („2 ml” → „ml”), z małym opóźnieniem.
	$effect(() => {
		const query = parsed.name.trim();
		const list = listId;
		if (!query) {
			suggestions = [];
			return;
		}
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				suggestions = await api.suggest(query, list, controller.signal);
			} catch {
				// przerwane lub brak sieci — podpowiedzi nie są krytyczne
			}
		}, 120);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});

	// iOS nie zmniejsza układu strony przy klawiaturze — przesuwamy pasek o wysokość klawiatury.
	$effect(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		const update = () => (keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});

	function submit(value: string) {
		const trimmed = value.trim();
		if (!trimmed) return;
		onadd(trimmed);
		text = '';
		suggestions = [];
		input.focus(); // klawiatura zostaje — można od razu wpisać kolejny produkt
	}

	function pick(suggestion: Suggestion) {
		submit(quantityPrefix(parsed.quantity, parsed.unit) + suggestion.name);
	}
</script>

<div class="bar" style:--keyboard="{keyboard}px">
	{#if showSuggestions}
		<ul class="suggestions" role="listbox" aria-label="Podpowiedzi">
			{#each suggestions as suggestion (suggestion.name)}
				{@const c = category(suggestion.category_id)}
				<li role="option" aria-selected="false">
					<button
						type="button"
						style:--hue={categoryHue(c)}
						onpointerdown={(e) => e.preventDefault()}
						onclick={() => pick(suggestion)}
					>
						<span class="emoji" aria-hidden="true">{c?.icon ?? '📦'}</span>
						<span class="s-name">{suggestion.name}</span>
						{#if parsed.quantity !== null}
							<span class="s-qty">{quantityPrefix(parsed.quantity, parsed.unit).trim()}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			submit(text);
		}}
	>
		<input
			bind:this={input}
			bind:value={text}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			type="text"
			placeholder="Dodaj produkt…"
			aria-label="Nowy produkt, np. 2 mleko"
			autocomplete="off"
			autocapitalize="sentences"
			enterkeyhint="enter"
		/>
		<button type="submit" class="submit" aria-label="Dodaj" disabled={!text.trim()}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
		</button>
	</form>
</div>

<style>
	.bar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: var(--keyboard, 0px);
		z-index: 15;
		padding: 0.6rem 0.75rem calc(0.6rem + env(safe-area-inset-bottom));
		background: var(--bar-bg);
		backdrop-filter: saturate(1.6) blur(16px);
		-webkit-backdrop-filter: saturate(1.6) blur(16px);
		border-top: 1px solid var(--border);
	}

	form,
	.suggestions {
		max-width: 616px;
		margin: 0 auto;
	}

	form {
		display: flex;
		gap: 0.5rem;
	}

	input {
		flex: 1;
		min-width: 0;
		height: 52px;
		padding: 0 1.1rem;
		border: 1.5px solid var(--border);
		border-radius: 99px;
		background: var(--surface);
		color: var(--text);
		font-size: 17px;
		outline: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 4px var(--accent-soft);
	}

	input::placeholder {
		color: var(--text-muted);
	}

	.submit {
		flex: none;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border: 0;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-contrast);
		cursor: pointer;
		box-shadow: 0 4px 14px var(--accent-shadow);
		transition:
			transform 0.12s,
			opacity 0.15s;
	}

	.submit:active {
		transform: scale(0.92);
	}

	.submit:disabled {
		opacity: 0.35;
		box-shadow: none;
	}

	.submit svg {
		width: 26px;
		height: 26px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.6;
		stroke-linecap: round;
	}

	/* Podpowiedzi nad polem, najlepsza najbliżej kciuka */
	.suggestions {
		display: flex;
		flex-direction: column-reverse;
		gap: 0.35rem;
		list-style: none;
		padding: 0 0 0.6rem;
	}

	.suggestions button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 50px;
		padding: 0 1rem;
		border: 0;
		border-radius: 16px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
	}

	.suggestions button:active {
		background: var(--surface-pressed);
	}

	.emoji {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
		background: hsl(var(--hue) 70% var(--tint-l));
		font-size: 1.05rem;
	}

	.s-name {
		flex: 1;
		font-weight: 600;
	}

	.s-qty {
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-muted);
	}
</style>
