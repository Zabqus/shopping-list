<script lang="ts">
	import { onMount } from 'svelte';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { goto, invalidateAll } from '$app/navigation';
	import { api, ApiError } from '#lib/api.js';
	import { connectLive } from '#lib/live.svelte.js';
	import type { Category, Item, ShoppingList } from '#lib/types.js';
	import AddItem from '#lib/components/AddItem.svelte';
	import ItemRow from '#lib/components/ItemRow.svelte';
	import ListDialog from '#lib/components/ListDialog.svelte';
	import ListTabs from '#lib/components/ListTabs.svelte';
	import Toast, { type ToastData } from '#lib/components/Toast.svelte';

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
				items: byCategory.get(category.id)!.sort((a, b) => a.position - b.position || a.id - b.id)
			}));
	});

	const checked = $derived(
		items.filter((i) => i.checked).sort((a, b) => (b.checked_at ?? '').localeCompare(a.checked_at ?? ''))
	);
	const remaining = $derived(items.length - checked.length);

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

	// ───────────── Operacje ─────────────

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
		if (next) navigator.vibrate?.(15);
		try {
			upsert(await api.updateItem(item.id, { checked: next }));
		} catch (err) {
			fail(err);
		}
	}

	async function changeCategory(item: Item, categoryId: number) {
		upsert({ ...item, category_id: categoryId });
		try {
			upsert(await api.updateItem(item.id, { category_id: categoryId }));
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

	// ───────────── Listy ─────────────

	let dialog: ListDialog;

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
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;
	const refresh = () => {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => invalidateAll(), 100);
	};

	let live = $state<ReturnType<typeof connectLive> | null>(null);

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
				} else if (event.listId === list.id) {
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

<div class="page">
	<header>
		<div class="title">
			<h1><span aria-hidden="true">{list.icon ?? '📝'}</span> {list.name}</h1>
			<button
				type="button"
				class="icon-button"
				aria-label="Edytuj listę"
				onclick={() => dialog.show(list, data.lists.length > 1)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
			</button>
		</div>
		<ListTabs lists={data.lists} currentId={list.id} oncreate={() => dialog.show()} />
	</header>

	{#if !connected}
		<p class="offline" transition:slide={{ duration: 150 }}>
			Brak połączenia z serwerem — zmiany z innych urządzeń mogą nie docierać.
		</p>
	{/if}

	<div class="sticky">
		<AddItem listId={list.id} categories={data.categories} onadd={addItem} />
	</div>

	{#key list.id}
		<main>
			{#if items.length === 0}
				<div class="empty">
					<p class="empty-icon" aria-hidden="true">🧺</p>
					<p>Lista jest pusta.</p>
					<p class="hint">Wpisz produkt powyżej — np. <b>2 mleko</b>, <b>chleb</b> albo <b>1kg ziemniaki</b>.</p>
				</div>
			{:else if remaining === 0}
				<div class="empty done">
					<p class="empty-icon" aria-hidden="true">🎉</p>
					<p>Wszystko kupione!</p>
				</div>
			{/if}

			{#each groups as group (group.category.id)}
				<section class="group" transition:slide={{ duration: 180 }}>
					<h2><span aria-hidden="true">{group.category.icon}</span> {group.category.name}</h2>
					<ul>
						{#each group.items as item (item.id)}
							<li animate:flip={{ duration: 180 }} transition:slide={{ duration: 180 }}>
								<ItemRow {item} categories={data.categories} ontoggle={toggle} ondelete={remove} oncategory={changeCategory} />
							</li>
						{/each}
					</ul>
				</section>
			{/each}

			{#if checked.length > 0}
				<section class="group checked" transition:slide={{ duration: 180 }}>
					<div class="checked-header">
						<h2>W koszyku · {checked.length}</h2>
						<button type="button" class="clear" onclick={clearChecked}>Wyczyść</button>
					</div>
					<ul>
						{#each checked as item (item.id)}
							<li animate:flip={{ duration: 180 }} transition:slide={{ duration: 180 }}>
								<ItemRow {item} categories={data.categories} ontoggle={toggle} ondelete={remove} oncategory={changeCategory} />
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</main>
	{/key}
</div>

<ListDialog bind:this={dialog} onsave={saveList} ondelete={deleteList} />
<Toast {toast} ondismiss={() => (toast = null)} />

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding: calc(var(--space) + env(safe-area-inset-top)) var(--space)
			calc(6rem + env(safe-area-inset-bottom));
	}

	header {
		display: grid;
		gap: 0.75rem;
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	h1 {
		flex: 1;
		min-width: 0;
		margin: 0;
		font-size: 1.6rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.icon-button {
		flex: none;
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--text-muted);
		cursor: pointer;
	}

	.icon-button:hover {
		background: var(--chip);
	}

	.icon-button svg {
		width: 22px;
		height: 22px;
		fill: currentColor;
	}

	.offline {
		margin: 0.75rem 0 0;
		padding: 0.6rem 0.9rem;
		border-radius: var(--radius);
		background: var(--warning-bg);
		color: var(--warning-text);
		font-size: 0.9rem;
	}

	.sticky {
		position: sticky;
		top: 0;
		z-index: 5;
		margin: 0 calc(var(--space) * -1);
		padding: 0.75rem var(--space);
		background: var(--bg);
	}

	main {
		display: grid;
		gap: 1rem;
	}

	.group {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	h2 {
		margin: 0;
		padding: 0.6rem var(--space) 0.4rem;
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	ul li:last-child :global(.row) {
		border-bottom: 0;
	}

	.checked {
		background: transparent;
	}

	.checked :global(.row) {
		background: transparent;
	}

	.checked-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-right: 0.25rem;
	}

	.clear {
		min-height: 36px;
		padding: 0 0.75rem;
		border: 0;
		border-radius: 8px;
		background: none;
		color: var(--danger);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.clear:hover {
		background: var(--chip);
	}

	.empty {
		padding: 2.5rem 1rem;
		text-align: center;
		color: var(--text-muted);
	}

	.empty p {
		margin: 0.25rem 0;
	}

	.empty-icon {
		font-size: 2.5rem;
	}

	.hint {
		font-size: 0.9rem;
	}

	.hint b {
		color: var(--text);
		font-weight: 600;
	}

	.done {
		padding: 1.5rem 1rem;
	}
</style>
