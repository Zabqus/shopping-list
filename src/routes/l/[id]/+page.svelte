<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { api, ApiError } from '#lib/api.js';
	import { categoryHue } from '#lib/categoryStyle.js';
	import { connectLive } from '#lib/live.svelte.js';
	import type { Category, Item, ItemPatch, ShoppingList } from '#lib/types.js';
	import AddItem from '#lib/components/AddItem.svelte';
	import EditItemSheet from '#lib/components/EditItemSheet.svelte';
	import ItemRow from '#lib/components/ItemRow.svelte';
	import ListDialog from '#lib/components/ListDialog.svelte';
	import ListsSheet from '#lib/components/ListsSheet.svelte';
	import Toast, { type ToastData } from '#lib/components/Toast.svelte';
	import WakeLockButton from '#lib/components/WakeLockButton.svelte';

	let { data } = $props();

	// Lokalne kopie danych z serwera — zmieniamy je optymistycznie,
	// a po invalidateAll() (live sync) wracają do stanu z serwera.
	let items = $derived(data.items);
	const list = $derived(data.list);

	// ───────────── Grupowanie ─────────────

	const NO_CATEGORY: Category = { id: -1, name: 'Bez kategorii', icon: '📦', position: Infinity };

	const groups = $derived.by(() => {
		const byCategory = new Map<number, Item[]>();
		for (const item of items) {
			if (item.checked) continue;
			const key = data.categories.some((c) => c.id === item.category_id) ? item.category_id! : -1;
			byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
		}
		return [...data.categories, NO_CATEGORY]
			.filter((c) => byCategory.has(c.id))
			.map((category) => ({
				category,
				hue: categoryHue(category),
				items: byCategory.get(category.id)!.sort((a, b) => a.position - b.position || a.id - b.id)
			}));
	});

	const checked = $derived(
		items.filter((i) => i.checked).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''))
	);
	const total = $derived(items.length);
	const done = $derived(checked.length);
	const allDone = $derived(total > 0 && done === total);

	let showChecked = $state(true);

	// ───────────── Podpowiedź o gestach (raz) ─────────────

	const TIP_KEY = 'zakupy:tip-gestures';
	let showTip = $state(false);

	onMount(() => {
		try {
			showTip = localStorage.getItem(TIP_KEY) !== 'seen';
		} catch {
			showTip = false;
		}
	});

	function hideTip() {
		showTip = false;
		try {
			localStorage.setItem(TIP_KEY, 'seen');
		} catch {
			// bez localStorage podpowiedź wróci po odświeżeniu — nic groźnego
		}
	}

	// ───────────── Toast ─────────────

	let toast = $state<ToastData | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | undefined;

	function showToast(data: Omit<ToastData, 'id'>, duration = 5000) {
		clearTimeout(toastTimer);
		toast = { ...data, id: Date.now() };
		toastTimer = setTimeout(() => (toast = null), duration);
	}

	function fail(err: unknown) {
		showToast({ message: err instanceof ApiError ? err.message : 'Coś poszło nie tak', kind: 'error' });
		invalidateAll();
	}

	// ───────────── Operacje na produktach ─────────────

	const upsert = (item: Item) => {
		items = items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item];
	};

	async function addItem(text: string) {
		try {
			upsert(await api.addItem(list.id, text));
		} catch (err) {
			fail(err);
		}
	}

	async function toggle(item: Item) {
		const next = !item.checked;
		upsert({ ...item, checked: next, checked_at: next ? new Date().toISOString() : null });
		try {
			upsert(await api.updateItem(item.id, { checked: next }));
		} catch (err) {
			fail(err);
		}
	}

	async function saveItem(item: Item, patch: ItemPatch) {
		upsert({ ...item, ...patch });
		try {
			upsert(await api.updateItem(item.id, patch));
		} catch (err) {
			fail(err);
		}
	}

	async function restore(removed: Item[], listId: number) {
		try {
			const restored = await api.restoreItems(listId, removed);
			if (listId === list.id) restored.forEach(upsert);
		} catch (err) {
			fail(err);
		}
	}

	async function remove(item: Item) {
		items = items.filter((i) => i.id !== item.id);
		try {
			const removed = await api.deleteItem(item.id);
			showToast({
				message: `Usunięto „${removed.name}”`,
				actionLabel: 'Cofnij',
				onaction: () => restore([removed], removed.list_id)
			});
		} catch (err) {
			fail(err);
		}
	}

	async function clearChecked() {
		const listId = list.id;
		items = items.filter((i) => !i.checked);
		try {
			const removed = await api.clearChecked(listId);
			if (removed.length === 0) return;
			showToast({
				message: `Usunięto ${removed.length} ${plural(removed.length, 'produkt', 'produkty', 'produktów')}`,
				actionLabel: 'Cofnij',
				onaction: () => restore(removed, listId)
			});
		} catch (err) {
			fail(err);
		}
	}

	function plural(n: number, one: string, few: string, many: string) {
		if (n === 1) return one;
		const mod10 = n % 10;
		const mod100 = n % 100;
		return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many;
	}

	let editing = $state<Item | null>(null);

	// ───────────── Listy ─────────────

	let listsOpen = $state(false);
	let listDialog: ListDialog;

	async function saveList({ id, name, icon }: { id: number | null; name: string; icon: string }) {
		try {
			if (id === null) {
				const created = await api.createList(name, icon);
				await goto(`/l/${created.id}`);
			} else {
				await api.updateList(id, { name, icon });
				await invalidateAll();
			}
		} catch (err) {
			fail(err);
		}
	}

	async function deleteList(target: ShoppingList) {
		try {
			await api.deleteList(target.id);
			await goto('/', { replaceState: true, invalidateAll: true });
		} catch (err) {
			fail(err);
		}
	}

	// ───────────── Live sync ─────────────

	let connected = $state(true);
	let live = $state<ReturnType<typeof connectLive> | null>(null);
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;
	const refresh = () => {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => invalidateAll(), 100);
	};

	// Baner „brak połączenia” dopiero po chwili — krótkie mrugnięcia sieci nie są warte uwagi.
	$effect(() => {
		if (!live) return;
		if (live.state.connected) {
			connected = true;
			return;
		}
		const timer = setTimeout(() => (connected = false), 2500);
		return () => clearTimeout(timer);
	});

	onMount(() => {
		live = connectLive({
			onchange: (event) => {
				if (event.type === 'list') {
					if (event.action === 'deleted' && event.listId === list.id) {
						showToast({ message: 'Ta lista została usunięta na innym urządzeniu' });
						goto('/', { replaceState: true, invalidateAll: true });
					} else {
						refresh();
					}
				} else {
					// Też zmiany na innych listach — odświeżają liczniki w panelu list.
					refresh();
				}
			},
			onreconnect: refresh
		});

		return () => {
			clearTimeout(refreshTimer);
			live?.close();
		};
	});
