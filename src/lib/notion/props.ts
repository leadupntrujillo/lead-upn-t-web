import type { PageObjectResponse } from '@notionhq/client';
import { normalizeId } from './util';

export type Props = PageObjectResponse['properties'];
type Prop = Props[string];

export interface FileItem {
	name: string;
	url: string;
	/** true = archivo subido a Notion (su URL caduca en 1 h y hay que descargarlo). */
	hosted: boolean;
}

export interface PlaceValue {
	nombre: string;
	direccion: string;
	lat: number | null;
	lng: number | null;
}

/**
 * Lee una columna exigiendo que exista y sea del tipo esperado.
 * Si alguien renombra o cambia el tipo de una columna en Notion, el build falla con un
 * mensaje claro en lugar de publicar datos vacíos.
 */
function get<T extends Prop['type']>(props: Props, name: string, type: T): Extract<Prop, { type: T }> {
	const prop = props[name];
	if (!prop) {
		throw new Error(`La columna "${name}" no existe en Notion (¿la renombraron o la borraron?).`);
	}
	if (prop.type !== type) {
		throw new Error(`La columna "${name}" es de tipo "${prop.type}" y se esperaba "${type}".`);
	}
	return prop as Extract<Prop, { type: T }>;
}

const plain = (items: { plain_text: string }[]): string => items.map((t) => t.plain_text).join('');

export const title = (p: Props, name: string): string => plain(get(p, name, 'title').title).trim();
export const text = (p: Props, name: string): string => plain(get(p, name, 'rich_text').rich_text).trim();
export const select = (p: Props, name: string): string | null => get(p, name, 'select').select?.name ?? null;
export const status = (p: Props, name: string): string | null => get(p, name, 'status').status?.name ?? null;
export const multiSelect = (p: Props, name: string): string[] =>
	get(p, name, 'multi_select').multi_select.map((o) => o.name);
export const checkbox = (p: Props, name: string): boolean => get(p, name, 'checkbox').checkbox;
export const number = (p: Props, name: string): number | null => get(p, name, 'number').number;
export const url = (p: Props, name: string): string | null => get(p, name, 'url').url;
export const email = (p: Props, name: string): string | null => get(p, name, 'email').email;
export const date = (p: Props, name: string) => get(p, name, 'date').date;
export const relation = (p: Props, name: string): string[] =>
	get(p, name, 'relation').relation.map((r) => normalizeId(r.id));

export function files(p: Props, name: string): FileItem[] {
	return get(p, name, 'files').files.map((f) =>
		f.type === 'file'
			? { name: f.name, url: f.file.url, hosted: true }
			: { name: f.name, url: f.external.url, hosted: false },
	);
}

/**
 * La columna "Lugar" es de tipo Place. La API pública no lo documenta, así que se lee de
 * forma tolerante: si no se puede leer, devuelve null (y nunca rompe el build).
 */
export function place(p: Props, name: string): PlaceValue | null {
	const prop = p[name] as unknown as { type?: string; place?: Record<string, unknown>; rich_text?: { plain_text: string }[] } | undefined;
	if (!prop) {
		throw new Error(`La columna "${name}" no existe en Notion (¿la renombraron o la borraron?).`);
	}
	if (prop.type === 'rich_text' && prop.rich_text) {
		const nombre = plain(prop.rich_text).trim();
		return nombre ? { nombre, direccion: '', lat: null, lng: null } : null;
	}
	const v = prop.place;
	if (!v) return null;
	const str = (x: unknown): string => (typeof x === 'string' ? x : '');
	const num = (x: unknown): number | null => (typeof x === 'number' ? x : null);
	const nombre = str(v.name);
	const direccion = str(v.address);
	if (!nombre && !direccion) return null;
	return { nombre, direccion, lat: num(v.latitude), lng: num(v.longitude) };
}
