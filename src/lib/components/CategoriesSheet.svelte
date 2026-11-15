<script lang="ts">
	import { flip } from 'svelte/animate';
	import { categoryHue } from '#lib/categoryStyle.js';
	import type { Category } from '#lib/types.js';
	import BottomSheet from './BottomSheet.svelte';

	let {
		open = $bindable(false),
		categories,
		onreorder
	}: {
		open?: boolean;
		categories: Category[];
		onreorder: (ids: number[]) => void | Promise<void>;
	} = $props();

	let order = $state<Category[]>([]);
	let draggingId = $state<number | null>(null);
	let saving = $state(false);

	let fromIndex = -1;
	let pointerId = -1;
	let startY = 0;
	let lastTo = -1;
	let dirty = false;

	$effect(() => {
		if (open) {
			order = categories.map((c) => ({ ...c }));
			draggingId = null;
			saving = false;
			dirty = false;
			fromIndex = -1;
			lastTo = -1;
		}
	});

	function clamp(n: number, min: number, max: number) {
		return Math.max(min, Math.min(max, n));
	}

	function moveItem(from: number, to: number) {
		if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return;
		const next = [...order];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		order = next;
		fromIndex = to;
		lastTo = to;
		dirty = true;
		navigator.vibrate?.(8);
	}

	function onPointerDown(e: PointerEvent, index: number, id: number) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		if (saving) return;
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pointerId = e.pointerId;
		fromIndex = index;
		lastTo = index;
		startY = e.clientY;
		draggingId = id;
	}

	function onPointerMove(e: PointerEvent, row: HTMLElement) {
		if (e.pointerId !== pointerId || draggingId === null) return;
		const dy = e.clientY - startY;
		const height = row.offsetHeight || 56;
		const to = clamp(fromIndex + Math.round(dy / height), 0, order.length - 1);
		if (to !== lastTo) {
			const from = order.findIndex((c) => c.id === draggingId);
			moveItem(from, to);
			startY = e.clientY;
		}
	}

	async function onPointerUp(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		pointerId = -1;
		draggingId = null;
		fromIndex = -1;
		lastTo = -1;
		if (!dirty || saving) return;
		dirty = false;
		saving = true;
		try {
			await onreorder(order.map((c) => c.id));
		} finally {
			saving = false;
		}
	}

	function onPointerCancel(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		pointerId = -1;
		draggingId = null;
		fromIndex = -1;
		lastTo = -1;
	}
</script>

<BottomSheet bind:open title="Kolejność alejek">
	<p class="hint">Przeciągnij kategorie tak, jak idziesz przez sklep. Zmiana zapisuje się od razu.</p>

	<ul class="list" class:saving aria-busy={saving}>
		{#each order as category, index (category.id)}
			<li
				class:dragging={draggingId === category.id}
				animate:flip={{ duration: draggingId === category.id ? 0 : 180 }}
				style:--hue={categoryHue(category)}
			>
				<button
					type="button"
					class="row"
					aria-label="Przenieś {category.name}"
					onpointerdown={(e) => onPointerDown(e, index, category.id)}
					onpointermove={(e) => onPointerMove(e, e.currentTarget)}
					onpointerup={onPointerUp}
					onpointercancel={onPointerCancel}
				>
					<span class="grip" aria-hidden="true">
						<svg viewBox="0 0 24 24"><path d="M8 7h8M8 12h8M8 17h8" /></svg>
					</span>
					<span class="icon" aria-hidden="true">{category.icon ?? '📦'}</span>
					<span class="name">{category.name}</span>
				</button>
			</li>
		{/each}
	</ul>
</BottomSheet>

<style>
	.hint {
		margin: -0.35rem 0 0.9rem;
		font-size: 0.9rem;
		color: var(--text-muted);
		line-height: 1.35;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
		touch-action: none;
	}

	.list.saving {
		opacity: 0.7;
		pointer-events: none;
	}

	li {
		border-radius: 14px;
		background: var(--bg);
		transition: box-shadow 0.15s, transform 0.15s;
	}

	li.dragging {
		z-index: 2;
		background: var(--surface);
		box-shadow: var(--shadow);
		transform: scale(1.02);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		min-height: 52px;
		padding: 0.35rem 0.75rem 0.35rem 0.35rem;
		border: 0;
		border-radius: inherit;
		background: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.row:active {
		cursor: grabbing;
	}

	.grip {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		color: var(--text-muted);
	}

	.grip svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.2;
		stroke-linecap: round;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		background: hsl(var(--hue) 70% var(--tint-l));
		font-size: 1.05rem;
	}

	.name {
		flex: 1;
		min-width: 0;
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