</script>

<svelte:head>
	<title>{list.name} · Zakupy</title>
</svelte:head>

<header class="top">
	<button type="button" class="switch" onclick={() => (listsOpen = true)} aria-label="Zmień listę: {list.name}">
		<span class="list-icon" aria-hidden="true">{list.icon ?? '📝'}</span>
		<span class="list-name">{list.name}</span>
		<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" /></svg>
	</button>
	<WakeLockButton />
</header>

<div class="page">
	{#if total > 0}
		<div class="progress" class:complete={allDone}>
			<div class="progress-text">
				<span><b>{done}</b> z {total} w koszyku</span>
				{#if allDone}<span class="hooray">Wszystko kupione 🎉</span>{/if}
			</div>
			<div
				class="track"
				role="progressbar"
				aria-label="Postęp zakupów"
				aria-valuemin={0}
				aria-valuemax={total}
				aria-valuenow={done}
			>
				<div class="fill" style:width="{(done / total) * 100}%"></div>
			</div>
		</div>
	{/if}

	{#if !connected}
		<p class="banner offline" transition:slide={{ duration: 150 }}>
			Brak połączenia z serwerem — zmiany z innych urządzeń mogą nie docierać.
		</p>
	{/if}

	{#if showTip && total > 0}
		<div class="banner tip" transition:slide={{ duration: 180 }}>
			<span>
				👉 Przesuń w prawo — <b>kupione</b>, w lewo — <b>usuń</b>. Przytrzymaj, żeby <b>edytować</b>.
			</span>
			<button type="button" onclick={hideTip} aria-label="Zamknij podpowiedź">OK</button>
		</div>
	{/if}

	{#key list.id}
		<main>
			{#if total === 0}
				<div class="empty" in:fade={{ duration: 200 }}>
					<div class="empty-art" aria-hidden="true">🧺</div>
					<h2>Pusto tutaj</h2>
					<p>Wpisz produkt na dole ekranu, np.</p>
					<p class="examples"><span>2 mleko</span><span>chleb</span><span>1kg ziemniaki</span></p>
				</div>
			{/if}

			{#each groups as group (group.category.id)}
				<section class="group" style:--hue={group.hue} transition:slide={{ duration: 200 }}>
					<h2>
						<span class="cat-icon" aria-hidden="true">{group.category.icon}</span>
						<span class="cat-name">{group.category.name}</span>
						<span class="cat-count">{group.items.length}</span>
					</h2>
					<ul>
						{#each group.items as item (item.id)}
							<li animate:flip={{ duration: 200 }} transition:slide={{ duration: 200 }}>
								<ItemRow {item} ontoggle={toggle} ondelete={remove} onedit={(i) => (editing = i)} />
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if checked.length > 0}
				<section class="group basket" style:--hue="140" transition:slide={{ duration: 200 }}>
					<div class="basket-header">
						<button
							type="button"
							class="basket-toggle"
							aria-expanded={showChecked}
							onclick={() => (showChecked = !showChecked)}
						>
							<svg class="chevron" class:collapsed={!showChecked} viewBox="0 0 24 24" aria-hidden="true">
								<path d="M7 10l5 5 5-5" />
							</svg>
							W koszyku
							<span class="cat-count">{checked.length}</span>
						</button>
						<button type="button" class="clear" onclick={clearChecked}>Wyczyść</button>
					</div>
					{#if showChecked}
						<ul transition:slide={{ duration: 200 }}>
							{#each checked as item (item.id)}
								<li animate:flip={{ duration: 200 }} transition:slide={{ duration: 200 }}>
									<ItemRow {item} ontoggle={toggle} ondelete={remove} onedit={(i) => (editing = i)} />
								</li>
							{/each}
						</ul>
					{/if}
				</section>
			{/if}
		</main>
	{/key}
</div>

<AddItem listId={list.id} categories={data.categories} onadd={addItem} />

<ListsSheet
	bind:open={listsOpen}
	lists={data.lists}
	currentId={list.id}
	onselect={(l) => {
		listsOpen = false;
		if (l.id !== list.id) goto(`/l/${l.id}`, { replaceState: true });
	}}
	oncreate={() => {
		listsOpen = false;
		listDialog.show();
	}}
	onedit={(l) => {
		listsOpen = false;
		listDialog.show(l, data.lists.length > 1);
	}}
/>
<ListDialog bind:this={listDialog} onsave={saveList} ondelete={deleteList} />
<EditItemSheet
	item={editing}
	categories={data.categories}
	onsave={saveItem}
	ondelete={remove}
	onclose={() => (editing = null)}
/>
<Toast {toast} ondismiss={() => (toast = null)} />

<style>
	/* ───── Nagłówek ───── */
	.top {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 640px;
		margin: 0 auto;
		padding: calc(0.5rem + env(safe-area-inset-top)) 0.75rem 0.5rem;
		background: var(--header-bg);
		backdrop-filter: saturate(1.6) blur(16px);
		-webkit-backdrop-filter: saturate(1.6) blur(16px);
	}

	.switch {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 52px;
		padding: 0.25rem 0.5rem 0.25rem 0.25rem;
		border: 0;
		border-radius: 16px;
		background: none;
		cursor: pointer;
		text-align: left;
	}

	.switch:active {
		background: var(--chip);
	}

	.list-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		font-size: 1.4rem;
	}

	.list-name {
		min-width: 0;
		font-size: 1.55rem;
		font-weight: 800;
		letter-spacing: -0.025em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chevron {
		flex: none;
		width: 22px;
		height: 22px;
		fill: none;
		stroke: var(--text-muted);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform 0.2s;
	}

	.chevron.collapsed {
		transform: rotate(-90deg);
	}

	/* ───── Treść ───── */
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: 0.25rem 0.75rem calc(var(--bar-h) + 5rem + env(safe-area-inset-bottom));
	}

	.progress {
		padding: 0.25rem 0.35rem 0.85rem;
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.4rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.progress-text b {
		color: var(--text);
	}

	.hooray {
		font-weight: 700;
		color: var(--accent);
	}

	.track {
		height: 8px;
		border-radius: 99px;
		background: var(--chip);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, #22c55e, #16a34a);
		transition: width 0.4s cubic-bezier(0.2, 0.9, 0.3, 1);
	}

	.banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 0.85rem;
		padding: 0.7rem 0.9rem;
		border-radius: 16px;
		font-size: 0.9rem;
	}

	.offline {
		background: var(--warning-bg);
		color: var(--warning-text);
	}

	.tip {
		background: var(--accent-soft);
	}

	.tip span {
		flex: 1;
	}

	.tip button {
		flex: none;
		min-height: 36px;
		padding: 0 0.9rem;
		border: 0;
		border-radius: 99px;
		background: var(--accent);
		color: var(--accent-contrast);
		font-weight: 700;
		cursor: pointer;
	}

	main {
		display: grid;
		gap: 0.85rem;
	}

	.group {
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}

	.group h2,
	.basket-header {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin: 0;
		padding: 0.75rem 1rem 0.35rem;
	}

	.cat-icon {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 10px;
		background: hsl(var(--hue) 70% var(--tint-l));
		font-size: 1rem;
	}

	.cat-name {
		flex: 1;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: hsl(var(--hue) 40% var(--tint-text-l));
	}

	.cat-count {
		min-width: 24px;
		padding: 0.05rem 0.45rem;
		border-radius: 99px;
		background: var(--chip);
		color: var(--text-muted);
		font-size: 0.78rem;
		font-weight: 700;
		text-align: center;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0 0 0.35rem;
	}

	li + li {
		border-top: 1px solid var(--border);
	}

	/* ───── Koszyk ───── */
	.basket {
		background: transparent;
		box-shadow: none;
		border: 1.5px dashed var(--border-strong);
	}

	.basket :global(.row) {
		background: transparent;
	}

	.basket-header {
		padding: 0.35rem 0.5rem 0.35rem 0.6rem;
	}

	.basket-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: var(--tap);
		border: 0;
		background: none;
		font-size: 0.82rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
		cursor: pointer;
	}

	.clear {
		min-height: 38px;
		padding: 0 0.9rem;
		border: 0;
		border-radius: 99px;
		background: var(--danger-soft);
		color: var(--danger);
		font-size: 0.88rem;
		font-weight: 700;
		cursor: pointer;
	}

	/* ───── Pusty stan ───── */
	.empty {
		padding: 3.5rem 1rem 2rem;
		text-align: center;
	}

	.empty-art {
		display: grid;
		place-items: center;
		width: 96px;
		height: 96px;
		margin: 0 auto 1rem;
		border-radius: 32px;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		font-size: 3rem;
	}

	.empty h2 {
		margin: 0 0 0.35rem;
		font-size: 1.3rem;
		font-weight: 800;
	}

	.empty p {
		margin: 0;
		color: var(--text-muted);
	}

	.examples {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.75rem !important;
	}

	.examples span {
		padding: 0.3rem 0.75rem;
		border-radius: 99px;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 600;
	}

	@media (prefers-reduced-motion: reduce) {
		.fill,
		.chevron {
			transition: none;
		}
	}
</style>
