<script lang="ts">
	import type { WidgetApi } from '@edgestation/sdk';
	import GameTile from './GameTile.svelte';
	import type { Game, Post } from './steam';

	let {
		api,
		rows,
		now,
		loadedAt,
		refreshing,
		fallback,
		onopen,
		onadd,
		onrefresh
	}: {
		api: WidgetApi;
		rows: { game: Game; latest: Post | undefined }[];
		now: number;
		/** When the last load started, in milliseconds. */
		loadedAt: number;
		refreshing: boolean;
		/** The line in place of the title of a game with no post. */
		fallback: (id: number) => string;
		onopen: (id: number) => void;
		onadd: () => void;
		onrefresh: () => void;
	} = $props();

	// A clock time stays true with no timer. "5 min ago" would need one to keep up.
	const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });
</script>

<header class="bar">
	<span class="status">{refreshing ? 'Refreshing…' : `Updated at ${time.format(loadedAt)}`}</span>
	<button class="refresh" disabled={refreshing} onclick={onrefresh}>
		<svg class:spin={refreshing} viewBox="0 0 24 24" aria-hidden="true">
			<!-- Lucide "refresh-cw" icon, ISC license: https://lucide.dev/license -->
			<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
			<path d="M21 3v5h-5" />
			<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
			<path d="M8 16H3v5" />
		</svg>
		Refresh
	</button>
</header>

<!-- This holds the overlay scrollbars of the list. -->
<div class="list">
	<ul class="tiles" {@attach (ul) => api.scrollbars(ul)}>
		{#each rows as { game, latest } (game.id)}
			<li>
				<GameTile
					{game}
					{latest}
					fallback={fallback(game.id)}
					{now}
					onopen={() => onopen(game.id)}
				/>
			</li>
		{/each}
		<li>
			<button class="tile add" onclick={onadd}>
				<span class="plus">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
				</span>
				Follow a game
			</button>
		</li>
	</ul>
</div>

<style>
	.status {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--muted-foreground);
		font-size: 0.8em;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.refresh {
		display: flex;
		flex: none;
		align-items: center;
		gap: 0.45em;
		height: 2.2em;
		padding: 0 1em 0 0.8em;
		border: 1px solid color-mix(in oklch, var(--card-foreground) 12%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--card-foreground) 8%, transparent);
		font-size: 0.85em;
		font-weight: 600;
		transition:
			background-color 150ms,
			scale 120ms;
	}

	.refresh:active:not(:disabled) {
		scale: 0.96;
		background: color-mix(in oklch, var(--card-foreground) 16%, transparent);
	}

	.refresh:disabled {
		cursor: default;
	}

	.refresh svg {
		width: 1.1em;
		fill: none;
		stroke: var(--primary);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			rotate: 360deg;
		}
	}

	.add {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5em;
		color: var(--muted-foreground);
		font-size: 0.9em;
	}

	.plus {
		display: grid;
		place-items: center;
		width: 2.4em;
		height: 2.4em;
		border-radius: 50%;
		background: color-mix(in oklch, var(--card-foreground) 10%, transparent);
		color: var(--card-foreground);
	}

	.plus svg {
		width: 50%;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
	}
</style>
