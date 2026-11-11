// Steam posts are BBCode. This turns them into HTML for the reader. All text is escaped, and
// only https URLs reach `src` attributes, so the result is safe to insert. Links stay plain
// text, because a widget cannot open a URL.

const CLAN_IMAGES = 'https://clan.akamai.steamstatic.com/images';

/** The tags that map to one HTML element. Headings move down, under the title of the post. */
const ELEMENTS: Record<string, string> = {
	p: 'p',
	h1: 'h3',
	h2: 'h4',
	h3: 'h5',
	b: 'strong',
	i: 'em',
	u: 'u',
	strike: 's',
	quote: 'blockquote',
	code: 'pre',
	table: 'table',
	tr: 'tr',
	td: 'td',
	th: 'th'
};

/** Steam tags that drop out and keep their text. Other brackets, such as "[PC]", stay as text. */
const DROPPED = ['url', 'spoiler', 'noparse', 'emoticon', 'dynamiclink', 'expand', 'c'];
const OTHERS = ['list', 'olist', '*', 'hr', 'img', 'previewyoutube', 'video'];

const known = (name: string) =>
	Object.hasOwn(ELEMENTS, name) || DROPPED.includes(name) || OTHERS.includes(name);

const BLOCKS = 'p|h3|h4|h5|ul|ol|li|blockquote|pre|table|tr|td|th|figure|video|hr';
/** A tag. A backslash before a bracket makes it text, as in "\[PC]". */
const TAG = /(?<!\\)\[(\/?)(\*|[a-z][a-z0-9]*)(=[^\]]*|\s[^\]]*)?\]/gi;
const unescapeBrackets = (text: string) => text.replace(/\\([[\]])/g, '$1');

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const textHtml = (text: string) => escape(unescapeBrackets(text)).replace(/\r?\n/g, '<br>');

/** `raw` as an https URL with the Steam image host filled in, or `undefined`. */
function safeUrl(raw: string | undefined): string | undefined {
	const url = raw
		?.trim()
		.replace(/^["']|["']$/g, '')
		.replace('{STEAM_CLAN_IMAGE}', CLAN_IMAGES);
	return url && /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : undefined;
}

/** The `name="value"` pairs of a tag, and its `=value` as `value`. */
function attributes(rest = ''): Record<string, string> {
	const found: Record<string, string> = {};
	if (rest.startsWith('=')) found.value = rest.slice(1).replace(/^"|"$/g, '');
	for (const [, name, value] of rest.matchAll(/([a-z0-9_]+)="([^"]*)"/gi)) found[name] = value;
	return found;
}

const image = (src: string | undefined) =>
	src ? `<img src="${escape(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '';

function video(attrs: Record<string, string>): string {
	const sources = (['webm', 'mp4'] as const)
		.map((type) => [type, safeUrl(attrs[type])] as const)
		.filter(([, src]) => src)
		.map(([type, src]) => `<source src="${escape(src!)}" type="video/${type}">`);
	if (!sources.length) return '';
	const poster = safeUrl(attrs.poster);
	const posterAttr = poster ? ` poster="${escape(poster)}"` : '';
	return `<video controls muted preload="none"${posterAttr}>${sources.join('')}</video>`;
}

/** The still of YouTube video `value` ("id;full"), or `undefined` if the id is not valid. */
function youtubeStill(value = ''): string | undefined {
	const id = value.split(';')[0];
	return /^[\w-]{6,20}$/.test(id) ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

/** A still of a YouTube video. The reader cannot play it. */
function youtube(value = ''): string {
	const still = youtubeStill(value);
	return still ? `<figure class="youtube">${image(still)}<figcaption>Video</figcaption></figure>` : '';
}

const COVER = /(?<!\\)\[img(?:\s+src="([^"]*)")?\]([^[]*)|(?<!\\)\[previewyoutube="?([^"\]]*)/i;

/**
 * The picture at the top of a post, for its tile. Only a picture in the first 600 characters
 * counts, because one further down can be a small divider or a meme.
 */
export function coverImage(bbcode: string): string | undefined {
	const match = COVER.exec(bbcode);
	if (!match || match.index > 600) return undefined;
	return match[3] !== undefined ? youtubeStill(match[3]) : safeUrl(match[1] ?? match[2]);
}

export function toHtml(bbcode: string): string {
	let html = '';
	/** One entry for each open list: true while one of its items is open. */
	const lists: boolean[] = [];
	let at = 0;
	TAG.lastIndex = 0;
	for (let match = TAG.exec(bbcode); match; match = TAG.exec(bbcode)) {
		html += textHtml(bbcode.slice(at, match.index));
		at = TAG.lastIndex;
		const [, slash, rawName, rest] = match;
		const name = rawName.toLowerCase();
		const closing = slash === '/';

		if (!known(name)) {
			html += escape(match[0]);
		} else if (Object.hasOwn(ELEMENTS, name)) {
			html += `<${closing ? '/' : ''}${ELEMENTS[name]}>`;
		} else if (name === 'list' || name === 'olist') {
			const tag = name === 'list' ? 'ul' : 'ol';
			if (!closing) {
				lists.push(false);
				html += `<${tag}>`;
			} else if (lists.length) {
				if (lists.pop()) html += '</li>';
				html += `</${tag}>`;
			}
		} else if (name === '*' && lists.length) {
			if (lists.at(-1)) html += '</li>';
			if (!closing) html += '<li>';
			lists[lists.length - 1] = !closing;
		} else if (name === 'hr' && !closing) {
			html += '<hr>';
		} else if (name === 'img' && !closing) {
			const attrs = attributes(rest);
			if (attrs.src) {
				html += image(safeUrl(attrs.src));
			} else {
				// The old form holds the URL between the tags.
				const end = bbcode.toLowerCase().indexOf('[/img]', at);
				const stop = end < 0 ? bbcode.length : end;
				html += image(safeUrl(bbcode.slice(at, stop)));
				at = TAG.lastIndex = stop;
			}
		} else if (name === 'previewyoutube' && !closing) {
			html += youtube(attributes(rest).value);
		} else if (name === 'video' && !closing) {
			html += video(attributes(rest));
		}
	}
	html += textHtml(bbcode.slice(at));
	while (lists.length) html += lists.pop() ? '</li></ul>' : '</ul>';
	// Line breaks next to blocks would add empty lines.
	return html
		.replace(new RegExp(`(?:<br>\\s*)+(?=</?(?:${BLOCKS})\\b)`, 'g'), '')
		.replace(new RegExp(`(</?(?:${BLOCKS})\\b[^>]*>)(?:\\s*<br>)+`, 'g'), '$1');
}

/** The text of a post on one line, cut at `max` characters, for the list. */
export function plainText(bbcode: string, max: number): string {
	const stripped = bbcode
		.replace(/\[img\][^[]*\[\/img\]/gi, ' ')
		.replace(TAG, (tag, _slash, name: string) => (known(name.toLowerCase()) ? ' ' : tag));
	const text = unescapeBrackets(stripped)
		.replace(/\s+/g, ' ')
		.trim();
	return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
