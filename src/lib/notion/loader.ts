import type { PageObjectResponse } from '@notionhq/client';
import type { Loader } from 'astro/loaders';
import { getNotion } from './client';
import { requireEnv } from './env';
import type { MappedEntry } from './mappers';
import { queryRows, type NotionLike, type QueryOptions } from './query';

export interface LoaderCtx {
	client: NotionLike;
	warn(message: string): void;
}

export interface NotionLoaderConfig<State> {
	/** Nombre de la colección (solo para los mensajes del log). */
	name: string;
	/** Variable de entorno con el ID de la base de datos (data source). */
	idVar: string;
	/** Filtro y orden de la consulta a Notion (se evalúan en cada sincronización). */
	query?: () => QueryOptions;
	/** Se ejecuta una vez por sincronización antes de mapear (p. ej. para cargar relaciones). */
	begin?: (ctx: LoaderCtx) => Promise<State>;
	map: (page: PageObjectResponse, state: State, ctx: LoaderCtx) => Promise<MappedEntry<Record<string, unknown>> | null>;
}

/**
 * Crea un loader de la Content Layer de Astro que lee una base de datos de Notion.
 * `getClient` existe solo para poder probarlo con un cliente falso.
 */
export function createNotionLoader<State = undefined>(
	config: NotionLoaderConfig<State>,
	getClient: () => NotionLike = getNotion,
): Loader {
	return {
		name: `notion-${config.name}`,
		async load({ store, parseData, generateDigest, logger }) {
			const ctx: LoaderCtx = { client: getClient(), warn: (m) => logger.warn(m) };

			const rows = await queryRows(ctx.client, requireEnv(config.idVar), config.query?.());
			const state = (await config.begin?.(ctx)) as State;

			const entries: Array<{ id: string; data: Record<string, unknown>; html?: string }> = [];
			let invalid = 0;
			for (const page of rows) {
				const mapped = await config.map(page, state, ctx);
				if (!mapped) continue;
				try {
					const data = await parseData({ id: mapped.id, data: mapped.data });
					entries.push({ id: mapped.id, data, html: mapped.html });
				} catch (error) {
					invalid++;
					logger.warn(`Se omite "${mapped.id}" (datos inválidos): ${error instanceof Error ? error.message : String(error)}`);
				}
			}

			// Si todo lo mapeado falló la validación, el problema es de fondo (esquema o columnas): que falle el build.
			if (invalid > 0 && entries.length === 0) {
				throw new Error(`${config.name}: ${invalid} fila(s) no pasaron la validación y ninguna se pudo publicar. Revisa los avisos de arriba.`);
			}

			store.clear();
			for (const { id, data, html } of entries) {
				store.set({
					id,
					data,
					digest: generateDigest({ ...data, html: html ?? '' }),
					...(html !== undefined ? { rendered: { html } } : {}),
				});
			}
			logger.info(`${config.name}: ${entries.length} entrada(s) sincronizada(s) desde Notion.`);
		},
	};
}
