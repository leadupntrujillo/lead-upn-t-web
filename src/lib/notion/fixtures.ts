/**
 * Constructores de datos falsos con la misma forma que devuelve la API de Notion.
 * Solo para pruebas (vitest): no se importa desde código de la web.
 */
import type { BlockObjectResponse, PageObjectResponse } from '@notionhq/client';
import type { BlockNode } from './blocks';

const annotations = {
	bold: false,
	italic: false,
	strikethrough: false,
	underline: false,
	code: false,
	color: 'default',
};

export const rt = (content: string, extra: Record<string, unknown> = {}, href: string | null = null) => [
	{
		type: 'text',
		text: { content, link: href ? { url: href } : null },
		annotations: { ...annotations, ...extra },
		plain_text: content,
		href,
	},
];

export const prop = {
	title: (s: string) => ({ id: 't', type: 'title', title: s ? rt(s) : [] }),
	text: (s: string) => ({ id: 'x', type: 'rich_text', rich_text: s ? rt(s) : [] }),
	select: (name: string | null) => ({ id: 's', type: 'select', select: name ? { id: name, name, color: 'default' } : null }),
	status: (name: string | null) => ({ id: 'st', type: 'status', status: name ? { id: name, name, color: 'default' } : null }),
	multi: (names: string[]) => ({
		id: 'm',
		type: 'multi_select',
		multi_select: names.map((name) => ({ id: name, name, color: 'default' })),
	}),
	checkbox: (v: boolean) => ({ id: 'c', type: 'checkbox', checkbox: v }),
	number: (v: number | null) => ({ id: 'n', type: 'number', number: v }),
	url: (v: string | null) => ({ id: 'u', type: 'url', url: v }),
	email: (v: string | null) => ({ id: 'e', type: 'email', email: v }),
	date: (start: string | null, end: string | null = null) => ({
		id: 'd',
		type: 'date',
		date: start ? { start, end, time_zone: null } : null,
	}),
	relation: (ids: string[]) => ({ id: 'r', type: 'relation', relation: ids.map((id) => ({ id })), has_more: false }),
	files: (items: Array<{ name: string; url: string; hosted?: boolean }>) => ({
		id: 'f',
		type: 'files',
		files: items.map((f) =>
			f.hosted === false
				? { name: f.name, type: 'external', external: { url: f.url } }
				: { name: f.name, type: 'file', file: { url: f.url, expiry_time: '2030-01-01T00:00:00.000Z' } },
		),
	}),
	place: (name: string, address: string, lat: number, lng: number) => ({
		id: 'p',
		type: 'place',
		place: { name, address, latitude: lat, longitude: lng },
	}),
};

export function page(id: string, properties: Record<string, unknown>): PageObjectResponse {
	return {
		object: 'page',
		id,
		url: `https://www.notion.so/${id.replace(/-/g, '')}`,
		last_edited_time: '2026-08-19T03:23:00.000Z',
		created_time: '2026-03-05T02:44:00.000Z',
		properties,
	} as unknown as PageObjectResponse;
}

export function block(type: string, content: Record<string, unknown>, extra: Partial<BlockNode> = {}): BlockNode {
	return {
		object: 'block',
		id: `${type}-${Math.random().toString(36).slice(2, 8)}`,
		type,
		has_children: false,
		[type]: content,
		...extra,
	} as unknown as BlockNode;
}

export const paragraph = (text: string) => block('paragraph', { rich_text: text ? rt(text) : [], color: 'default' });

/** Cliente falso de Notion: devuelve filas fijas y bloques por id de página/bloque. */
export function fakeClient(rows: PageObjectResponse[], blocksById: Record<string, BlockObjectResponse[]> = {}) {
	const listPage = (results: unknown[]) => Promise.resolve({ object: 'list', results, has_more: false, next_cursor: null });
	return {
		dataSources: { query: () => listPage(rows) },
		blocks: { children: { list: (args: { block_id: string }) => listPage(blocksById[args.block_id] ?? []) } },
	} as never;
}
