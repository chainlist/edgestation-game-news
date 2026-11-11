<script lang="ts">
	import { coverImage } from './bbcode';
	import { ago } from './format';
	import { classicHeader, type Game, type Post } from './steam';
	import Tile from './Tile.svelte';

	let {
		game,
		latest,
		fallback,
		now,
		onopen
	}: {
		game: Game;
		latest: Post | undefined;
		/** The line that shows in place of the title while there is no post. */
		fallback: string;
		now: number;
		onopen: () => void;
	} = $props();
</script>

<!-- The picture at the top of the post first, then the store header. -->
<Tile
	sources={[latest && coverImage(latest.contents), game.header, classicHeader(game.id)]}
	meta={latest ? `${game.name} · ${ago(latest.date, now)}` : game.name}
	title={latest?.title ?? fallback}
	muted={!latest}
	badge={latest && latest.date > game.seen ? 'New' : undefined}
	onclick={onopen}
/>
