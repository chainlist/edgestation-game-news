<script lang="ts">
	let {
		sources,
		title,
		meta,
		badge,
		muted = false,
		disabled = false,
		onclick
	}: {
		/** The pictures to try in order. The tile shows the first that loads, or none. */
		sources: (string | undefined)[];
		title: string;
		/** The small line above the title. */
		meta?: string;
		/** The label in the top right corner. */
		badge?: string;
		muted?: boolean;
		disabled?: boolean;
		onclick: () => void;
	} = $props();

	let failed = $state<string[]>([]);
	const cover = $derived(sources.find((url) => url && !failed.includes(url)));
</script>

<!-- The root sets the size, the corners and the tint of `.tile`, which the Follow tile shares. -->
<button class="tile" class:bare={!cover} {disabled} {onclick}>
	{#if cover}
		<img
			class="cover"
			src={cover}
			alt=""
			loading="lazy"
			decoding="async"
			referrerpolicy="no-referrer"
			onerror={() => (failed = [...failed, cover!])}
		/>
	{/if}
	{#if badge}<span class="badge">{badge}</span>{/if}
	<span class="caption">
		{#if meta}<span class="meta">{meta}</span>{/if}
		<span class="title" class:muted>{title}</span>
	</span>
</button>

<style>
	.cover {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: scale 300ms;
	}

	.tile:active:not(:disabled) .cover {
		scale: 1.04;
	}

	/* The shade keeps the white text readable on any picture. */
	.tile::after {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			to top,
			rgb(0 0 0 / 0.88),
			rgb(0 0 0 / 0.5) 40%,
			rgb(0 0 0 / 0) 72%
		);
		content: '';
	}

	.tile.bare::after {
		display: none;
	}

	.badge,
	.caption {
		position: absolute;
		z-index: 1;
	}

	.badge {
		top: 0.6em;
		right: 0.6em;
		padding: 0.25em 0.6em;
		border-radius: 999px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-size: 0.62em;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.caption {
		right: 0;
		bottom: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2em;
		padding: 0.7em 0.8em;
		color: white;
	}

	.bare .caption {
		color: var(--card-foreground);
	}

	.meta {
		overflow: hidden;
		font-size: 0.66em;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		white-space: nowrap;
		text-overflow: ellipsis;
		opacity: 0.75;
	}

	.title {
		display: -webkit-box;
		overflow: hidden;
		font-size: 0.95em;
		font-weight: 650;
		line-height: 1.2;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		text-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
	}

	.title.muted {
		font-weight: 400;
		opacity: 0.75;
	}

	.bare .title {
		text-shadow: none;
	}
</style>
