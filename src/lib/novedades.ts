import type { Formato } from './notion/schemas';

/**
 * Funciones puras para ordenar y agrupar novedades (sirven para cualquier página).
 * Trabajan con lo mínimo que necesitan, así se pueden probar sin Astro.
 */
export interface NovedadLike {
	id: string;
	data: {
		fechaPublicacion: Date;
		destacado: 'portada' | 'destacada' | null;
		formato: Formato;
		etiquetas: string[];
		pilar: { id: string } | null;
		fechaEvento: { inicio: Date; fin: Date | null; conHora: boolean } | null;
	};
}

const HORA = 3_600_000;
const time = (n: NovedadLike) => n.data.fechaPublicacion.getTime();

/** Más reciente primero. */
export const porFecha = <T extends NovedadLike>(list: readonly T[]): T[] => [...list].sort((a, b) => time(b) - time(a));

export const delPilar = <T extends NovedadLike>(list: readonly T[], pilarId: string): T[] =>
	porFecha(list.filter((n) => n.data.pilar?.id === pilarId));

export const delFormato = <T extends NovedadLike>(list: readonly T[], formato: Formato): T[] =>
	porFecha(list.filter((n) => n.data.formato === formato));

export const conEtiqueta = <T extends NovedadLike>(list: readonly T[], etiqueta: string): T[] =>
	porFecha(list.filter((n) => n.data.etiquetas.includes(etiqueta)));

/**
 * Arma el bloque de portada: la novedad principal, las destacadas y el resto reciente.
 * Si nadie está marcada como "Portada" se usa la más reciente; si hay varias, la más reciente de ellas.
 */
export function armarPortada<T extends NovedadLike>(list: readonly T[], maxDestacadas = 4, maxRecientes = 6) {
	const ordenadas = porFecha(list);
	const principal = ordenadas.find((n) => n.data.destacado === 'portada') ?? ordenadas[0] ?? null;
	const destacadas = ordenadas
		.filter((n) => n !== principal && n.data.destacado === 'destacada')
		.slice(0, maxDestacadas);
	const usadas = new Set<T | null>([principal, ...destacadas]);
	const recientes = ordenadas.filter((n) => !usadas.has(n)).slice(0, maxRecientes);
	return { principal, destacadas, recientes };
}

/** Novedades parecidas: mismo pilar (3 puntos), etiquetas en común (1 c/u) y mismo formato (1). */
export function relacionadas<T extends NovedadLike>(list: readonly T[], actual: T, max = 3): T[] {
	const score = (n: T): number => {
		let s = n.data.pilar && n.data.pilar.id === actual.data.pilar?.id ? 3 : 0;
		s += n.data.etiquetas.filter((e) => actual.data.etiquetas.includes(e)).length;
		if (n.data.formato === actual.data.formato) s += 1;
		return s;
	};
	return list
		.filter((n) => n.id !== actual.id)
		.map((n) => ({ n, s: score(n) }))
		.filter(({ s }) => s > 0)
		.sort((a, b) => b.s - a.s || time(b.n) - time(a.n))
		.slice(0, max)
		.map(({ n }) => n);
}

/** Momento (ms) en que termina un evento/convocatoria. Sin hora, vale hasta el final del día en Lima. */
export function finDelEvento(n: NovedadLike): number | null {
	const fe = n.data.fechaEvento;
	if (!fe) return null;
	const base = (fe.fin ?? fe.inicio).getTime();
	return fe.conHora ? base : base + (24 + 5) * HORA;
}

/** Eventos y convocatorias que aún no terminaron, el más próximo primero. */
export function proximos<T extends NovedadLike>(list: readonly T[], ahora: Date = new Date()): T[] {
	const t = ahora.getTime();
	return list
		.filter((n) => n.data.formato === 'evento' || n.data.formato === 'convocatoria')
		.filter((n) => (finDelEvento(n) ?? -Infinity) >= t)
		.sort((a, b) => a.data.fechaEvento!.inicio.getTime() - b.data.fechaEvento!.inicio.getTime());
}

/** Etiquetas usadas, de la más frecuente a la menos. */
export function contarEtiquetas(list: readonly NovedadLike[]): Array<{ etiqueta: string; total: number }> {
	const cuenta = new Map<string, number>();
	for (const n of list) for (const e of n.data.etiquetas) cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
	return [...cuenta].map(([etiqueta, total]) => ({ etiqueta, total })).sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta));
}
