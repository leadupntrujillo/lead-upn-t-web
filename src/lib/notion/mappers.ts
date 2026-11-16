import type { PageObjectResponse } from '@notionhq/client';
import type { FileRef } from './assets';
import { renderBlocks, type BlockNode } from './blocks';
import * as p from './props';
import {
	FORMATOS,
	type AliadoData,
	type CifraData,
	type Formato,
	type MiembroData,
	type NovedadData,
	type PilarData,
	type TestimonioData,
} from './schemas';
import { countWords, normalizeId, readingMinutes, safeWebUrl, slugify, stripTags } from './util';

/**
 * Cada mapeador convierte una fila de Notion en un dato limpio. Los nombres de columna son
 * los de Notion (ver CLAUDE.md). Devuelve null si a la fila le falta algo obligatorio
 * (se avisa con `warn` y se omite); lanza error si la ESTRUCTURA de la tabla cambió.
 */

export interface MappedEntry<T> {
	id: string;
	data: T;
	html?: string;
}

export interface BaseDeps {
	resolveFile(file: FileRef): Promise<string>;
	warn(message: string): void;
}

export interface NovedadDeps extends BaseDeps {
	/** Ids (sin guiones) de los pilares activos. */
	pilarIds: ReadonlySet<string>;
	/** Ids (sin guiones) de todos los miembros. */
	miembroIds: ReadonlySet<string>;
	/** Slugs ya usados en esta sincronización (para evitar repetidos). */
	usedSlugs: Set<string>;
	getBody(pageId: string): Promise<BlockNode[]>;
}

const NO_ORDER = 999;

async function toImage(file: FileRef | undefined, alt: string, deps: BaseDeps) {
	return file ? { src: await deps.resolveFile(file), alt } : null;
}

/** "@usuario", "instagram.com/usuario" o "usuario" → "usuario" (sin @). */
export function instagramHandle(raw: string): string | null {
	const cleaned = raw.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0] ?? '';
	return /^[A-Za-z0-9._]{1,30}$/.test(cleaned) ? cleaned : null;
}

// ---------- Novedades ----------

