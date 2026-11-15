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
	let frequent = $state<Suggestion[]>([]);
	let focused = $state(false);
	let keyboard = $state(0);

	const category = (id: number | null) => categories.find((c) => c.id === id);
	const parsed = $derived(parseItem(text));
	const showSuggestions = $derived(focused && suggestions.length > 0);
	const showBuyAgain = $derived(focused && !parsed.name.trim() && frequent.length > 0);

	// Podpowiedzi przy pisaniu; „Kup znowu” gdy pole puste i ma fokus.
	$effect(() => {
		const query = parsed.name.trim();
		const list = listId;
		const isFocused = focused;
		const controller = new AbortController();

		if (query) {
			frequent = [];
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
		}

		suggestions = [];
		if (!isFocused) {
			frequent = [];
			return;
		}

		const timer = setTimeout(async () => {
			try {
				frequent = await api.frequent(list, controller.signal);
			} catch {
				// j.w.
			}
		}, 80);
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

	function buyAgain(suggestion: Suggestion) {
		frequent = frequent.filter((f) => f.name !== suggestion.name);
		navigator.vibrate?.(10);
		submit(suggestion.name);
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
	{:else if showBuyAgain}
		<div class="buy-again" role="listbox" aria-label="Kup znowu">
			<span class="buy-again-label">Kup znowu</span>
			<div class="chips">
				{#each frequent as suggestion (suggestion.name)}
					{@const c = category(suggestion.category_id)}
					<button
						type="button"
						role="option"
						aria-selected="false"
						style:--hue={categoryHue(c)}
						onpointerdown={(e) => e.preventDefault()}
						onclick={() => buyAgain(suggestion)}
					>
						<span class="chip-emoji" aria-hidden="true">{c?.icon ?? '📦'}</span>
						{suggestion.name}
					</button>
				{/each}
			</div>
		</div>
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
	.suggestions,
	.buy-again {
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

	/* „Kup znowu” — poziome chipy nad klawiaturą */
	.buy-again {
		padding: 0 0 0.55rem;
	}

	.buy-again-label {
		display: block;
		margin: 0 0.15rem 0.35rem;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.chips {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
		padding: 0.05rem 0.05rem 0.15rem;
	}

	.chips::-webkit-scrollbar {
		display: none;
	}

	.chips button {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 40px;
		padding: 0 0.85rem 0 0.45rem;
		border: 0;
		border-radius: 99px;
		background: var(--surface);
		color: var(--text);
		font: inherit;
		font-size: 0.95rem;
		font-weight: 600;
		white-space: nowrap;
		cursor: pointer;
		box-shadow: var(--shadow-sm);
	}

	.chips button:active {
		background: var(--surface-pressed);
		transform: scale(0.96);
	}

	.chip-emoji {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: hsl(var(--hue) 70% var(--tint-l));
		font-size: 0.9rem;
	}
</style>
