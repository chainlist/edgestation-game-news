<script lang="ts">
	import type { WidgetApi } from '@edgestation/sdk';
	import NewsList from './NewsList.svelte';
	import Reader from './Reader.svelte';
	import Search from './Search.svelte';
	import { headers, news, type Found, type Game, type Post } from './steam';

	let props: { api: WidgetApi } = $props();
	// `api` does not change. A changed setting mounts the widget again.
	// svelte-ignore state_referenced_locally
	const { api } = props;

	/** The time between two loads while the page shows. */
	const RELOAD = 30 * 60_000;

	/** `undefined` until the widget reads the saved games. */
	let games = $state.raw<Game[]>();
	/** The posts of each game by id, newest first. `null` if its first load failed. */
	let posts = $state.raw<Record<number, Post[] | null>>({});
	/** The list, the search, or the id of the game in the reader. */
	let view = $state.raw<'list' | 'search' | number>('list');
	let now = $state(Date.now());
	/** When the last load started, in milliseconds. */
	let loadedAt = $state(0);
	let refreshing = $state(false);

	const reading = $derived(typeof view === 'number' ? games?.find((g) => g.id === view) : undefined);
	const rows = $derived(
		(games ?? [])
			.map((game) => ({ game, latest: posts[game.id]?.[0] }))
			.sort((a, b) => (b.latest?.date ?? 0) - (a.latest?.date ?? 0))
	);

	/** Loads the posts of `list`. A game that fails keeps the posts it had. */
	async function load(list: Game[]) {
		const loaded = await Promise.all(
			list.map(async (game) => [game.id, await news(api, game.id).catch(() => null)] as const)
		);
		const next = { ...posts };
		for (const [id, found] of loaded) next[id] = found ?? next[id] ?? null;
		posts = next;
	}

	/** Saves the store header of the games in `list` that have none. A failure tries again later. */
	async function fillHeaders(list: Game[]) {
		const missing = list.filter((game) => !game.header).map((game) => game.id);
		if (!missing.length) return;
		const found = await headers(api, missing).catch(() => new Map<number, string>());
		if (found.size) {
			save(games!.map((game) => ({ ...game, header: found.get(game.id) ?? game.header })));
		}
	}

	async function reload() {
		loadedAt = now = Date.now();
		void fillHeaders(games ?? []);
		await load(games ?? []);
	}

	/** The Refresh button. The card shows its loading bar too. */
	async function refresh() {
		refreshing = true;
		try {
			await api.loading(reload());
		} finally {
			refreshing = false;
		}
	}

	api.guard(() =>
		api.loading(
			(async () => {
				games = (await api.storage.instance.get<Game[]>('games')) ?? [];
				await reload();
			})()
		)
	)();

	// `every` also ticks each time the page shows again. The time check keeps loads 30 min appart.
	api.every(RELOAD, () => {
		now = Date.now();
		if (games && now - loadedAt >= RELOAD) void reload();
	});

	const save = api.guard(async (next: Game[]) => {
		games = next;
		await api.storage.instance.set('games', next);
	});

	function follow(found: Found) {
		if (games!.some((game) => game.id === found.id)) return;
		const game = { ...found, seen: Math.floor(Date.now() / 1000) };
		save([...games!, game]);
		void load([game]);
		void fillHeaders([game]);
	}

	function unfollow(id: number) {
		save(games!.filter((game) => game.id !== id));
		view = 'list';
	}

	function markSeen(id: number, date: number) {
		if (games!.some((game) => game.id === id && game.seen < date)) {
			save(games!.map((game) => (game.id === id ? { ...game, seen: date } : game)));
		}
	}

	/** The line that stands in for the title of the latest post. */
	function missing(id: number) {
		const found = posts[id];
		if (found === null) return "Couldn't load the news";
		return found ? 'No news yet' : '…';
	}
</script>