export async function mapNovedad(
	page: PageObjectResponse,
	deps: NovedadDeps,
): Promise<MappedEntry<NovedadData> | null> {
	const props = page.properties;

	const titulo = p.title(props, 'Título');
	const resumen = p.text(props, 'Resumen');
	const publicacion = p.date(props, 'Fecha de publicación');
	const formatoNombre = p.select(props, 'Formato');
	const slugManual = p.text(props, 'Slug');
	const imagenes = p.files(props, 'Imagen principal');
	const galeriaArchivos = p.files(props, 'Galería');
	const textoAlt = p.text(props, 'Texto alternativo');
	const evento = p.date(props, 'Fecha del evento');
	const modalidadNombre = p.select(props, 'Modalidad');
	const lugar = p.place(props, 'Lugar');
	const botonTexto = p.text(props, 'Texto del botón');
	const botonUrl = p.url(props, 'Link del botón');
	const etiquetas = p.multiSelect(props, 'Etiquetas');
	const destacadoNombre = p.select(props, 'Destacado');
	const tiempoManual = p.number(props, 'Tiempo de lectura');
	const seo = p.text(props, 'Descripción SEO');
	const pilarId = p.relation(props, 'Pilar')[0] ?? null;
	const autorId = p.relation(props, 'Autor')[0] ?? null;

	if (!titulo) return deps.warn(`Novedad sin Título, se omite: ${page.url}`), null;
	if (!resumen) return deps.warn(`"${titulo}" no tiene Resumen, se omite.`), null;
	if (!publicacion?.start) return deps.warn(`"${titulo}" no tiene Fecha de publicación, se omite.`), null;

	// Slug único
	const base = slugify(slugManual) || slugify(titulo) || normalizeId(page.id).slice(0, 8);
	let slug = base;
	for (let n = 2; deps.usedSlugs.has(slug); n++) slug = `${base}-${n}`;
	if (slug !== base) deps.warn(`El slug "${base}" está repetido; "${titulo}" usará "${slug}".`);
	deps.usedSlugs.add(slug);

	// Formato
	const formatoSlug = slugify(formatoNombre ?? '');
	let formato: Formato = 'periodico';
	if ((FORMATOS as readonly string[]).includes(formatoSlug)) {
		formato = formatoSlug as Formato;
	} else {
		deps.warn(`"${titulo}" tiene el Formato "${formatoNombre ?? '(vacío)'}"; se usa "periodico".`);
	}

	// Imágenes
	const imagen = await toImage(imagenes[0], textoAlt || titulo, deps);
	if (!imagen) deps.warn(`"${titulo}" no tiene Imagen principal.`);
	const galeria = [];
	for (const [i, file] of galeriaArchivos.entries()) {
		galeria.push({ src: await deps.resolveFile(file), alt: `${titulo} (foto ${i + 1})` });
	}

	// Cuerpo (la página de Notion) y tiempo de lectura
	const body = await renderBlocks(await deps.getBody(page.id), { resolveFile: deps.resolveFile });
	const tiempoLectura =
		tiempoManual !== null && tiempoManual >= 1 ? Math.round(tiempoManual) : readingMinutes(countWords(stripTags(body)));

	// Relaciones (solo si apuntan a algo que existe y está activo)
	const pilar = pilarId && deps.pilarIds.has(pilarId) ? pilarId : null;
	if (!pilar) deps.warn(`"${titulo}" no tiene un Pilar activo.`);
	const autor = autorId && deps.miembroIds.has(autorId) ? autorId : null;

	const modalidad = slugify(modalidadNombre ?? '');
	const destacado = slugify(destacadoNombre ?? '');
	const url = safeWebUrl(botonUrl);

	return {
		id: slug,
		html: body,
		data: {
			notionId: normalizeId(page.id),
			slug,
			titulo,
			formato,
			resumen,
			imagen,
			galeria,
			fechaPublicacion: publicacion.start,
			fechaEvento: evento?.start ? { inicio: evento.start, fin: evento.end, conHora: evento.start.includes('T') } : null,
			modalidad: modalidad === 'presencial' || modalidad === 'virtual' || modalidad === 'hibrido' ? modalidad : null,
			lugar,
			boton: url ? { texto: botonTexto || 'Más información', url } : null,
			etiquetas,
			destacado: destacado === 'portada' || destacado === 'destacada' ? destacado : null,
			pilar,
			autor,
			tiempoLectura,
			seoDescripcion: seo || resumen,
			actualizado: page.last_edited_time,
		},
	};
}

// ---------- Pilares ----------

export async function mapPilar(page: PageObjectResponse, deps: BaseDeps): Promise<MappedEntry<PilarData> | null> {
	const props = page.properties;
	const nombre = p.title(props, 'Nombre');
	const descripcion = p.text(props, 'Descripción');
	const imagenes = p.files(props, 'Imagen');
	const color = p.select(props, 'Color');
	const orden = p.number(props, 'Orden');
	const correo = p.email(props, 'Correo del pilar');
	const activo = p.checkbox(props, 'Activo');

	if (!activo) return null;
	if (!nombre) return deps.warn(`Pilar sin Nombre, se omite: ${page.url}`), null;

	return {
		id: normalizeId(page.id),
		data: {
			notionId: normalizeId(page.id),
			slug: slugify(nombre),
			nombre,
			descripcion,
			imagen: await toImage(imagenes[0], nombre, deps),
			color: color ? slugify(color) : null,
			orden: orden ?? NO_ORDER,
			correo,
		},
	};
}

// ---------- Miembros ----------

export async function mapMiembro(page: PageObjectResponse, deps: BaseDeps): Promise<MappedEntry<MiembroData> | null> {
	const props = page.properties;
	const nombre = p.title(props, 'Nombre');
	const fotos = p.files(props, 'Foto');
	// Ojo: el correo del miembro NO se lee ni se publica.
	const data = {
		cargo: p.text(props, 'Cargo'),
		rol: p.select(props, 'Rol'),
		bio: p.text(props, 'Bio'),
		instagram: safeWebUrl(p.url(props, 'Instagram')),
		linkedin: safeWebUrl(p.url(props, 'LinkedIn')),
		web: safeWebUrl(p.url(props, 'Web personal')),
		pilares: p.relation(props, 'Pilar'),
		mostrar: p.checkbox(props, 'Mostrar en la web'),
		orden: p.number(props, 'Orden') ?? NO_ORDER,
	};

	if (!nombre) return deps.warn(`Miembro sin Nombre, se omite: ${page.url}`), null;

	return {
		id: normalizeId(page.id),
		data: { notionId: normalizeId(page.id), nombre, foto: await toImage(fotos[0], nombre, deps), ...data },
	};
}

