import { describe, expect, it } from 'vitest';
import { tipoDeImagen } from './texturas';

describe('tipo de imagen por sus primeros bytes', () => {
	it('reconoce WebP, PNG y JPEG', () => {
		const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
		expect(tipoDeImagen(webp)).toBe('image/webp');
		expect(tipoDeImagen(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/png');
		expect(tipoDeImagen(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
		expect(tipoDeImagen(new Uint8Array(12))).toBe('');
	});
});
