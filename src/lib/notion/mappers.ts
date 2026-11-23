import type { PageObjectResponse } from '@notionhq/client';
import type { FileRef } from './assets';
import type { ImageRef } from './images';
import { renderBlocks, type BlockNode } from './blocks';
import { FORMATOS_INFO, faltantes } from './formatos';
import * as p from './props';
import {
	FORMATOS,
	type AliadoData,
	type CifraData,
	type Formato,
	type MiembroData,
	type NovedadData,
	type PilarData,
	type SitioData,
	type TestimonioData,
} from './schemas';
import { countWords, normalizeId, readingMinutes, safeWebUrl, slugify, stripTags, todayInLima } from './util';

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
	/** Descarga y optimiza una imagen (WebP en varios anchos). Sin ella se usa `resolveFile` tal cual. */
	resolveImage?(file: FileRef, alt: string): Promise<ImageRef | null>;
	warn(message: string): void;
}

export interface NovedadDeps extends BaseDeps {
	/** Modo vista previa: acepta Borrador y En revisión (nunca activo en producción). */
	preview: boolean;
	/** Ids (sin guiones) de los pilares activos. */
	pilarIds: ReadonlySet<string>;
	/** Ids (sin guiones) de todos los miembros. */
	miembroIds: ReadonlySet<string>;
	/** Slugs ya usados en esta sincronización (para evitar repetidos). */
	usedSlugs: Set<string>;
	getBody(pageId: string): Promise<BlockNode[]>;
}

const NO_ORDER = 999;

async function toImage(file: FileRef | undefined, alt: string, deps: BaseDeps): Promise<ImageRef | null> {
	if (!file) return null;
	if (deps.resolveImage) {
		const ref = await deps.resolveImage(file, alt);
		if (!ref) deps.warn(`"${alt}": el enlace de la imagen no lleva a una imagen (¿un enlace privado de Google Drive?). Se publica sin foto; súbela directo a Notion.`);
		return ref;
	}
	return { src: await deps.resolveFile(file), alt, width: null, height: null, srcset: '' };
}

