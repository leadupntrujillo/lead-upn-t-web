import { Texture } from 'three';
import type { GLTFLoaderPlugin, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Texturas del GLB sin URLs `blob:` (para respetar la CSP del sitio).
 *
 * El GLTFLoader saca cada imagen del GLB creando una URL `blob:` y la lee con `fetch`, y la CSP
 * (`connect-src 'self'`) lo bloquea: en producción Auki quedaría sin textura. Este plugin le da al
 * parser un cargador que decodifica los bytes directamente con `createImageBitmap`, por el mismo
 * camino que el GLTFLoader ya usa para KTX2 (`loader.parse(bufferView)`), con las mismas opciones
 * que su ImageBitmapLoader. Resultado idéntico, sin tocar la CSP.
 */

/** Tipo MIME por los primeros bytes (el GLB guarda WebP; PNG y JPEG por si acaso). */
export function tipoDeImagen(b: Uint8Array): string {
	if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
	if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
	if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
		return 'image/webp';
	return '';
}

export function texturasSinUrl(parser: GLTFParser): GLTFLoaderPlugin {
	if (typeof createImageBitmap === 'function') {
		const cargador = {
			// El GLTFLoader le pasa los bytes de la imagen (bufferView) a los cargadores con esta marca
			isKTX2Loader: true,
			parse(datos: ArrayBuffer, alListo: (t: Texture) => void, alFallar: (e: unknown) => void) {
				const blob = new Blob([datos], { type: tipoDeImagen(new Uint8Array(datos, 0, 12)) });
				createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }).then((imagen) => {
					const textura = new Texture(imagen);
					textura.needsUpdate = true;
					alListo(textura);
				}, alFallar);
			},
		};
		parser.textureLoader = cargador as unknown as GLTFParser['textureLoader'];
	}
	return { name: 'LEAD_texturas_sin_url' };
}
