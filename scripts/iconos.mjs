/**
 * Genera los íconos del sitio a partir del símbolo de LEAD (public/brand/lead-mark.svg):
 *   public/favicon.svg, public/favicon.ico (32 px), public/icons/{apple-touch-icon,icon-192,icon-512,icon-maskable-512}.png
 * y la versión móvil de Auki (public/brand/auki-cohete-640.webp).
 *
 * Uso: `pnpm iconos` (solo hace falta volver a correrlo si cambia el símbolo o Auki).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const MARINO = '#161a4e';
const marca = await readFile('public/brand/lead-mark.svg', 'utf8');
// Solo el grupo con los trazos del símbolo (viewBox original: 0 20 720 430).
// El último trazo (una rayita) queda fuera del viewBox y el original lo recorta: aquí se quita.
const grupo = marca
	.slice(marca.indexOf('<g'), marca.lastIndexOf('</g>') + 4)
	.replace(/<path d="M4705 2428[^>]*>/, '')
	.replace(/fill="#000000"/, 'fill="url(#lead-degradado)"');

/**
 * Ícono cuadrado: fondo marino redondeado y el símbolo con el degradado de marca.
 * `margen` = espacio libre a cada lado (los íconos "maskable" necesitan más).
 */
function iconoSvg({ lado = 512, radio = 112, margen = 0.12 } = {}) {
	const ancho = lado * (1 - 2 * margen);
	const escala = ancho / 720;
	const alto = 430 * escala;
	const x = (lado - ancho) / 2;
	// El trazo ocupa más o menos de y=15 a y=385 del viewBox: se compensa para que quede centrado.
	const y = (lado - alto) / 2 - 20 * escala + 15 * escala;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" width="${lado}" height="${lado}">
	<defs>
		<linearGradient id="lead-degradado" x1="0" y1="${(y + 15 * escala).toFixed(1)}" x2="0" y2="${(y + 385 * escala).toFixed(1)}" gradientUnits="userSpaceOnUse">
			<stop offset="0" stop-color="#f0606a"/>
			<stop offset="0.55" stop-color="#d6297a"/>
			<stop offset="1" stop-color="#8c3fd1"/>
		</linearGradient>
	</defs>
	<rect width="${lado}" height="${lado}" rx="${radio}" fill="${MARINO}"/>
	<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${escala.toFixed(5)})">${grupo.replace(
		/fill="url\(#lead-degradado\)"/,
		'fill="#fff"',
	)}</g>
</svg>`;
}

/** El degradado se aplica con una máscara: el símbolo recorta un rectángulo con el degradado. */
function iconoConDegradado(opciones = {}) {
	const lado = opciones.lado ?? 512;
	const base = iconoSvg(opciones);
	const simbolo = base.slice(base.indexOf('<g transform'), base.lastIndexOf('</g>') + 4);
	// Primero se cambia el símbolo por el rectángulo con degradado y después se agrega la máscara.
	return base
		.replace(simbolo, `<rect width="${lado}" height="${lado}" fill="url(#lead-degradado)" mask="url(#m)"/>`)
		.replace('</defs>', `<mask id="m">${simbolo}</mask></defs>`);
}

await mkdir('public/icons', { recursive: true });

const svg = iconoConDegradado({ lado: 64, radio: 14, margen: 0.1 });
await writeFile('public/favicon.svg', svg);

const png = (svgTexto, lado) => sharp(Buffer.from(svgTexto)).resize(lado, lado).png({ compressionLevel: 9 }).toBuffer();

await writeFile('public/icons/icon-192.png', await png(iconoConDegradado({ lado: 512 }), 192));
await writeFile('public/icons/icon-512.png', await png(iconoConDegradado({ lado: 512 }), 512));
// Maskable: sin esquinas redondeadas (las recorta el sistema) y con más margen.
await writeFile('public/icons/icon-maskable-512.png', await png(iconoConDegradado({ lado: 512, radio: 0, margen: 0.22 }), 512));
// iOS redondea solo: fondo completo.
await writeFile('public/icons/apple-touch-icon.png', await png(iconoConDegradado({ lado: 512, radio: 0, margen: 0.16 }), 180));

// favicon.ico con un PNG de 32 px dentro (formato ICO moderno).
const ico32 = await png(iconoConDegradado({ lado: 64, radio: 14, margen: 0.1 }), 32);
const cabecera = Buffer.alloc(22);
cabecera.writeUInt16LE(0, 0); // reservado
cabecera.writeUInt16LE(1, 2); // tipo: ícono
cabecera.writeUInt16LE(1, 4); // una imagen
cabecera.writeUInt8(32, 6); // ancho
cabecera.writeUInt8(32, 7); // alto
cabecera.writeUInt16LE(1, 10); // planos
cabecera.writeUInt16LE(32, 12); // bits por píxel
cabecera.writeUInt32LE(ico32.length, 14);
cabecera.writeUInt32LE(22, 18); // desplazamiento
await writeFile('public/favicon.ico', Buffer.concat([cabecera, ico32]));

// Auki para pantallas chicas (el original mide 1100 px).
await sharp('public/brand/auki-cohete.webp').resize({ width: 640 }).webp({ quality: 80 }).toFile('public/brand/auki-cohete-640.webp');

console.log('Íconos y Auki móvil generados.');