/** "viejo-slug, Otro Slug" → ["viejo-slug", "otro-slug"] (sin repetidos ni el slug actual). */
export function parseSlugsAnteriores(raw: string, actual: string): string[] {
	const out = new Set<string>();
	for (const parte of raw.split(/[,\n]+/)) {
		const slug = slugify(parte.replace(/^.*\/novedades\//, ''));
		if (slug && slug !== actual) out.add(slug);
	}
	return [...out];
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
	const creditos = p.text(props, 'Créditos de foto');
	const anteriores = p.text(props, 'Slugs anteriores');
	const pilarId = p.relation(props, 'Pilar')[0] ?? null;
	const autorId = p.relation(props, 'Autor')[0] ?? null;

	const estadoSlug = slugify(p.status(props, 'Estado') ?? '');
	const estado = estadoSlug === 'publicado' || estadoSlug === 'en-revision' || estadoSlug === 'borrador' ? estadoSlug : null;

	// Archivado (u otro estado) nunca se publica; Borrador y En revisión solo en vista previa.
	if (!estado || (estado !== 'publicado' && !deps.preview)) return null;
	if (!titulo) return deps.warn(`Novedad sin Título, se omite: ${page.url}`), null;
	if (!resumen) return deps.warn(`"${titulo}" no tiene Resumen, se omite.`), null;
	const fechaPublicacion = publicacion?.start ?? (deps.preview ? todayInLima() : null);
	if (!fechaPublicacion) return deps.warn(`"${titulo}" no tiene Fecha de publicación, se omite.`), null;

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
	else if (!textoAlt) deps.warn(`"${titulo}" no tiene Texto alternativo; se usa el título para describir la imagen.`);
	const galeria: ImageRef[] = [];
	for (const [i, file] of galeriaArchivos.entries()) {
		const foto = await toImage(file, `${titulo} (foto ${i + 1})`, deps);
		if (foto) galeria.push(foto);
	}

	// Cuerpo (la página de Notion) y tiempo de lectura
	const body = await renderBlocks(await deps.getBody(page.id), {
		resolveFile: deps.resolveFile,
		resolveImage: deps.resolveImage,
		warn: (m) => deps.warn(`"${titulo}": ${m}`),
	});
	const tiempoLectura =
		tiempoManual !== null && tiempoManual >= 1 ? Math.round(tiempoManual) : readingMinutes(countWords(stripTags(body)));

	// Relaciones (solo si apuntan a algo que existe y está activo)
	const pilar = pilarId && deps.pilarIds.has(pilarId) ? pilarId : null;
	if (!pilar) deps.warn(`"${titulo}" no tiene un Pilar activo.`);
	const autor = autorId && deps.miembroIds.has(autorId) ? autorId : null;

	const modalidad = slugify(modalidadNombre ?? '');
	const destacado = slugify(destacadoNombre ?? '');
	const url = safeWebUrl(botonUrl);

	// Cada formato exige cosas distintas: si falta algo se avisa, pero la novedad igual se publica.
	const falta = faltantes(formato, {
		imagen,
		galeria,
		fechaEvento: evento?.start ?? null,
		modalidad: modalidad || null,
		lugar,
		boton: url,
		textoVacio: countWords(stripTags(body)) === 0,
	});
	if (falta.length) {
		deps.warn(`"${titulo}" (formato ${FORMATOS_INFO[formato].nombre}) está incompleta, le falta: ${falta.join(', ')}.`);
	}

	return {
		id: slug,
		html: body,
		data: {
			notionId: normalizeId(page.id),
			slug,
			titulo,
			formato,
			estado,
			resumen,
			imagen,
			creditos,
			galeria,
			fechaPublicacion,
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
			slugsAnteriores: parseSlugsAnteriores(anteriores, slug),
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
	// Igual que en Testimonios: sin permiso explícito, la foto no se publica.
	const autoriza = p.checkbox(props, 'Autoriza uso de imagen');
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
		data: { notionId: normalizeId(page.id), nombre, foto: autoriza ? await toImage(fotos[0], nombre, deps) : null, ...data },
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

// ---------- Sitio ----------

export interface SitioDeps extends BaseDeps {
	getBody(pageId: string): Promise<BlockNode[]>;
}

/** La única fila de la tabla "Sitio". El cuerpo de la página es el texto de "Nosotros". */
export async function mapSitio(page: PageObjectResponse, deps: SitioDeps): Promise<MappedEntry<SitioData>> {
	const props = page.properties;
	const red = (name: string) => safeWebUrl(p.url(props, name));
	const data: SitioData = {
		nombre: p.title(props, 'Nombre') || 'LEAD UPN Trujillo',
		mision: p.text(props, 'Misión'),
		vision: p.text(props, 'Visión'),
		descripcion: p.text(props, 'Descripción corta'),
		redes: {
			instagram: red('Instagram'),
			linkedin: red('LinkedIn'),
			tiktok: red('TikTok'),
			facebook: red('Facebook'),
			whatsapp: red('WhatsApp'),
		},
		correo: p.email(props, 'Correo público'),
		unete: { url: red('Link de Únete'), texto: p.text(props, 'Texto de Únete') },
		actualizado: page.last_edited_time,
	};
	if (!data.mision || !data.vision) deps.warn('Sitio: falta la Misión o la Visión (la página Nosotros las omite).');
	if (!data.descripcion) deps.warn('Sitio: falta la Descripción corta (se usa un texto por defecto para Google).');

	const html = await renderBlocks(await deps.getBody(page.id), {
		resolveFile: deps.resolveFile,
		resolveImage: deps.resolveImage,
		warn: (m) => deps.warn(`Sitio: ${m}`),
	});
	return { id: 'sitio', data, html };
}
