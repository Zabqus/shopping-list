<script lang="ts">
	import type { Item } from '#lib/types.js';
	import { formatQuantity } from '#lib/format.js';

	let {
		item,
		ontoggle,
		ondelete,
		onedit
	}: {
		item: Item;
		ontoggle: (item: Item) => void;
		ondelete: (item: Item) => void;
		onedit: (item: Item) => void;
	} = $props();

	const quantity = $derived(formatQuantity(item.quantity, item.unit));

	// ───── Gesty: przesunięcie w prawo = odhacz, w lewo = usuń, przytrzymanie = edycja ─────
	const THRESHOLD = 88;
	const LONG_PRESS_MS = 450;

	let dx = $state(0);
	let dragging = $state(false);
	let leaving = $state(false);

	let mode: 'idle' | 'pending' | 'swipe' | 'scroll' = 'idle';
	let startX = 0;
	let startY = 0;
	let pointerId = -1;
	let longTimer: ReturnType<typeof setTimeout> | undefined;
	let longFired = false;
	let suppressClick = false;

	function openEdit() {
		if (longFired) return;
		longFired = true;
		suppressClick = true;
		mode = 'idle';
		navigator.vibrate?.(10);
		onedit(item);
	}

	function onpointerdown(e: PointerEvent) {
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		startX = e.clientX;
		startY = e.clientY;
		pointerId = e.pointerId;
		mode = 'pending';
		longFired = false;
		suppressClick = false;
		clearTimeout(longTimer);
		longTimer = setTimeout(() => mode === 'pending' && openEdit(), LONG_PRESS_MS);
	}

	function onpointermove(e: PointerEvent) {
		if (e.pointerId !== pointerId || mode === 'idle' || mode === 'scroll') return;
		const x = e.clientX - startX;
		const y = e.clientY - startY;

		if (mode === 'pending') {
			if (Math.abs(x) > 10 && Math.abs(x) > Math.abs(y) * 1.2) {
				mode = 'swipe';
				dragging = true;
				clearTimeout(longTimer);
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			} else if (Math.abs(y) > 10) {
				mode = 'scroll';
				clearTimeout(longTimer);
			}
		}

		if (mode === 'swipe') {
			// Opór za progiem — palec czuje, że „już wystarczy”.
			dx = Math.abs(x) > THRESHOLD ? Math.sign(x) * (THRESHOLD + (Math.abs(x) - THRESHOLD) * 0.35) : x;
		}
	}

	function onpointerup(e: PointerEvent) {
		if (e.pointerId !== pointerId) return;
		clearTimeout(longTimer);

		if (mode === 'swipe') {
			suppressClick = true;
			dragging = false;
			if (dx >= THRESHOLD) {
				navigator.vibrate?.(15);
				ontoggle(item);
				dx = 0;
			} else if (dx <= -THRESHOLD) {
				leaving = true;
				dx = -window.innerWidth;
				setTimeout(() => ondelete(item), 160);
			} else {
				dx = 0;
			}
		}
		mode = 'idle';
	}

	function onpointercancel() {
		clearTimeout(longTimer);
		dragging = false;
		dx = 0;
		mode = 'idle';
	}

	function onclick() {
		if (suppressClick) {
			suppressClick = false;
			return;
		}
		if (!item.checked) navigator.vibrate?.(15);
		ontoggle(item);
	}

	const progress = $derived(Math.min(Math.abs(dx) / THRESHOLD, 1));
</script>

<div class="wrap" class:checked={item.checked}>
	<!-- Tło pod przesuwanym wierszem: zielone (odhacz) albo czerwone (usuń) -->
	<div class="actions" aria-hidden="true">
		<span class="action check" style:opacity={dx > 0 ? progress : 0} class:ready={dx >= THRESHOLD}>
			<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
			{item.checked ? 'Przywróć' : 'Kupione'}
		</span>
		<span class="action delete" style:opacity={dx < 0 ? progress : 0} class:ready={dx <= -THRESHOLD}>
			Usuń
			<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" /></svg>
		</span>
	</div>

	<button
		type="button"
		class="row"
		class:dragging
		class:leaving
		style:transform="translateX({dx}px)"
		aria-pressed={item.checked}
		aria-label="{item.name}{quantity ? `, ${quantity}` : ''}{item.checked ? ', w koszyku' : ''}"
		{onclick}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		{onpointercancel}
		oncontextmenu={(e) => {
			e.preventDefault();
			openEdit();
		}}
	>
		<span class="box" aria-hidden="true">
			<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
		</span>
		<span class="text">
			<span class="name">{item.name}</span>
			{#if item.note}<span class="note">{item.note}</span>{/if}
		</span>
		{#if quantity}<span class="qty">{quantity}</span>{/if}
	</button>
</div>

<style>
	.wrap {
		position: relative;
		overflow: hidden;
	}

	.actions {
		position: absolute;
		inset: 0;
		display: flex;
		justify-content: space-between;
		align-items: stretch;
		pointer-events: none;
	}

	.action {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0 1.25rem;
		flex: 1;
		font-weight: 700;
		font-size: 0.9rem;
		color: #fff;
		transition: filter 0.15s;
	}

	.action svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		transition: transform 0.15s;
	}

	.action.ready svg {
		transform: scale(1.2);
	}

	.check {
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.delete {
		justify-content: flex-end;
		background: var(--danger);
	}

	.row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		width: 100%;
		min-height: 58px;
		padding: 0.6rem 1rem;
		border: 0;
		background: var(--surface);
		color: inherit;
		text-align: left;
		cursor: pointer;
		touch-action: pan-y;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		transition:
			transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1),
			background 0.15s;
	}

	.row.dragging {
		transition: none;
	}

	.row.leaving {
		transition: transform 0.16s ease-in;
	}

	.row:active:not(.dragging) {
		background: var(--surface-pressed);
	}

	.row:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -3px;
	}

	.box {
		flex: none;
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 2.25px solid hsl(var(--hue) 45% 60%);
		border-radius: 50%;
		transition:
			background 0.18s,
			border-color 0.18s,
			transform 0.18s;
	}

	.box svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: var(--accent-contrast);
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 22;
		stroke-dashoffset: 22;
		transition: stroke-dashoffset 0.22s ease-out 0.05s;
	}

	.checked .box {
		background: var(--accent);
		border-color: var(--accent);
		transform: scale(0.92);
	}

	.checked .box svg {
		stroke-dashoffset: 0;
	}

	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.name {
		font-size: 1.05rem;
		font-weight: 550;
		overflow-wrap: anywhere;
	}

	.note {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.qty {
		flex: none;
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
		background: hsl(var(--hue) 70% var(--tint-l));
		color: hsl(var(--hue) 55% var(--tint-text-l));
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.checked .name {
		color: var(--text-muted);
		text-decoration: line-through;
		text-decoration-thickness: 1.5px;
	}

	.checked .qty {
		background: var(--chip);
		color: var(--text-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.row,
		.box,
		.box svg {
			transition: none;
		}
	}
</style>
