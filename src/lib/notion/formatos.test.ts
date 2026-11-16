import { describe, expect, it } from 'vitest';
import { FORMATOS_INFO, faltantes, type RequisitosInput } from './formatos';
import { FORMATOS } from './schemas';

const completo: RequisitosInput = {
	imagen: { src: 'a.jpg' },
	galeria: [1, 2, 3, 4],
	fechaEvento: '2026-06-01',
	modalidad: 'presencial',
	lugar: { nombre: 'UPN' },
	boton: { url: 'https://x.pe' },
	textoVacio: false,
};
const vacio: RequisitosInput = { imagen: null, galeria: [], fechaEvento: null, modalidad: null, lugar: null, boton: null, textoVacio: true };

describe('formatos', () => {
	it('los 9 formatos tienen nombre y emoji', () => {
		expect(FORMATOS).toHaveLength(9);
		for (const f of FORMATOS) {
			expect(FORMATOS_INFO[f].nombre).toBeTruthy();
			expect(FORMATOS_INFO[f].emoji).toBeTruthy();
		}
	});

	it('con todo completo, ningún formato reporta faltantes', () => {
		for (const f of FORMATOS) expect(faltantes(f, completo)).toEqual([]);
	});

	it('Evento exige fecha, modalidad y (lugar o botón)', () => {
		expect(faltantes('evento', vacio)).toEqual(['Fecha del evento', 'Modalidad', 'Lugar o Link del botón', 'texto dentro de la página']);
		expect(faltantes('evento', { ...completo, lugar: null })).toEqual([]); // con botón basta
		expect(faltantes('evento', { ...completo, lugar: null, boton: null })).toEqual(['Lugar o Link del botón']);
	});

	it('Convocatoria exige fecha límite y link para postular', () => {
		expect(faltantes('convocatoria', { ...completo, fechaEvento: null, boton: null })).toEqual([
			'Fecha del evento (fecha límite)',
			'Link del botón (para postular)',
		]);
	});

	it('Galería exige 4 fotos en Galería; Post IG, al menos 1 foto', () => {
		expect(faltantes('galeria', { ...completo, galeria: [1, 2] })).toEqual(['4 o más fotos en Galería (hay 2)']);
		expect(faltantes('post-ig', { ...completo, imagen: null, galeria: [] })).toHaveLength(1);
		expect(faltantes('post-ig', { ...completo, imagen: { src: 'a' }, galeria: [] })).toEqual([]);
		expect(faltantes('post-ig', { ...completo, textoVacio: true })).toEqual([]); // el texto es opcional
	});

	it('Periódico y Entrevista exigen imagen; Anuncio, Breve y Logros solo texto', () => {
		expect(faltantes('periodico', { ...completo, imagen: null })).toEqual(['Imagen principal']);
		expect(faltantes('entrevista', { ...completo, imagen: null })).toEqual(['Imagen principal (foto de la persona)']);
		for (const f of ['anuncio', 'breve', 'logros'] as const) {
			expect(faltantes(f, { ...vacio, imagen: null })).toEqual(['texto dentro de la página']);
		}
	});
});
