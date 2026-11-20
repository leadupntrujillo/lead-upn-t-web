import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import sharp from 'sharp';

/**
 * Imágenes para compartir (Open Graph, 1200×630) generadas al compilar: el título en Anton
 * sobre el fondo de la marca y, si hay, la foto de la novedad a la derecha.
 */

export const ANCHO = 1200;
export const ALTO = 630;
const FOTO = 470;
// Satori suma el padding a la altura (content-box): la columna mide ALTO menos el padding vertical.
const PAD = { arriba: 56, abajo: 72, lado: 64 };
const ALTO_UTIL = ALTO - PAD.arriba - PAD.abajo;
const PADDING = `${PAD.arriba}px ${PAD.lado}px ${PAD.abajo}px`;

const MARINO = '#161a4e';
const AUKI_ANCHO = 860;
const NOCHE = '#0b0e33';
const DEGRADADO = 'linear-gradient(90deg, #f0606a, #d6297a 55%, #8c3fd1)';

// ---------- Recursos (se cargan una vez) ----------

const require = createRequire(import.meta.url);
const fuente = (paquete: string, archivo: string) => readFile(resolve(require.resolve(`${paquete}/package.json`), '..', 'files', archivo));

let recursos: Promise<{ fuentes: Parameters<typeof satori>[1]['fonts']; simbolo: string; auki: string }> | undefined;

