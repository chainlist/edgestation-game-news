<script lang="ts">
	import type { Cleanup, WidgetApi } from '@edgestation/sdk';
	import { classicHeader, search, type Found } from './steam';
	import Tile from './Tile.svelte';

	let {
		api,
		followed,
		onfollow,
		ondone
	}: {
		api: WidgetApi;
		/** The ids of the games that the widget follows. */
		followed: number[];
		onfollow: (game: Found) => void;
		ondone: () => void;
	} = $props();

	let term = $state('');
	let results = $state.raw<Found[]>([]);
	let phase = $state<'idle' | 'searching' | 'failed'>('idle');
	let wait: Cleanup | undefined;
	/** Counts the searches, so that an older anwser cannot replace a newer one. */
	let latest = 0;

	function oninput() {
		wait?.();
		const text = term.trim();
		const mine = ++latest;
		if (!text) {
			results = [];
			phase = 'idle';
			return;
		}
		phase = 'searching';
		// The search starts 300 ms after the last key.
		wait = api.after(300, async () => {
			try {
				const found = await search(api, text);
				if (mine === latest) [results, phase] = [found, 'idle'];
			} catch {
				if (mine === latest) phase = 'failed';
			}
		});
	}
</script>

<div class="search">
	<header class="bar">
		<input
			bind:value={term}
			{oninput}
			placeholder="Search Steam games"
			aria-label="Search Steam games"
			enterkeyhint="search"
			onkeydown={(event) => event.key === 'Escape' && ondone()}
		/>
		<button class="pill primary" onclick={ondone}>Done</button>
	</header>

	{#if phase === 'failed'}
		<p class="note">Couldn't reach Steam. Type again to retry.</p>
	{:else if results.length}
		<!-- This holds the overlay scrollbars of the results. -->
		<div class="list">
			<ul class="tiles" {@attach (ul) => api.scrollbars(ul)}>
				{#each results as found (found.id)}
					{@const following = followed.includes(found.id)}
					<li>
						<Tile
							sources={[found.header, classicHeader(found.id), found.capsule]}
							title={found.name}
							badge={following ? 'Following' : undefined}
							disabled={following}
							onclick={() => onfollow(found)}
						/>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<p class="note">
			{phase === 'searching'
				? 'Searching…'
				: term.trim()
					? 'No game found.'
					: 'Type the name of a game.'}
		</p>
	{/if}
</div>

<style>
	.search {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.6em;
		min-height: 0;
	}

	input {
		flex: 1;
		min-width: 0;
		height: 2.2em;
		padding: 0 0.7em;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius) * 0.75);
		background: transparent;
		color: inherit;
		font: inherit;
	}

	input::placeholder {
		color: var(--muted-foreground);
	}

	input:focus {
		border-color: var(--ring);
		outline: none;
	}

	.note {
		margin: auto;
		color: var(--muted-foreground);
	}
</style>
