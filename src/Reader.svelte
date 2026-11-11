<script lang="ts">
	import type { WidgetApi } from '@edgestation/sdk';
	import { toHtml } from './bbcode';
	import { longDate } from './format';
	import type { Found, Post } from './steam';

	let {
		api,
		game,
		posts,
		onback,
		onunfollow,
		onseen
	}: {
		api: WidgetApi;
		game: Found;
		posts: Post[];
		onback: () => void;
		onunfollow: () => void;
		onseen: (date: number) => void;
	} = $props();

	/** 0 is the newest post. */
	let index = $state(0);
	const post = $derived(posts[index]);

	$effect(() => {
		if (post) onseen(post.date);
	});
</script>

<div class="reader">
	<header>
		<button class="icon" aria-label="Back" title="Back" onclick={onback}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
		</button>
		<div class="heading">
			<span class="meta">
				{game.name}{#if post}&ensp;·&ensp;{longDate.format(post.date * 1000)}{#if post.author}&ensp;·&ensp;{post.author}{/if}{/if}
			</span>
			<h2>{post?.title ?? 'No news yet'}</h2>
		</div>
		{#if posts.length > 1}
			<div class="pager">
				<button
					class="icon"
					aria-label="Newer post"
					title="Newer post"
					disabled={index === 0}
					onclick={() => index--}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
				</button>
				<span>{index + 1} / {posts.length}</span>
				<button
					class="icon"
					aria-label="Older post"
					title="Older post"
					disabled={index === posts.length - 1}
					onclick={() => index++}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
				</button>
			</div>
		{/if}
		<button class="pill" onclick={onunfollow}>Unfollow</button>
	</header>

	{#if post}
		<!-- A new post mounts a new article, so it starts at the top. -->
		{#key post.gid}
			<!-- This holds the overlay scrollbars of the post. -->
			<div class="body">
				<article {@attach (article) => api.scrollbars(article)}>
					{@html toHtml(post.contents)}
				</article>
			</div>
		{/key}
	{/if}
</div>

<style>
	.reader {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 0.5em;
		min-height: 0;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}

	.heading {
		flex: 1;
		min-width: 0;
	}

	.meta,
	h2 {
		display: block;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.meta {
		color: var(--muted-foreground);
		font-size: 0.75em;
	}

	h2 {
		margin: 0;
		font-size: 1em;
		font-weight: 600;
	}

	.pager {
		display: flex;
		flex: none;
		align-items: center;
		gap: 0.2em;
		font-size: 0.85em;
		font-variant-numeric: tabular-nums;
	}

	.icon {
		display: grid;
		flex: none;
		place-items: center;
		width: 2.2em;
		height: 2.2em;
		border-radius: 50%;
	}

	.icon:active {
		background: color-mix(in oklch, var(--card-foreground) 10%, transparent);
	}

	.icon:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.icon svg {
		width: 1.2em;
		fill: none;
		stroke: currentColor;
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.body {
		flex: 1;
		min-height: 0;
	}

	/* The post reads as one column in the middle of a wide cell. */
	article {
		line-height: 1.45;
		font-size: 0.9em;
		overscroll-behavior: contain;
	}

	article > :global(*) {
		max-width: 46em;
		margin-inline: auto;
	}

	article :global(p) {
		margin-block: 0 0.7em;
	}

	article :global(p:empty) {
		display: none;
	}

	article :global(:is(h3, h4, h5)) {
		margin-block: 1em 0.4em;
		line-height: 1.2;
	}

	article :global(h3) {
		font-size: 1.2em;
	}

	article :global(h4) {
		font-size: 1.05em;
	}

	article :global(h5) {
		font-size: 1em;
	}

	article :global(:is(img, video)) {
		display: block;
		max-width: 100%;
		max-height: 60cqh;
		margin: 0.6em auto;
		border-radius: calc(var(--radius) * 0.5);
	}

	article :global(figure) {
		margin-block: 0.6em;
		text-align: center;
	}

	article :global(figcaption) {
		color: var(--muted-foreground);
		font-size: 0.8em;
	}

	article :global(hr) {
		margin-block: 1em;
		border: none;
		border-top: 1px solid color-mix(in oklch, var(--card-foreground) 15%, transparent);
	}

	article :global(:is(ul, ol)) {
		margin-block: 0 0.7em;
		padding-left: 1.4em;
	}

	article :global(blockquote) {
		margin-block: 0 0.7em;
		padding-left: 0.8em;
		border-left: 3px solid color-mix(in oklch, var(--card-foreground) 20%, transparent);
		color: var(--muted-foreground);
	}

	article :global(pre) {
		padding: 0.6em;
		border-radius: calc(var(--radius) * 0.5);
		background: color-mix(in oklch, var(--card-foreground) 6%, transparent);
		font-size: 0.9em;
		white-space: pre-wrap;
	}

	article :global(table) {
		border-collapse: collapse;
	}

	article :global(:is(td, th)) {
		padding: 0.3em 0.6em;
		border: 1px solid color-mix(in oklch, var(--card-foreground) 15%, transparent);
	}
</style>