// ---------- Testimonios ----------

export async function mapTestimonio(
	page: PageObjectResponse,
	deps: BaseDeps,
): Promise<MappedEntry<TestimonioData> | null> {
	const props = page.properties;
	const nombre = p.title(props, 'Nombre');
	const testimonio = p.text(props, 'Testimonio');
	const publicar = p.checkbox(props, 'Publicar en la web');
	const autoriza = p.checkbox(props, 'Autoriza uso de imagen');
	const fotos = p.files(props, 'Foto');
	const data = {
		rol: p.select(props, 'Rol'),
		carrera: p.text(props, 'Carrera'),
		ciclo: p.text(props, 'Ciclo'),
		frase: p.text(props, 'Frase destacada'),
		habilidades: p.multiSelect(props, 'Habilidades'),
		instagram: instagramHandle(p.text(props, 'Instagram')),
		pilar: p.relation(props, 'Pilar')[0] ?? null,
		orden: p.number(props, 'Orden') ?? NO_ORDER,
	};

	// Doble seguro: sin permiso explícito, nunca se publica.
	if (!publicar || !autoriza) return null;
	if (!nombre || !testimonio) return deps.warn(`Testimonio incompleto, se omite: ${page.url}`), null;

	return {
		id: normalizeId(page.id),
		data: { notionId: normalizeId(page.id), nombre, testimonio, foto: await toImage(fotos[0], nombre, deps), ...data },
	};
}

// ---------- Aliados ----------

export async function mapAliado(page: PageObjectResponse, deps: BaseDeps): Promise<MappedEntry<AliadoData> | null> {
	const props = page.properties;
	const nombre = p.title(props, 'Nombre');
	const logos = p.files(props, 'Logo');
	const mostrar = p.checkbox(props, 'Mostrar en la web');
	const data = {
		sitioWeb: safeWebUrl(p.url(props, 'Sitio web')),
		tipo: p.select(props, 'Tipo'),
		descripcion: p.text(props, 'Descripción'),
		pilar: p.relation(props, 'Pilar')[0] ?? null,
		orden: p.number(props, 'Orden') ?? NO_ORDER,
	};

	if (!mostrar) return null;
	if (!nombre) return deps.warn(`Aliado sin Nombre, se omite: ${page.url}`), null;
	if (!logos[0]) deps.warn(`El aliado "${nombre}" no tiene Logo.`);

	return {
		id: normalizeId(page.id),
		data: { notionId: normalizeId(page.id), nombre, logo: await toImage(logos[0], nombre, deps), ...data },
	};
}

// ---------- Cifras ----------

export async function mapCifra(page: PageObjectResponse, deps: BaseDeps): Promise<MappedEntry<CifraData> | null> {
	const props = page.properties;
	const nombre = p.title(props, 'Nombre');
	const valor = p.number(props, 'Valor');
	const mostrar = p.checkbox(props, 'Mostrar en la web');
	const actualizado = p.date(props, 'Actualizado al');
	const data = {
		prefijo: p.text(props, 'Prefijo'),
		sufijo: p.text(props, 'Sufijo'),
		descripcion: p.text(props, 'Descripción'),
		orden: p.number(props, 'Orden') ?? NO_ORDER,
		actualizadoAl: actualizado?.start ?? null,
	};

	if (!mostrar) return null;
	if (!nombre || valor === null) return deps.warn(`Cifra incompleta (falta Nombre o Valor), se omite: ${page.url}`), null;

	return { id: normalizeId(page.id), data: { notionId: normalizeId(page.id), nombre, valor, ...data } };
}
