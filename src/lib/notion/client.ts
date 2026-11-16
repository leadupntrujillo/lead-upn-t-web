import type { Client as NotionClient } from '@notionhq/client';
import { requireEnv } from './env';
import { Client } from './sdk';

let client: NotionClient | undefined;

/** Cliente único de la API de Notion (se crea al primer uso). */
export function getNotion(): NotionClient {
	client ??= new Client({ auth: requireEnv('NOTION_TOKEN') });
	return client;
}
