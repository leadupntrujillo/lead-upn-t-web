import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { block, fakeClient, page, paragraph, prop, rt } from './fixtures';
import { createNotionLoader } from './loader';
import { mapNovedad } from './mappers';
import { novedadSchema } from './schemas';

const ID_VAR = 'TEST_NOVEDADES_ID';

function context() {
	const entries = new Map<string, { id: string; data: Record<string, unknown>; rendered?: { html: string } }>();
	const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	return {
		entries,
		logger,
		ctx: {
			store: { clear: () => entries.clear(), set: (e: never) => (entries.set((e as { id: string }).id, e), true) },
			logger,
			parseData: async ({ data }: { data: unknown }) => novedadSchema.parse(data),
			generateDigest: (d: unknown) => JSON.stringify(d).length.toString(),
		} as never,
	};
}

const row = (id: string, titulo: string, resumen = 'Un resumen') =>
	page(id, {
		Título: prop.title(titulo),
		Slug: prop.text(''),
		Resumen: prop.text(resumen),
		Formato: prop.select('Evento'),
		Pilar: prop.relation([]),
		Autor: prop.relation([]),
		'Imagen principal': prop.files([{ name: 'a.jpg', url: 'https://s3/ws/id/a.jpg?sig=1' }]),
		Galería: prop.files([]),
		'Texto alternativo': prop.text(''),
		'Fecha de publicación': prop.date('2026-05-22'),
		'Fecha del evento': prop.date(null),
		Modalidad: prop.select(null),
		Lugar: prop.text(''),
		'Texto del botón': prop.text(''),
		'Link del botón': prop.url(null),
		Etiquetas: prop.multi([]),
		Destacado: prop.select(null),
		'Tiempo de lectura': prop.number(null),
		'Descripción SEO': prop.text(''),
	});

const loaderFor = (rows: ReturnType<typeof row>[], blocks = {}) =>
	createNotionLoader(
		{
			name: 'novedades',
			idVar: ID_VAR,
			begin: async () => ({ pilarIds: new Set<string>(), miembroIds: new Set<string>(), usedSlugs: new Set<string>() }),
			map: (p, state, c) =>
				mapNovedad(p, {
					...state,
					warn: c.warn,
					resolveFile: async () => '/_notion/a.jpg',
					getBody: async (id) => (blocks as Record<string, never[]>)[id] ?? [],
				}),
		},
		() => fakeClient(rows, blocks),
	);

describe('createNotionLoader', () => {
	beforeEach(() => {
		process.env[ID_VAR] = 'ds-123';
	});
	afterEach(() => {
		delete process.env[ID_VAR];
	});

	it('sincroniza filas a la store con su HTML renderizado', async () => {
		const blocks = { 'page-1': [block('heading_1', { rich_text: rt('Hola') }), paragraph('Texto de la noticia.')] };
		const { ctx, entries, logger } = context();
		await loaderFor([row('page-1', 'Gran Final')], blocks).load(ctx);

		expect([...entries.keys()]).toEqual(['gran-final']);
		const entry = entries.get('gran-final')!;
		expect(entry.rendered?.html).toBe('<h2 id="hola">Hola</h2><p>Texto de la noticia.</p>');
		expect(entry.data).toMatchObject({ titulo: 'Gran Final', formato: 'evento' });
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1 entrada'));
	});

	it('omite filas incompletas con aviso y publica el resto', async () => {
		const { ctx, entries, logger } = context();
		await loaderFor([row('a', 'Buena'), row('b', 'Sin resumen', '')]).load(ctx);
		expect([...entries.keys()]).toEqual(['buena']);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no tiene Resumen'));
	});

	it('reemplaza lo anterior: una fila que ya no está se borra de la store', async () => {
		const { ctx, entries } = context();
		await loaderFor([row('a', 'Vieja')]).load(ctx);
		await loaderFor([row('b', 'Nueva')]).load(ctx);
		expect([...entries.keys()]).toEqual(['nueva']);
	});

	it('falla el build si falta la variable de entorno del ID', async () => {
		delete process.env[ID_VAR];
		const { ctx } = context();
		await expect(loaderFor([]).load(ctx)).rejects.toThrow(`Falta la variable de entorno ${ID_VAR}`);
	});

	it('falla el build si TODAS las filas mapeadas son inválidas', async () => {
		const { ctx } = context();
		const strict = createNotionLoader(
			{
				name: 'novedades',
				idVar: ID_VAR,
				map: async (p) => ({ id: p.id, data: { esto: 'no cumple el esquema' } }),
			},
			() => fakeClient([row('a', 'X')]),
		);
		await expect(strict.load(ctx)).rejects.toThrow('no pasaron la validación');
	});

	it('con cero filas en Notion deja la colección vacía sin fallar', async () => {
		const { ctx, entries } = context();
		await loaderFor([]).load(ctx);
		expect(entries.size).toBe(0);
	});
});
