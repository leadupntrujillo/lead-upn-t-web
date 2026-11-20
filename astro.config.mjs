// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

/**
 * true si la página ya generada en dist/ es una redirección (p. ej. un slug anterior de una novedad).
 * @param {string} url
 */
function esRedireccion(url) {
	const ruta = new URL(url).pathname.replace(/\/$/, '') || '/index';
	const archivo = `dist${ruta}.html`;
	return existsSync(archivo) && readFileSync(archivo, 'utf8').includes('http-equiv="refresh"');
}

// https://astro.build/config
export default defineConfig({
	// Dominio oficial: lo usan el sitemap, las URL canónicas y las imágenes al compartir.
	site: 'https://leadupntrujillo.com',
	trailingSlash: 'never',
	build: { format: 'file' },
	// Los scripts siempre como archivos (nunca en línea): así la CSP no necesita 'unsafe-inline' para scripts.
	vite: { build: { assetsInlineLimit: 0 } },
	integrations: [
		sitemap({
			// Ni la 404 ni las redirecciones de slugs anteriores van al sitemap.
			filter: (page) => !page.includes('/404') && !esRedireccion(page),
		}),
	],
});
