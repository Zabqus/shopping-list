<script lang="ts" module>
	export interface ToastData {
		id: number;
		message: string;
		kind?: 'info' | 'error';
		actionLabel?: string;
		onaction?: () => void;
	}
</script>

<script lang="ts">
	import { fly } from 'svelte/transition';

	let { toast, ondismiss }: { toast: ToastData | null; ondismiss: () => void } = $props();
</script>

<div class="region" aria-live="polite">
	{#if toast}
		{#key toast.id}
			<div class="toast" class:error={toast.kind === 'error'} role="status" transition:fly={{ y: 24, duration: 180 }}>
				<span class="message">{toast.message}</span>
				{#if toast.actionLabel && toast.onaction}
					<button
						class="action"
						onclick={() => {
							toast?.onaction?.();
							ondismiss();
						}}>{toast.actionLabel}</button
					>
				{/if}
				<button class="close" aria-label="Zamknij" onclick={ondismiss}>✕</button>
			</div>
		{/key}
	{/if}
</div>

<style>
	.region {
		position: fixed;
		left: 0;
		right: 0;
		bottom: calc(var(--space) + env(safe-area-inset-bottom));
		display: flex;
		justify-content: center;
		padding: 0 var(--space);
		pointer-events: none;
		z-index: 20;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: min(100%, 480px);
		padding: 0.25rem 0.25rem 0.25rem 1rem;
		border-radius: var(--radius);
		background: var(--toast-bg);
		color: var(--toast-text);
		box-shadow: var(--shadow);
	}

	.toast.error {
		background: var(--danger);
		color: #fff;
	}

	.message {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	button {
		min-height: var(--tap);
		border: 0;
		background: none;
		cursor: pointer;
		border-radius: 8px;
	}

	.action {
		padding: 0 0.75rem;
		font-weight: 700;
		color: var(--toast-action);
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 0.04em;
	}

	.error .action {
		color: #fff;
	}

	.close {
		width: var(--tap);
		opacity: 0.7;
	}
</style>
