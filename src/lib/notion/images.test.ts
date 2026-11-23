import { describe, expect, it } from 'vitest';
import { anchoBase, anchosPara, pareceHtml } from './images';

describe('anchos de imagen', () => {
	it('genera 480/960/1600 sin agrandar fotos pequeñas', () => {
		expect(anchosPara(4000)).toEqual([480, 960, 1600]);
		expect(anchosPara(1200)).toEqual([480, 960, 1200]);
		expect(anchosPara(300)).toEqual([300]);
	});

	it('el src por defecto es el de 960 o el mayor disponible por debajo', () => {
		expect(anchoBase([480, 960, 1600])).toBe(960);
		expect(anchoBase([480, 700])).toBe(700);
		expect(anchoBase([300])).toBe(300);
	});
});

describe('archivos que no son imágenes', () => {
	it('reconoce una página web descargada en lugar de una foto', () => {
		expect(pareceHtml(Buffer.from('<!doctype html><html><title>Google Drive: Sign-in</title>'))).toBe(true);
		expect(pareceHtml(Buffer.from('  <HTML lang="es">'))).toBe(true);
		expect(pareceHtml(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
	});
});
