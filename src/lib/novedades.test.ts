import { describe, expect, it } from 'vitest';
import { armarPortada, contarEtiquetas, delFormato, delPilar, finDelEvento, porFecha, proximos, relacionadas, type NovedadLike } from './novedades';

let n = 0;
function nov(over: Partial<NovedadLike['data']> & { id?: string; fecha?: string } = {}): NovedadLike {
	const { id, fecha, ...data } = over;
	return {
		id: id ?? `n${++n}`,
		data: {
			fechaPublicacion: new Date(fecha ?? '2026-05-01'),
			destacado: null,
			formato: 'periodico',
			etiquetas: [],
			pilar: null,
			fechaEvento: null,
			...data,
		},
	};
}

describe('orden y filtros', () => {
	it('porFecha: la más reciente primero y no muta la lista', () => {
		const lista = [nov({ id: 'a', fecha: '2026-01-01' }), nov({ id: 'b', fecha: '2026-03-01' })];
		expect(porFecha(lista).map((x) => x.id)).toEqual(['b', 'a']);
		expect(lista.map((x) => x.id)).toEqual(['a', 'b']);
	});
	it('delPilar y delFormato', () => {
		const lista = [
			nov({ id: 'a', pilar: { id: 'p1' }, formato: 'evento' }),
			nov({ id: 'b', pilar: { id: 'p2' } }),
		];
		expect(delPilar(lista, 'p1').map((x) => x.id)).toEqual(['a']);
		expect(delFormato(lista, 'evento').map((x) => x.id)).toEqual(['a']);
	});
});

describe('armarPortada', () => {
	it('usa la marcada como portada, aunque no sea la más reciente', () => {
		const lista = [nov({ id: 'vieja', destacado: 'portada', fecha: '2026-01-01' }), nov({ id: 'nueva', fecha: '2026-06-01' })];
		const { principal, recientes } = armarPortada(lista);
		expect(principal?.id).toBe('vieja');
		expect(recientes.map((x) => x.id)).toEqual(['nueva']);
	});
	it('si hay varias portadas, gana la más reciente; si no hay ninguna, la última publicada', () => {
		const varias = [nov({ id: 'a', destacado: 'portada', fecha: '2026-01-01' }), nov({ id: 'b', destacado: 'portada', fecha: '2026-02-01' })];
		expect(armarPortada(varias).principal?.id).toBe('b');
		const ninguna = [nov({ id: 'a', fecha: '2026-01-01' }), nov({ id: 'b', fecha: '2026-02-01' })];
		expect(armarPortada(ninguna).principal?.id).toBe('b');
	});
	it('limita las destacadas, sin repetir la principal ni mezclarlas en recientes', () => {
		const lista = [
			nov({ id: 'p', destacado: 'portada' }),
			...Array.from({ length: 6 }, (_, i) => nov({ id: `d${i}`, destacado: 'destacada', fecha: `2026-02-0${i + 1}` })),
			nov({ id: 'x', fecha: '2026-03-01' }),
		];
		const { principal, destacadas, recientes } = armarPortada(lista, 4);
		expect(principal?.id).toBe('p');
		expect(destacadas).toHaveLength(4);
		expect(recientes.every((r) => !destacadas.includes(r) && r !== principal)).toBe(true);
	});
	it('lista vacía → sin principal', () => {
		expect(armarPortada([])).toEqual({ principal: null, destacadas: [], recientes: [] });
	});
});

describe('relacionadas', () => {
	it('prioriza mismo pilar, luego etiquetas y formato; excluye la misma novedad', () => {
		const actual = nov({ id: 'actual', pilar: { id: 'p1' }, etiquetas: ['STEM'], formato: 'evento' });
		const mismoPilar = nov({ id: 'pilar', pilar: { id: 'p1' } });
		const mismaEtiqueta = nov({ id: 'etiqueta', etiquetas: ['STEM'] });
		const nada = nov({ id: 'nada', pilar: { id: 'p9' } });
		const res = relacionadas([actual, nada, mismaEtiqueta, mismoPilar], actual).map((x) => x.id);
		expect(res).toEqual(['pilar', 'etiqueta']);
	});
});

describe('eventos próximos', () => {
	const ahora = new Date('2026-06-10T12:00:00Z');
	it('incluye eventos y convocatorias vigentes, el más cercano primero', () => {
		const lista = [
			nov({ id: 'lejos', formato: 'evento', fechaEvento: { inicio: new Date('2026-08-01'), fin: null, conHora: false } }),
			nov({ id: 'cerca', formato: 'convocatoria', fechaEvento: { inicio: new Date('2026-06-20'), fin: null, conHora: false } }),
			nov({ id: 'pasado', formato: 'evento', fechaEvento: { inicio: new Date('2026-05-01'), fin: null, conHora: false } }),
			nov({ id: 'noticia', formato: 'periodico', fechaEvento: { inicio: new Date('2026-07-01'), fin: null, conHora: false } }),
		];
		expect(proximos(lista, ahora).map((x) => x.id)).toEqual(['cerca', 'lejos']);
	});
	it('un evento de hoy sin hora sigue vigente todo el día (hora de Lima)', () => {
		const hoy = nov({ formato: 'evento', fechaEvento: { inicio: new Date('2026-06-10'), fin: null, conHora: false } });
		// 23:00 en Lima = 04:00 UTC del día siguiente
		expect(proximos([hoy], new Date('2026-06-11T04:00:00Z'))).toHaveLength(1);
		expect(proximos([hoy], new Date('2026-06-11T06:00:00Z'))).toHaveLength(0);
	});
	it('finDelEvento usa el fin del rango si existe', () => {
		const e = nov({ fechaEvento: { inicio: new Date('2026-06-01T18:00:00Z'), fin: new Date('2026-06-01T20:00:00Z'), conHora: true } });
		expect(finDelEvento(e)).toBe(new Date('2026-06-01T20:00:00Z').getTime());
		expect(finDelEvento(nov())).toBeNull();
	});
});

describe('contarEtiquetas', () => {
	it('ordena por frecuencia', () => {
		const lista = [nov({ etiquetas: ['STEM', 'Origami'] }), nov({ etiquetas: ['STEM'] })];
		expect(contarEtiquetas(lista)).toEqual([
			{ etiqueta: 'STEM', total: 2 },
			{ etiqueta: 'Origami', total: 1 },
		]);
	});
});
