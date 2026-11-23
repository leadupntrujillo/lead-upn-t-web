import { existsSync } from 'node:fs';

let dotenvLoaded = false;

/** Carga `.env` (si existe) en process.env sin pisar variables ya definidas (p. ej. las de Cloudflare Pages). */
function loadDotEnv(): void {
	if (dotenvLoaded) return;
	dotenvLoaded = true;
	if (!existsSync('.env')) return;
	try {
		process.loadEnvFile('.env');
	} catch {
		// Un .env mal formado se reporta abajo como "variable faltante".
	}
}

/**
 * Modo vista previa: incluye novedades en Borrador y En revisión para poder revisarlas en local.
 * Solo funciona con `NOTION_PREVIEW=true` y NUNCA en un build de producción (`astro build`)
 * ni en Cloudflare Pages (`CF_PAGES`), aunque la variable esté puesta.
 */
export function isPreview(): boolean {
	loadDotEnv();
	return process.env.NOTION_PREVIEW === 'true' && process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES;
}

export function requireEnv(name: string): string {
	loadDotEnv();
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(
			`La variable ${name} no está definida o está vacía. Abre .env, pega su valor y guarda el archivo (lista de variables en el README). En Cloudflare Pages: Settings → Variables and Secrets.`,
		);
	}
	return value;
}
