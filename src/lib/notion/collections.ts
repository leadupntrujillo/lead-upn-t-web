import { resolveFile } from './assets';
import { fetchBlockTree } from './blocks';
import { getNotion } from './client';
import { requireEnv } from './env';
import { createNotionLoader } from './loader';
import { mapAliado, mapCifra, mapMiembro, mapNovedad, mapPilar, mapTestimonio } from './mappers';
import { queryRows, type QueryOptions } from './query';
import { memoTtl, normalizeId, todayInLima } from './util';

/**
 * Configuración de cada colección: qué base de Notion lee, qué filas trae y cómo las mapea.
 * Las reglas de publicación viven aquí (y en los mapeadores): ver CLAUDE.md.
 */

const byOrden: QueryOptions['sorts'] = [{ property: 'Orden', direction: 'ascending' }];
const checked = (property: string) => ({ property, checkbox: { equals: true } }) as const;

// Los loaders se ejecutan en paralelo; estas consultas se comparten durante 20 s.
const pilaresQuery = (): QueryOptions => ({ filter: checked('Activo'), sorts: byOrden });

const activePilarIds = memoTtl(async () => {
	const rows = await queryRows(getNotion(), requireEnv('NOTION_PILARES_ID'), pilaresQuery());
	return new Set(rows.map((r) => normalizeId(r.id)));
}, 20_000);

const allMiembroIds = memoTtl(async () => {
	const rows = await queryRows(getNotion(), requireEnv('NOTION_MIEMBROS_ID'));
	return new Set(rows.map((r) => normalizeId(r.id)));
}, 20_000);

const only = (ids: string[], valid: ReadonlySet<string>): string[] => ids.filter((id) => valid.has(id));
const onlyOne = (id: string | null, valid: ReadonlySet<string>): string | null => (id && valid.has(id) ? id : null);

export const novedadesLoader = () =>
	createNotionLoader({
		name: 'novedades',
		idVar: 'NOTION_NOVEDADES_ID',
		query: () => ({
			filter: {
				and: [
					{ property: 'Estado', status: { equals: 'Publicado' } },
					{ property: 'Fecha de publicación', date: { on_or_before: todayInLima() } },
				],
			},
			sorts: [{ property: 'Fecha de publicación', direction: 'descending' }],
		}),
		begin: async () => ({
			pilarIds: await activePilarIds(),
			miembroIds: await allMiembroIds(),
			usedSlugs: new Set<string>(),
		}),
		map: (page, state, ctx) =>
			mapNovedad(page, {
				...state,
				resolveFile,
				warn: ctx.warn,
				getBody: (id) => fetchBlockTree(ctx.client, id),
			}),
	});

export const pilaresLoader = () =>
	createNotionLoader({
		name: 'pilares',
		idVar: 'NOTION_PILARES_ID',
		query: pilaresQuery,
		map: (page, _state, ctx) => mapPilar(page, { resolveFile, warn: ctx.warn }),
	});

export const miembrosLoader = () =>
	createNotionLoader({
		name: 'miembros',
		idVar: 'NOTION_MIEMBROS_ID',
		query: () => ({ sorts: byOrden }),
		begin: activePilarIds,
		map: async (page, pilarIds, ctx) => {
			const mapped = await mapMiembro(page, { resolveFile, warn: ctx.warn });
			if (mapped) mapped.data.pilares = only(mapped.data.pilares, pilarIds);
			return mapped;
		},
	});

export const testimoniosLoader = () =>
	createNotionLoader({
		name: 'testimonios',
		idVar: 'NOTION_TESTIMONIOS_ID',
		query: () => ({
			filter: { and: [checked('Publicar en la web'), checked('Autoriza uso de imagen')] },
			sorts: byOrden,
		}),
		begin: activePilarIds,
		map: async (page, pilarIds, ctx) => {
			const mapped = await mapTestimonio(page, { resolveFile, warn: ctx.warn });
			if (mapped) mapped.data.pilar = onlyOne(mapped.data.pilar, pilarIds);
			return mapped;
		},
	});

export const aliadosLoader = () =>
	createNotionLoader({
		name: 'aliados',
		idVar: 'NOTION_ALIADOS_ID',
		query: () => ({ filter: checked('Mostrar en la web'), sorts: byOrden }),
		begin: activePilarIds,
		map: async (page, pilarIds, ctx) => {
			const mapped = await mapAliado(page, { resolveFile, warn: ctx.warn });
			if (mapped) mapped.data.pilar = onlyOne(mapped.data.pilar, pilarIds);
			return mapped;
		},
	});

export const cifrasLoader = () =>
	createNotionLoader({
		name: 'cifras',
		idVar: 'NOTION_CIFRAS_ID',
		query: () => ({ filter: checked('Mostrar en la web'), sorts: byOrden }),
		map: (page, _state, ctx) => mapCifra(page, { resolveFile, warn: ctx.warn }),
	});
