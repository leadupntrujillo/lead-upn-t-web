import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const OUT_DIR = resolve(process.cwd(), 'public', '_notion');
const PUBLIC_PREFIX = '/_notion';

export interface FileRef {
	url: string;
	/** true = subido a Notion (hay que descargarlo); false = enlace externo (se deja tal cual). */
	hosted: boolean;
}

/**
 * Los archivos subidos a Notion tienen URLs firmadas que caducan en ~1 hora, así que se
 * descargan a `public/_notion/` durante el build. El nombre sale de un hash de la ruta
 * (sin la firma), por lo que no se vuelve a descargar lo que ya existe.
 */
export async function resolveFile(file: FileRef): Promise<string> {
	if (!file.hosted) return file.url;

	const source = new URL(file.url);
	const hash = createHash('sha1').update(source.origin + source.pathname).digest('hex').slice(0, 16);
	const ext = extname(source.pathname).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 6) || '.bin';
	const name = `${hash}${ext}`;
	const dest = join(OUT_DIR, name);

	if (!existsSync(dest)) {
		const res = await fetch(file.url);
		if (!res.ok) {
			throw new Error(`No se pudo descargar un archivo de Notion (HTTP ${res.status}).`);
		}
		await mkdir(OUT_DIR, { recursive: true });
		await writeFile(dest, Buffer.from(await res.arrayBuffer()));
	}
	return `${PUBLIC_PREFIX}/${name}`;
}
