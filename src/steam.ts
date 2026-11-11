import type { WidgetApi } from '@edgestation/sdk';

/** A Steam game, as the store search gives it. */
export interface Found {
	id: number;
	name: string;
	/** A 231 × 87 capsule picture. */
	capsule: string;
	/** The 460 × 215 store header, once the widget has it (see `headers`). */
	header?: string;
}

/** A game that the widget follows. */
export interface Game extends Found {
	/** Unix seconds. Later posts show as new. Follow sets it, and each post read moves it. */
	seen: number;
}

export interface Post {
	gid: string;
	title: string;
	author: string;
	/** Unix time in seconds. */
	date: number;
	/** BBCode (see bbcode.ts). */
	contents: string;
}

interface NewsItem {
	gid: string;
	title: string;
	author: string;
	date: number;
	contents: string;
}

interface SearchItem {
	id: number;
	name: string;
	tiny_image: string;
}

async function getJson<T>(api: WidgetApi, url: string): Promise<T> {
	const response = await api.fetch(url);
	if (!response.ok) throw new Error(`Steam answered ${response.status}`);
	return response.json();
}

/**
 * The 5 latest posts of the developers of game `id`, newest first. The feed filter leaves out
 * the press articles that Steam mixes in, some of them in other languages.
 */
export async function news(api: WidgetApi, id: number): Promise<Post[]> {
	const url =
		'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/' +
		`?appid=${id}&count=5&maxlength=0&feeds=steam_community_announcements&format=json`;
	const data = await getJson<{ appnews?: { newsitems?: NewsItem[] } }>(api, url);
	return (data.appnews?.newsitems ?? []).map(({ gid, title, author, date, contents }) => ({
		gid,
		title,
		author,
		date,
		contents
	}));
}

interface StoreItem {
	appid: number;
	type: number;
	assets?: { asset_url_format?: string; header?: string };
}

/** The store item types that add to another app: demo (1), DLC (4) and soundtrack (11). */
const ADD_ONS = [1, 4, 11];

/** The store details of the apps `ids`, in one request that needs no key. */
async function storeItems(api: WidgetApi, ids: number[]): Promise<StoreItem[]> {
	const input = {
		ids: ids.map((appid) => ({ appid })),
		context: { language: 'english', country_code: 'US' },
		data_request: { include_assets: true }
	};
	const url =
		'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/' +
		`?input_json=${encodeURIComponent(JSON.stringify(input))}`;
	type Answer = { response?: { store_items?: StoreItem[] } };
	return (await getJson<Answer>(api, url)).response?.store_items ?? [];
}

/** The header URL of `item`. It holds a hash for newer games, so only the store knows it. */
function headerUrl({ assets }: StoreItem): string | undefined {
	if (!assets?.asset_url_format || !assets.header) return undefined;
	const path = assets.asset_url_format.replace('${FILENAME}', assets.header);
	return `https://shared.akamai.steamstatic.com/store_item_assets/${path}`;
}

/** The store headers of the apps `ids`, by id. */
export async function headers(api: WidgetApi, ids: number[]): Promise<Map<number, string>> {
	const found = new Map<number, string>();
	for (const item of await storeItems(api, ids)) {
		const url = headerUrl(item);
		if (url) found.set(item.appid, url);
	}
	return found;
}

/** The old path of the header. Older games still have it, so it shows before `headers` answers. */
export const classicHeader = (id: number) =>
	`https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`;

/**
 * The store search, which needs no key. It also gives DLCs, demos and soundtracks, and these
 * go. If the store details fail, all the results stay, with no header.
 */
export async function search(api: WidgetApi, term: string): Promise<Found[]> {
	const url =
		'https://store.steampowered.com/api/storesearch/' +
		`?term=${encodeURIComponent(term)}&l=english&cc=US`;
	const data = await getJson<{ items?: SearchItem[] }>(api, url);
	const results: Found[] = (data.items ?? []).map(({ id, name, tiny_image }) => ({
		id,
		name,
		capsule: tiny_image
	}));
	if (!results.length) return results;
	const items = await storeItems(api, results.map((found) => found.id)).catch(() => undefined);
	if (!items) return results;
	const byId = new Map(items.map((item) => [item.appid, item]));
	return results
		.filter((found) => !ADD_ONS.includes(byId.get(found.id)?.type ?? -1))
		.map((found) => {
			const item = byId.get(found.id);
			return { ...found, header: item && headerUrl(item) };
		});
}
