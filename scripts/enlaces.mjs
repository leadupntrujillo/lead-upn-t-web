// Revisa que todos los enlaces internos (href="/...") de dist/ apunten a una página o archivo que existe.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'dist';
const rotos = new Map();

function* archivos(dir) {
	for (const nombre of readdirSync(dir)) {
		const ruta = join(dir, nombre);
		if (statSync(ruta).isDirectory()) yield* archivos(ruta);
		else if (ruta.endsWith('.html')) yield ruta;
	}
}

function existe(href) {
	const limpio = decodeURIComponent(href.split('#')[0].split('?')[0]).replace(/\/$/, '');
	if (limpio === '') return true;
	return [limpio, `${limpio}.html`, `${limpio}/index.html`].some((r) => existsSync(join(RAIZ, r)));
}

for (const archivo of archivos(RAIZ)) {
	const html = readFileSync(archivo, 'utf8');
	for (const [, href] of html.matchAll(/\shref="(\/[^"/][^"]*|\/)"/g)) {
		if (!existe(href)) rotos.set(`${archivo} → ${href}`, true);
	}
}

if (rotos.size) {
	console.error(`Enlaces internos rotos (${rotos.size}):`);
	for (const r of rotos.keys()) console.error(' -', r);
	process.exit(1);
}
console.log('Enlaces internos: todo bien.');
