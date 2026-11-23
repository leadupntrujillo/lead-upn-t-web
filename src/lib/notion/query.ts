import type { Client, PageObjectResponse, QueryDataSourceParameters } from '@notionhq/client';
import { collectPaginatedAPI, isFullPage } from './sdk';

/** Lo mínimo del cliente que usa este módulo (facilita probar con un cliente falso). */
export type NotionLike = Pick<Client, 'dataSources' | 'blocks'>;

export interface QueryOptions {
	filter?: QueryDataSourceParameters['filter'];
	sorts?: QueryDataSourceParameters['sorts'];
}

/** Trae TODAS las filas (paginando) de una base de datos de Notion. */
export async function queryRows(
	client: NotionLike,
	dataSourceId: string,
	options: QueryOptions = {},
): Promise<PageObjectResponse[]> {
	const rows = await collectPaginatedAPI(client.dataSources.query, {
		data_source_id: dataSourceId,
		...options,
	});
	return rows.filter((row): row is PageObjectResponse => isFullPage(row));
}