<!-- `el` is the size container, so its padding cannot use cqh or cqw. Put the layout in it. -->
<div class="news">
	{#if view === 'search'}
		<Search
			{api}
			followed={games?.map((game) => game.id) ?? []}
			onfollow={follow}
			ondone={() => (view = 'list')}
		/>
	{:else if reading}
		<Reader
			{api}
			game={reading}
			posts={posts[reading.id] ?? []}
			onback={() => (view = 'list')}
			onunfollow={() => unfollow(reading.id)}
			onseen={(date) => markSeen(reading.id, date)}
		/>
	{:else if games?.length === 0}
		<div class="empty">
			<p>Follow Steam games to read their news here</p>
			<button class="pill primary" onclick={() => (view = 'search')}>Follow a game</button>
		</div>
	{:else if games}
		<NewsList
			{api}
			{rows}
			{now}
			{loadedAt}
			{refreshing}
			fallback={missing}
			onopen={(id) => (view = id)}
			onadd={() => (view = 'search')}
			onrefresh={refresh}
		/>
	{/if}
</div>

<style>
	/* The font follows the height of the cell, and the width of a narrow one, with limits that
	   keep the text readable. */
	.news {
		display: flex;
		flex-direction: column;
		gap: 0.6em;
		height: 100%;
		padding: 0.75em;
		font-size: clamp(12px, min(4.5cqh, 2.2cqw), 20px);
	}

	/* The rest is shared with the other components. */
	:where(.news) :global(button) {
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	:where(.news) :global(.pill) {
		flex: none;
		padding: 0.4em 1em;
		border-radius: 999px;
		background: color-mix(in oklch, var(--card-foreground) 10%, transparent);
		white-space: nowrap;
	}

	:where(.news) :global(.pill.primary) {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	/* The bar above the tiles in the list and in the search. Both have the same height, so
	   their tiles get the same size. */
	:where(.news) :global(.bar) {
		display: flex;
		align-items: center;
		gap: 0.6em;
		min-height: 2.2em;
	}

	/* It holds the overlay scrollbars of `.tiles`. The tiles measure its height. */
	:where(.news) :global(.list) {
		flex: 1;
		min-height: 0;
		container-type: size;
	}

	/* Whole rows of tiles fill the height of `.list`: 2 rows from 260 px, and more when it is
	   higher. The tiles are at least 1.7 times as wide as high, so a wide cell shows more
	   columns. Scrolling stops on a row. */
	:where(.news) :global(.tiles) {
		--rows: 1;
		--gap: 0.6em;
		--tile: calc((100cqh - (var(--rows) - 1) * var(--gap)) / var(--rows));
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(calc(var(--tile) * 1.7), 100%), 1fr));
		grid-auto-rows: var(--tile);
		gap: var(--gap);
		margin: 0;
		padding: 0;
		overscroll-behavior: contain;
		scroll-snap-type: y mandatory;
		list-style: none;
	}

	@container (min-height: 260px) {
		:where(.news) :global(.tiles) {
			--rows: 2;
		}
	}

	@container (min-height: 520px) {
		:where(.news) :global(.tiles) {
			--rows: 3;
		}
	}

	@container (min-height: 780px) {
		:where(.news) :global(.tiles) {
			--rows: 4;
		}
	}

	:where(.news) :global(.tiles > li) {
		scroll-snap-align: start;
	}

	:where(.news) :global(.tile) {
		position: relative;
		display: block;
		overflow: hidden;
		width: 100%;
		height: 100%;
		border-radius: var(--radius);
		background: color-mix(in oklch, var(--card-foreground) 7%, transparent);
		text-align: left;
		transition: scale 120ms;
	}

	:where(.news) :global(.tile:active:not(:disabled)) {
		scale: 0.98;
	}

	:where(.news) :global(.tile:disabled) {
		cursor: default;
	}

	.empty {
		display: flex;
		flex: 1;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.8em;
		text-align: center;
	}

	.empty p {
		margin: 0;
		color: var(--muted-foreground);
	}
</style>
