import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import type { FileRef } from './assets';

/**
 * Imágenes optimizadas (B2). Cada foto de Notion se descarga una vez a `.cache/notion/`
 * y se convierte a WebP en hasta 3 anchos (480/960/1600) dentro de `public/_notion/`.
 * Se guarda su ancho y alto para que la página no "salte" al cargar.
 */

export interface ImageRef {
	src: string;
	alt: string;
	width: number | null;
	height: number | null;
	/** "url 480w, url 960w, ..." (vacío si la imagen no se pudo optimizar, p. ej. SVG). */
	srcset: string;
}

export const ANCHOS = [480, 960, 1600] as const;
/** El `src` por defecto (navegadores sin srcset y la imagen para compartir). */
const ANCHO_BASE = 960;
const CALIDAD = 78;

const CACHE_DIR = resolve(process.cwd(), '.cache', 'notion');
const OUT_DIR = resolve(process.cwd(), 'public', '_notion');
const PUBLIC_PREFIX = '/_notion';
const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic', '.heif']);

/** Anchos a generar para una imagen de `original` px: nunca se agranda. */
export function anchosPara(original: number): number[] {
	const out = new Set<number>();
	for (const w of ANCHOS) out.add(Math.min(w, original));
	return [...out].sort((a, b) => a - b);
}

/** Ancho que va en `src`: el de 960 o el mayor disponible por debajo. */
export function anchoBase(anchos: number[]): number {
	return anchos.filter((w) => w <= ANCHO_BASE).at(-1) ?? anchos[0]!;
}

async function descargar(file: FileRef, hash: string, ext: string): Promise<string> {
	const dest = join(CACHE_DIR, `${hash}${ext}`);
	if (existsSync(dest)) return dest;
	const res = await fetch(file.url);
	if (!res.ok) throw new Error(`No se pudo descargar una imagen de Notion (HTTP ${res.status}).`);
	await mkdir(CACHE_DIR, { recursive: true });
	await writeFile(dest, Buffer.from(await res.arrayBuffer()));
	return dest;
}

const sinOptimizar = (src: string, alt: string): ImageRef => ({ src, alt, width: null, height: null, srcset: '' });

export async function resolveImage(file: FileRef, alt: string): Promise<ImageRef> {
	const source = new URL(file.url);
	// Las URLs de Notion llevan una firma que cambia: el nombre sale de la ruta sin la firma.
	const hash = createHash('sha1').update(source.origin + source.pathname).digest('hex').slice(0, 16);
	const ext = extname(source.pathname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6) || '.bin';

	let original: string;
	try {
		original = await descargar(file, hash, ext);
	} catch (error) {
		// Un enlace externo caído no debe romper el build: se deja la URL tal cual.
		if (!file.hosted) return sinOptimizar(file.url, alt);
		throw error;
	}

	await mkdir(OUT_DIR, { recursive: true });

	// SVG, GIF (pueden ser animados) y formatos raros se publican sin tocar.
	if (!RASTER.has(ext)) {
		const name = `${hash}${ext}`;
		if (!existsSync(join(OUT_DIR, name))) await copyFile(original, join(OUT_DIR, name));
		return sinOptimizar(`${PUBLIC_PREFIX}/${name}`, alt);
	}

	const input = await readFile(original);
	const meta = await sharp(input).rotate().metadata();
	// `rotate()` aplica la orientación EXIF: si la foto está girada, ancho y alto se intercambian.
	const girada = (meta.orientation ?? 1) >= 5;
	const w0 = (girada ? meta.height : meta.width) ?? ANCHO_BASE;
	const h0 = (girada ? meta.width : meta.height) ?? Math.round(ANCHO_BASE * 0.5625);

	const anchos = anchosPara(w0);
	const urls: Array<{ w: number; url: string }> = [];
	for (const w of anchos) {
		const name = `${hash}-${w}.webp`;
		const dest = join(OUT_DIR, name);
		if (!existsSync(dest)) {
			await sharp(input).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: CALIDAD }).toFile(dest);
		}
		urls.push({ w, url: `${PUBLIC_PREFIX}/${name}` });
	}

	const mayor = anchos.at(-1)!;
	return {
		src: urls.find((u) => u.w === anchoBase(anchos))!.url,
		alt,
		width: mayor,
		height: Math.round((h0 / w0) * mayor),
		srcset: urls.map((u) => `${u.url} ${u.w}w`).join(', '),
	};
}

/** Ruta en disco de un archivo de `public/` a partir de su URL (`/_notion/x.webp`). */
export const rutaPublica = (src: string): string => resolve(process.cwd(), 'public', src.replace(/^\//, ''));