/** El símbolo de LEAD con el degradado, como PNG transparente (data URI). */
async function simboloPng(): Promise<string> {
	const marca = await readFile(resolve(process.cwd(), 'public/brand/lead-mark.svg'), 'utf8');
	const grupo = marca
		.slice(marca.indexOf('<g'), marca.lastIndexOf('</g>') + 4)
		.replace(/<path d="M4705 2428[^>]*>/, '')
		.replace(/fill="#000000"/, 'fill="#fff"');
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 20 720 430" width="720" height="430">
		<defs>
			<linearGradient id="g" x1="0" y1="35" x2="0" y2="405" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#f0606a"/><stop offset="0.55" stop-color="#d6297a"/><stop offset="1" stop-color="#8c3fd1"/>
			</linearGradient>
			<mask id="m">${grupo}</mask>
		</defs>
		<rect x="0" y="20" width="720" height="430" fill="url(#g)" mask="url(#m)"/>
	</svg>`;
	const png = await sharp(Buffer.from(svg)).resize({ width: 240 }).png().toBuffer();
	return `data:image/png;base64,${png.toString('base64')}`;
}

function cargarRecursos() {
	recursos ??= (async () => {
		const [anton, poppins, simbolo, aukiPng] = await Promise.all([
			fuente('@fontsource/anton', 'anton-latin-400-normal.woff'),
			fuente('@fontsource/poppins', 'poppins-latin-600-normal.woff'),
			simboloPng(),
			sharp(resolve(process.cwd(), 'public/brand/auki-cohete.webp')).resize(AUKI_ANCHO, ALTO, { fit: 'cover', position: 'right' }).png().toBuffer(),
		]);
		return {
			fuentes: [
				{ name: 'Anton', data: anton, weight: 400 as const, style: 'normal' as const },
				{ name: 'Poppins', data: poppins, weight: 600 as const, style: 'normal' as const },
			],
			simbolo,
			auki: `data:image/png;base64,${aukiPng.toString('base64')}`,
		};
	})();
	return recursos;
}

// ---------- Mini "JSX" para satori ----------

type Nodo = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown>, ...children: Array<Nodo | string | null | false>): Nodo => ({
	type,
	props: { ...props, children: children.filter((c) => c !== null && c !== false) },
});

const marca = (simbolo: string) =>
	h(
		'div',
		{ style: { display: 'flex', alignItems: 'center', gap: 18 } },
		h('img', { src: simbolo, width: 92, height: 55 }),
		h(
			'div',
			{ style: { display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Poppins', fontSize: 26, color: '#fff', letterSpacing: 6 } },
			'LEAD',
			h('div', { style: { width: 3, height: 30, background: '#d6297a' } }),
			h('span', { style: { fontFamily: 'Anton', letterSpacing: 1, fontSize: 32 } }, 'UPN TRUJILLO'),
		),
	);

const fondo = {
	display: 'flex',
	width: ANCHO,
	height: ALTO,
	backgroundColor: NOCHE,
	backgroundImage: `radial-gradient(circle at 100% 0%, rgba(140,63,209,0.45), transparent 55%), radial-gradient(circle at 0% 100%, rgba(214,41,122,0.3), transparent 55%)`,
	position: 'relative' as const,
};

const barra = h('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, backgroundImage: DEGRADADO } });

async function aPng(nodo: Nodo): Promise<Buffer> {
	const { fuentes } = await cargarRecursos();
	const svg = await satori(nodo as never, { width: ANCHO, height: ALTO, fonts: fuentes });
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: ANCHO } }).render().asPng();
	// Recomprimir con sharp: las tarjetas pesan bastante menos.
	return sharp(png).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
}

// ---------- Tarjetas ----------

export interface TarjetaNovedad {
	titulo: string;
	/** "Evento · 22 may" */
	etiqueta: string;
	/** Ruta en disco de la foto (ya optimizada) o null. */
	foto: string | null;
}

/** Tamaño del título según su largo, para que siempre quepa en 4 líneas. */
export function tamanoTitulo(titulo: string, conFoto: boolean): number {
	const n = titulo.length * (conFoto ? 1.35 : 1);
	if (n <= 34) return 92;
	if (n <= 60) return 76;
	if (n <= 95) return 62;
	return 52;
}

export async function tarjetaNovedad(t: TarjetaNovedad): Promise<Buffer> {
	const { simbolo } = await cargarRecursos();
	let foto: string | null = null;
	if (t.foto && existsSync(t.foto)) {
		const jpg = await sharp(t.foto).resize(FOTO, ALTO, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82 }).toBuffer();
		foto = `data:image/jpeg;base64,${jpg.toString('base64')}`;
	}
	const ancho = foto ? ANCHO - FOTO : ANCHO;

	return aPng(
		h(
			'div',
			{ style: fondo },
			h(
				'div',
				{
					style: {
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						width: ancho - 2 * PAD.lado,
						height: ALTO_UTIL,
						padding: PADDING,
					},
				},
				marca(simbolo),
				h(
					'div',
					{ style: { display: 'flex', flexDirection: 'column', gap: 22 } },
					h(
						'div',
						{
							style: {
								display: 'flex',
								alignSelf: 'flex-start',
								padding: '8px 22px',
								borderRadius: 999,
								backgroundColor: 'rgba(255,255,255,0.12)',
								color: '#fff',
								fontFamily: 'Poppins',
								fontSize: 24,
								textTransform: 'uppercase',
								letterSpacing: 2,
							},
						},
						t.etiqueta,
					),
					h(
						'div',
						{
							style: {
								display: 'block',
								fontFamily: 'Anton',
								fontSize: tamanoTitulo(t.titulo, Boolean(foto)),
								lineHeight: 1.05,
								color: '#fff',
								textTransform: 'uppercase',
								lineClamp: 4,
							},
						},
						t.titulo,
					),
				),
			),
			foto &&
				h(
					'div',
					{ style: { display: 'flex', width: FOTO, height: ALTO, position: 'relative' } },
					h('img', { src: foto, width: FOTO, height: ALTO, style: { objectFit: 'cover' } }),
					// Fundido hacia el texto
					h('div', {
						style: {
							position: 'absolute',
							left: 0,
							top: 0,
							width: 140,
							height: ALTO,
							backgroundImage: `linear-gradient(90deg, ${NOCHE}, rgba(11,14,51,0))`,
						},
					}),
				),
			barra,
		),
	);
}

/** Tarjeta por defecto (inicio y páginas sin imagen propia): el lema y Auki. */
export async function tarjetaSitio(): Promise<Buffer> {
	const { simbolo, auki } = await cargarRecursos();
	const lema: Array<[string, string]> = [
		['Learn', '#f0606a'],
		['Explore', '#e86bb0'],
		['Aspire', '#b394f4'],
		['Discover.', '#ffffff'],
	];
	return aPng(
		h(
			'div',
			{ style: { ...fondo, backgroundColor: MARINO, backgroundImage: 'none' } },
			// Auki a toda altura, fundido hacia el lema (igual que en el hero de la web).
			h('img', { src: auki, width: AUKI_ANCHO, height: ALTO, style: { position: 'absolute', left: ANCHO - AUKI_ANCHO, top: 0, objectFit: 'cover' } }),
			h('div', {
				style: {
					position: 'absolute',
					left: ANCHO - AUKI_ANCHO,
					top: 0,
					width: 420,
					height: ALTO,
					backgroundImage: `linear-gradient(90deg, ${MARINO}, rgba(22,26,78,0))`,
				},
			}),
			h(
				'div',
				{
					style: {
						position: 'absolute',
						left: 0,
						top: 0,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						width: ANCHO - 2 * PAD.lado,
						height: ALTO_UTIL,
						padding: PADDING,
					},
				},
				marca(simbolo),
				h(
					'div',
					{ style: { display: 'flex', flexDirection: 'column' } },
					...lema.map(([palabra, color]) =>
						h('div', { style: { fontFamily: 'Anton', fontSize: 92, lineHeight: 1, color, textTransform: 'uppercase' } }, palabra),
					),
				),
			),
			barra,
		),
	);
}
