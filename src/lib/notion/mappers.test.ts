import { describe, expect, it, vi } from 'vitest';
import { page, paragraph, prop } from './fixtures';
import {
	instagramHandle,
	mapAliado,
	mapCifra,
	mapMiembro,
	mapNovedad,
	mapPilar,
	mapTestimonio,
	type NovedadDeps,
} from './mappers';
import { aliadoSchema, cifraSchema, miembroSchema, novedadSchema, pilarSchema, testimonioSchema } from './schemas';

const PILAR = '4196acb145f5811b851cc603674d8fab';
const AUTOR = '31a6acb145f5804c9bf3d02356982e9e';

function novedadProps(over: Record<string, unknown> = {}) {
	return {
		Título: prop.title('LEAD TARS'),
		Slug: prop.text('lead-tars'),
		Resumen: prop.text('Concurso de origami con enfoque STEM.'),
		Estado: prop.status('Publicado'),
		Formato: prop.select('Periódico'),
		Pilar: prop.relation(['4196acb1-45f5-811b-851c-c603674d8fab']),
		Autor: prop.relation(['31a6acb1-45f5-804c-9bf3-d02356982e9e']),
		'Imagen principal': prop.files([{ name: 'P-tars.jpg', url: 'https://s3.amazonaws.com/ws/id/P-tars.jpg?X-Amz-Signature=abc' }]),
		Galería: prop.files([]),
		'Texto alternativo': prop.text('Participantes armando naves'),
		'Fecha de publicación': prop.date('2026-05-22'),
		'Fecha del evento': prop.date('2026-05-22'),
		Modalidad: prop.select('Híbrido'),
		Lugar: prop.place('UPN Sede San Isidro', 'Calle 31, Trujillo', -8.09522, -79.04967),
		'Texto del botón': prop.text(''),
		'Link del botón': prop.url(null),
		Etiquetas: prop.multi(['Origami', 'STEM']),
		Destacado: prop.select('Portada'),
		'Tiempo de lectura': prop.number(null),
		'Descripción SEO': prop.text(''),
		...over,
	};
}

function deps(over: Partial<NovedadDeps> = {}): NovedadDeps & { warn: ReturnType<typeof vi.fn> } {
	return {
		pilarIds: new Set([PILAR]),
		miembroIds: new Set([AUTOR]),
		usedSlugs: new Set<string>(),
		getBody: async () => [paragraph('Cuerpo de la noticia con varias palabras de prueba.')],
		resolveFile: async (f) => (f.hosted ? '/_notion/abc.jpg' : f.url),
		warn: vi.fn(),
		...over,
	} as NovedadDeps & { warn: ReturnType<typeof vi.fn> };
}

