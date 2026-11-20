import { describe, expect, it } from 'vitest';
import { absoluta, isoLima, jsonLdSeguro, migas, novedadLd, organizacion, recortar, type NovedadLdInput } from './seo';

const base: NovedadLdInput = {
	titulo: 'LEAD TARS',
	descripcion: 'Concurso de origami.',
	ruta: '/novedades/lead-tars',
	imagenes: ['/_notion/abc-960.webp'],
	formato: 'periodico',
	fechaPublicacion: new Date('2026-05-22'),
	actualizado: new Date('2026-05-23T10:00:00Z'),
	fechaEvento: null,
	modalidad: null,
	lugar: null,
	boton: null,
	autor: 'Axel C.',
};

describe('seo', () => {
	it('arma URLs absolutas con el dominio', () => {
		expect(absoluta('/novedades')).toBe('https://leadupntrujillo.com/novedades');
		expect(absoluta('https://otro.com/a')).toBe('https://otro.com/a');
		expect(absoluta('/x', 'http://localhost:4321')).toBe('http://localhost:4321/x');
	});

	it('recorta descripciones sin partir palabras', () => {
		expect(recortar('corto')).toBe('corto');
		const largo = 'palabra '.repeat(40);
		const out = recortar(largo, 50);
		expect(out.length).toBeLessThanOrEqual(50);
		expect(out.endsWith('palabra…')).toBe(true);
	});

	it('escapa < para que el JSON-LD no cierre la etiqueta', () => {
		expect(jsonLdSeguro({ a: '</script>' })).not.toContain('</script>');
	});

	it('expresa las horas en hora de Lima', () => {
		expect(isoLima(new Date('2026-05-22T23:00:00Z'))).toBe('2026-05-22T18:00:00-05:00');
	});

	it('la organización incluye solo las redes con enlace', () => {
		const org = organizacion({ nombre: 'LEAD', descripcion: 'x', correo: null, redes: { instagram: 'https://ig.com/lead', tiktok: null } });
		expect(org.sameAs).toEqual(['https://ig.com/lead']);
		expect(org).not.toHaveProperty('email');
	});

	it('las migas numeran desde 1 con URLs absolutas', () => {
		const m = migas([
			{ nombre: 'Inicio', ruta: '/' },
			{ nombre: 'Novedades', ruta: '/novedades' },
		]);
		expect(m.itemListElement[1]).toMatchObject({ position: 2, item: 'https://leadupntrujillo.com/novedades' });
	});

	it('una novedad normal es NewsArticle con su autor', () => {
		const ld = novedadLd(base);
		expect(ld['@type']).toBe('NewsArticle');
		expect(ld).toMatchObject({ datePublished: '2026-05-22', author: { name: 'Axel C.' } });
		expect((ld as { image: string[] }).image[0]).toBe('https://leadupntrujillo.com/_notion/abc-960.webp');
	});

	it('un evento con fecha es Event, con lugar y modalidad', () => {
		const ld = novedadLd({
			...base,
			formato: 'evento',
			fechaEvento: { inicio: new Date('2026-05-22T23:00:00Z'), fin: null, conHora: true },
			modalidad: 'hibrido',
			lugar: { nombre: 'UPN San Isidro', direccion: 'Calle 31, Trujillo' },
			boton: { texto: 'Inscríbete', url: 'https://forms.gle/x' },
		});
		expect(ld).toMatchObject({
			'@type': 'Event',
			startDate: '2026-05-22T18:00:00-05:00',
			eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
		});
		expect((ld as { location: unknown[] }).location).toHaveLength(2);
	});

	it('un evento sin fecha cae en NewsArticle', () => {
		expect(novedadLd({ ...base, formato: 'evento' })['@type']).toBe('NewsArticle');
	});
});
