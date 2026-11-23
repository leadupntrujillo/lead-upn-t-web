/**
 * SEO sin Astro (funciones puras): URLs absolutas, descripciones y datos estructurados
 * (schema.org en JSON-LD). Lo usa el componente `Seo.astro`.
 */

export const SITIO_URL = 'https://leadupntrujillo.com';
export const NOMBRE = 'LEAD UPN Trujillo';
export const DESCRIPCION_POR_DEFECTO =
	'Formamos estudiantes líderes de la UPN Trujillo en tecnología y emprendimiento, con proyectos de impacto real y sostenible.';
export const INSTAGRAM_POR_DEFECTO = 'https://www.instagram.com/leadupn_trujillo/';
export const LOGO = '/icons/icon-512.png';
export const OG_POR_DEFECTO = '/og/sitio.png';

/** Ruta → URL absoluta del sitio. Deja intactas las que ya son absolutas. */
export function absoluta(ruta: string, base: string = SITIO_URL): string {
	return new URL(ruta, base.endsWith('/') ? base : `${base}/`).toString();
}

/** Recorta un texto a `max` caracteres sin partir palabras (para meta description). */
export function recortar(texto: string, max = 160): string {
	const limpio = texto.replace(/\s+/g, ' ').trim();
	if (limpio.length <= max) return limpio;
	const corte = limpio.slice(0, max - 1);
	const espacio = corte.lastIndexOf(' ');
	return `${(espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, '')}…`;
}

/** JSON listo para `<script type="application/ld+json">` (sin `<` que cierre la etiqueta). */
export const jsonLdSeguro = (data: unknown): string => JSON.stringify(data).replace(/</g, '\\u003c');

/** Fecha en hora de Lima (UTC-5 todo el año) con zona: "2026-05-22T18:00:00-05:00". */
export function isoLima(fecha: Date): string {
	const lima = new Date(fecha.getTime() - 5 * 3600_000);
	return `${lima.toISOString().slice(0, 19)}-05:00`;
}

/** Fecha sin hora (las de Notion sin hora se guardan a las 00:00 UTC). */
export const isoDia = (fecha: Date): string => fecha.toISOString().slice(0, 10);

// ---------- Organización y sitio ----------

export interface OrgInput {
	nombre: string;
	descripcion: string;
	correo: string | null;
	redes: Record<string, string | null>;
}

export function organizacion(o: OrgInput, base = SITIO_URL) {
	return {
		'@type': 'Organization',
		'@id': absoluta('/#organizacion', base),
		name: o.nombre,
		alternateName: 'LEAD UPN',
		url: absoluta('/', base),
		logo: absoluta(LOGO, base),
		description: o.descripcion,
		...(o.correo ? { email: o.correo } : {}),
		sameAs: Object.values(o.redes).filter((u): u is string => Boolean(u)),
		memberOf: { '@type': 'CollegeOrUniversity', name: 'Universidad Privada del Norte', url: 'https://www.upn.edu.pe' },
		address: { '@type': 'PostalAddress', addressLocality: 'Trujillo', addressRegion: 'La Libertad', addressCountry: 'PE' },
	};
}

export function sitioWeb(nombre: string, base = SITIO_URL) {
	return {
		'@type': 'WebSite',
		'@id': absoluta('/#sitio', base),
		name: nombre,
		url: absoluta('/', base),
		inLanguage: 'es-PE',
		publisher: { '@id': absoluta('/#organizacion', base) },
	};
}

/** Rutas de navegación (BreadcrumbList). La última miga es la página actual. */
export function migas(items: Array<{ nombre: string; ruta: string }>, base = SITIO_URL) {
	return {
		'@type': 'BreadcrumbList',
		itemListElement: items.map((it, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: it.nombre,
			item: absoluta(it.ruta, base),
		})),
	};
}

// ---------- Novedades: Noticia o Evento ----------

export interface NovedadLdInput {
	titulo: string;
	descripcion: string;
	ruta: string;
	/** Ruta o URL de la imagen (se hace absoluta). */
	imagenes: string[];
	formato: string;
	fechaPublicacion: Date;
	actualizado: Date;
	fechaEvento: { inicio: Date; fin: Date | null; conHora: boolean } | null;
	modalidad: 'presencial' | 'virtual' | 'hibrido' | null;
	lugar: { nombre: string; direccion: string } | null;
	boton: { texto: string; url: string } | null;
	autor: string | null;
}

const MODOS = {
	presencial: 'https://schema.org/OfflineEventAttendanceMode',
	virtual: 'https://schema.org/OnlineEventAttendanceMode',
	hibrido: 'https://schema.org/MixedEventAttendanceMode',
} as const;

/**
 * Evento (puede salir en las búsquedas de eventos de Google) si el formato es "evento" y
 * tiene fecha; si no, Noticia (NewsArticle).
 */
export function novedadLd(n: NovedadLdInput, base = SITIO_URL) {
	const url = absoluta(n.ruta, base);
	const image = n.imagenes.map((i) => absoluta(i, base));
	const org = { '@id': absoluta('/#organizacion', base) };

	if (n.formato === 'evento' && n.fechaEvento) {
		const fecha = (d: Date) => (n.fechaEvento!.conHora ? isoLima(d) : isoDia(d));
		const presencial = n.lugar ? { '@type': 'Place', name: n.lugar.nombre || n.lugar.direccion, address: n.lugar.direccion || n.lugar.nombre } : null;
		const virtual = { '@type': 'VirtualLocation', url: n.boton?.url ?? url };
		const location =
			n.modalidad === 'virtual' ? virtual : n.modalidad === 'hibrido' && presencial ? [presencial, virtual] : (presencial ?? virtual);
		return {
			'@type': 'Event',
			name: n.titulo,
			description: n.descripcion,
			url,
			...(image.length ? { image } : {}),
			startDate: fecha(n.fechaEvento.inicio),
			...(n.fechaEvento.fin ? { endDate: fecha(n.fechaEvento.fin) } : {}),
			eventStatus: 'https://schema.org/EventScheduled',
			eventAttendanceMode: MODOS[n.modalidad ?? (presencial ? 'presencial' : 'virtual')],
			location,
			organizer: org,
		};
	}

	return {
		'@type': 'NewsArticle',
		headline: n.titulo.slice(0, 110),
		description: n.descripcion,
		url,
		mainEntityOfPage: url,
		...(image.length ? { image } : {}),
		datePublished: isoDia(n.fechaPublicacion),
		dateModified: n.actualizado.toISOString(),
		author: n.autor ? { '@type': 'Person', name: n.autor } : org,
		publisher: org,
		inLanguage: 'es-PE',
	};
}

/** Une varios nodos en un solo bloque JSON-LD. */
export const grafo = (...nodos: object[]) => ({ '@context': 'https://schema.org', '@graph': nodos });