describe('mapNovedad', () => {
	it('mapea una novedad completa y pasa la validación del esquema', async () => {
		const d = deps();
		const out = await mapNovedad(page('31a6acb1-45f5-804a-90db-f4f7d52f0078', novedadProps()), d);
		expect(out).not.toBeNull();
		const parsed = novedadSchema.parse(out!.data);

		expect(out!.id).toBe('lead-tars');
		expect(parsed).toMatchObject({
			slug: 'lead-tars',
			titulo: 'LEAD TARS',
			formato: 'periodico',
			modalidad: 'hibrido',
			destacado: 'portada',
			pilar: PILAR,
			autor: AUTOR,
			etiquetas: ['Origami', 'STEM'],
			tiempoLectura: 1,
			seoDescripcion: 'Concurso de origami con enfoque STEM.',
			imagen: { src: '/_notion/abc.jpg', alt: 'Participantes armando naves' },
			lugar: { nombre: 'UPN Sede San Isidro', lat: -8.09522 },
			fechaEvento: { fin: null, conHora: false },
		});
		expect(out!.html).toContain('<p>Cuerpo de la noticia');
		expect(d.warn).not.toHaveBeenCalled();
	});

	it('usa el tiempo de lectura manual si existe', async () => {
		const out = await mapNovedad(page('a', novedadProps({ 'Tiempo de lectura': prop.number(7) })), deps());
		expect(out!.data.tiempoLectura).toBe(7);
	});

	it('calcula el tiempo de lectura (200 palabras/min) cuando está vacío', async () => {
		const words = Array.from({ length: 450 }, () => 'palabra').join(' ');
		const out = await mapNovedad(page('a', novedadProps()), deps({ getBody: async () => [paragraph(words)] }));
		expect(out!.data.tiempoLectura).toBe(3);
	});

	it('genera el slug desde el título si no hay uno y evita repetidos', async () => {
		const d = deps();
		const a = await mapNovedad(page('a', novedadProps({ Slug: prop.text(''), Título: prop.title('Gran Final ¡2026!') })), d);
		const b = await mapNovedad(page('b', novedadProps({ Slug: prop.text(''), Título: prop.title('Gran Final 2026') })), d);
		expect(a!.id).toBe('gran-final-2026');
		expect(b!.id).toBe('gran-final-2026-2');
		expect(d.warn).toHaveBeenCalledWith(expect.stringContaining('repetido'));
	});

	it('omite (con aviso) si falta título, resumen o fecha de publicación', async () => {
		for (const missing of [{ Título: prop.title('') }, { Resumen: prop.text('') }, { 'Fecha de publicación': prop.date(null) }]) {
			const d = deps();
			expect(await mapNovedad(page('a', novedadProps(missing)), d)).toBeNull();
			expect(d.warn).toHaveBeenCalledTimes(1);
		}
	});

	it('usa "periodico" y avisa si el Formato es desconocido o está vacío', async () => {
		const d = deps();
		const out = await mapNovedad(page('a', novedadProps({ Formato: prop.select('Revista') })), d);
		expect(out!.data.formato).toBe('periodico');
		expect(d.warn).toHaveBeenCalledWith(expect.stringContaining('Formato'));
	});

	it('reconoce todos los formatos con acentos y espacios', async () => {
		const casos: Array<[string, string]> = [['Post IG', 'post-ig'], ['Galería', 'galeria'], ['Convocatoria', 'convocatoria'], ['Breve', 'breve']];
		for (const [nombre, esperado] of casos) {
			const out = await mapNovedad(page('a', novedadProps({ Formato: prop.select(nombre) })), deps());
			expect(out!.data.formato).toBe(esperado);
		}
	});

	it('descarta botones con URL insegura y pone texto por defecto', async () => {
		const malo = await mapNovedad(page('a', novedadProps({ 'Link del botón': prop.url('javascript:alert(1)') })), deps());
		expect(malo!.data.boton).toBeNull();
		const bueno = await mapNovedad(page('b', novedadProps({ 'Link del botón': prop.url('https://forms.gle/abc') })), deps());
		expect(bueno!.data.boton).toEqual({ texto: 'Más información', url: 'https://forms.gle/abc' });
	});

	it('ignora pilar inactivo o autor inexistente', async () => {
		const d = deps({ pilarIds: new Set(), miembroIds: new Set() });
		const out = await mapNovedad(page('a', novedadProps()), d);
		expect(out!.data.pilar).toBeNull();
		expect(out!.data.autor).toBeNull();
		expect(d.warn).toHaveBeenCalledWith(expect.stringContaining('Pilar'));
	});

	it('detecta fecha y hora del evento', async () => {
		const out = await mapNovedad(
			page('a', novedadProps({ 'Fecha del evento': prop.date('2026-06-01T18:00:00.000-05:00', '2026-06-01T20:00:00.000-05:00') })),
			deps(),
		);
		expect(out!.data.fechaEvento).toMatchObject({ conHora: true, fin: '2026-06-01T20:00:00.000-05:00' });
	});

	it('lee "Lugar" aunque sea texto simple o no se pueda leer', async () => {
		const texto = await mapNovedad(page('a', novedadProps({ Lugar: prop.text('Auditorio UPN') })), deps());
		expect(texto!.data.lugar).toMatchObject({ nombre: 'Auditorio UPN', lat: null });
		const raro = await mapNovedad(page('b', novedadProps({ Lugar: { id: 'p', type: 'unsupported' } })), deps());
		expect(raro!.data.lugar).toBeNull();
	});

	it('falla con un mensaje claro si renombran o cambian una columna', async () => {
		const sinColumna = novedadProps();
		delete (sinColumna as Record<string, unknown>)['Resumen'];
		await expect(mapNovedad(page('a', sinColumna), deps())).rejects.toThrow('La columna "Resumen" no existe');
		await expect(mapNovedad(page('b', novedadProps({ Resumen: prop.number(1) })), deps())).rejects.toThrow('se esperaba "rich_text"');
	});
});

describe('otros mapeadores', () => {
	const base = { resolveFile: async () => '/_notion/x.jpg', warn: vi.fn() };

	it('pilar activo → dato válido; inactivo → null', async () => {
		const props = (activo: boolean) => ({
			Nombre: prop.title('Desarrollo Profesional'),
			Descripción: prop.text('Eventos formativos'),
			Imagen: prop.files([]),
			Color: prop.select('Azul'),
			Orden: prop.number(1),
			'Correo del pilar': prop.email(null),
			Activo: prop.checkbox(activo),
		});
		const out = await mapPilar(page('4196acb1-45f5-811b-851c-c603674d8fab', props(true)), base);
		expect(pilarSchema.parse(out!.data)).toMatchObject({ slug: 'desarrollo-profesional', color: 'azul', orden: 1 });
		expect(out!.id).toBe(PILAR);
		expect(await mapPilar(page('x', props(false)), base)).toBeNull();
	});

	it('miembro: no expone el correo', async () => {
		const out = await mapMiembro(
			page('31a6acb1-45f5-804c-9bf3-d02356982e9e', {
				Nombre: prop.title('Axel C.'),
				Cargo: prop.text('Dir. de Desarrollo Profesional'),
				Rol: prop.select('Coordinador de pilar'),
				Pilar: prop.relation(['4196acb1-45f5-811b-851c-c603674d8fab']),
				Bio: prop.text(''),
				Foto: prop.files([]),
				Correo: prop.email('privado@gmail.com'),
				Instagram: prop.url('https://instagram.com/axel'),
				LinkedIn: prop.url(null),
				'Web personal': prop.url('javascript:evil()'),
				'Mostrar en la web': prop.checkbox(true),
				Orden: prop.number(null),
			}),
			base,
		);
		const parsed = miembroSchema.parse(out!.data);
		expect(JSON.stringify(parsed)).not.toContain('privado@gmail.com');
		expect(parsed).toMatchObject({ pilares: [PILAR], web: null, instagram: 'https://instagram.com/axel', orden: 999 });
	});

	const testimonioProps = (publicar: boolean, autoriza: boolean) => ({
		Nombre: prop.title('Axel D. Castro'),
		Rol: prop.select('Miembro'),
		Carrera: prop.text('Ing. de Sistemas'),
		Ciclo: prop.text('IV'),
		'Frase destacada': prop.text('Aprendí a liderar'),
		Testimonio: prop.text('Mi experiencia fue increíble.'),
		Habilidades: prop.multi(['Liderazgo']),
		Foto: prop.files([]),
		Instagram: prop.text('@axel.c'),
		Pilar: prop.relation([]),
		Orden: prop.number(1),
		'Publicar en la web': prop.checkbox(publicar),
		'Autoriza uso de imagen': prop.checkbox(autoriza),
	});

	it('testimonio: solo se publica con permiso explícito', async () => {
		const ok = await mapTestimonio(page('a', testimonioProps(true, true)), base);
		expect(testimonioSchema.parse(ok!.data)).toMatchObject({ instagram: 'axel.c', habilidades: ['Liderazgo'] });
		expect(await mapTestimonio(page('b', testimonioProps(true, false)), base)).toBeNull();
		expect(await mapTestimonio(page('c', testimonioProps(false, true)), base)).toBeNull();
	});

	it('aliado y cifra respetan "Mostrar en la web"', async () => {
		const aliado = (mostrar: boolean) => ({
			Nombre: prop.title('Kallpa'),
			Logo: prop.files([{ name: 'kallpa.png', url: 'https://s3/x/kallpa.png?sig=1' }]),
			'Sitio web': prop.url('https://kallpa.pe'),
			Tipo: prop.select('Empresa'),
			Descripción: prop.text(''),
			Pilar: prop.relation([]),
			Orden: prop.number(2),
			'Mostrar en la web': prop.checkbox(mostrar),
		});
		expect(aliadoSchema.parse((await mapAliado(page('a', aliado(true)), base))!.data)).toMatchObject({ sitioWeb: 'https://kallpa.pe/', logo: { src: '/_notion/x.jpg' } });
		expect(await mapAliado(page('b', aliado(false)), base)).toBeNull();

		const cifra = (valor: number | null) => ({
			Nombre: prop.title('Miembros'),
			Valor: prop.number(valor),
			Prefijo: prop.text(''),
			Sufijo: prop.text('+'),
			Descripción: prop.text('en la comunidad'),
			'Mostrar en la web': prop.checkbox(true),
			Orden: prop.number(1),
			'Actualizado al': prop.date('2026-11-01'),
		});
		expect(cifraSchema.parse((await mapCifra(page('c', cifra(445)), base))!.data)).toMatchObject({ valor: 445, sufijo: '+' });
		expect(await mapCifra(page('d', cifra(null)), base)).toBeNull();
	});
});

describe('instagramHandle', () => {
	it('acepta @usuario, usuario y URLs; rechaza basura', () => {
		expect(instagramHandle('@lead.upn')).toBe('lead.upn');
		expect(instagramHandle('https://www.instagram.com/lead.upn/?hl=es')).toBe('lead.upn');
		expect(instagramHandle('lead_upn')).toBe('lead_upn');
		expect(instagramHandle('hola que tal')).toBeNull();
		expect(instagramHandle('')).toBeNull();
	});
});
