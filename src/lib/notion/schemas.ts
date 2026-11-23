import { z } from 'astro/zod';

export const FORMATOS = [
	'periodico',
	'anuncio',
	'post-ig',
	'evento',
	'convocatoria',
	'galeria',
	'logros',
	'entrevista',
	'breve',
] as const;
export type Formato = (typeof FORMATOS)[number];

/** Estados visibles. En producción todo es "publicado"; los otros solo existen en modo vista previa. */
export const ESTADOS = ['publicado', 'en-revision', 'borrador'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Imagen ya optimizada (ver images.ts). width/height/srcset faltan solo en SVG o enlaces externos caídos. */
export const imagen = z.object({
	src: z.string(),
	alt: z.string(),
	width: z.number().int().positive().nullable().default(null),
	height: z.number().int().positive().nullable().default(null),
	srcset: z.string().default(''),
});

const lugar = z.object({
	nombre: z.string(),
	direccion: z.string(),
	lat: z.number().nullable(),
	lng: z.number().nullable(),
});

/**
 * Esquemas de datos. Las relaciones (pilar, autor, pilares) se declaran aquí como ids de texto;
 * `content.config.ts` las convierte en `reference()` de Astro.
 */
export const novedadSchema = z.object({
	notionId: z.string(),
	slug: z.string(),
	titulo: z.string().min(1),
	formato: z.enum(FORMATOS),
	estado: z.enum(ESTADOS),
	resumen: z.string().min(1),
	imagen: imagen.nullable(),
	/** "Créditos de foto" de la imagen principal. */
	creditos: z.string().default(''),
	galeria: z.array(imagen),
	fechaPublicacion: z.coerce.date(),
	fechaEvento: z
		.object({ inicio: z.coerce.date(), fin: z.coerce.date().nullable(), conHora: z.boolean() })
		.nullable(),
	modalidad: z.enum(['presencial', 'virtual', 'hibrido']).nullable(),
	lugar: lugar.nullable(),
	boton: z.object({ texto: z.string(), url: z.string() }).nullable(),
	etiquetas: z.array(z.string()),
	destacado: z.enum(['portada', 'destacada']).nullable(),
	pilar: z.string().nullable(),
	autor: z.string().nullable(),
	tiempoLectura: z.number().int().min(1),
	seoDescripcion: z.string(),
	/** Slugs que tuvo antes: sus URLs redirigen a la actual. */
	slugsAnteriores: z.array(z.string()).default([]),
	actualizado: z.coerce.date(),
});
export type NovedadData = z.input<typeof novedadSchema>;

export const pilarSchema = z.object({
	notionId: z.string(),
	slug: z.string(),
	nombre: z.string().min(1),
	descripcion: z.string(),
	imagen: imagen.nullable(),
	/** azul, naranja, verde, morado, rosado, rojo, amarillo, marron, gris */
	color: z.string().nullable(),
	orden: z.number(),
	correo: z.string().nullable(),
});
export type PilarData = z.input<typeof pilarSchema>;

export const miembroSchema = z.object({
	notionId: z.string(),
	nombre: z.string().min(1),
	cargo: z.string(),
	rol: z.string().nullable(),
	bio: z.string(),
	foto: imagen.nullable(),
	instagram: z.string().nullable(),
	linkedin: z.string().nullable(),
	web: z.string().nullable(),
	pilares: z.array(z.string()),
	mostrar: z.boolean(),
	orden: z.number(),
});
export type MiembroData = z.input<typeof miembroSchema>;

export const testimonioSchema = z.object({
	notionId: z.string(),
	nombre: z.string().min(1),
	rol: z.string().nullable(),
	carrera: z.string(),
	ciclo: z.string(),
	frase: z.string(),
	testimonio: z.string().min(1),
	habilidades: z.array(z.string()),
	foto: imagen.nullable(),
	instagram: z.string().nullable(),
	pilar: z.string().nullable(),
	orden: z.number(),
});
export type TestimonioData = z.input<typeof testimonioSchema>;

export const aliadoSchema = z.object({
	notionId: z.string(),
	nombre: z.string().min(1),
	logo: imagen.nullable(),
	sitioWeb: z.string().nullable(),
	tipo: z.string().nullable(),
	descripcion: z.string(),
	pilar: z.string().nullable(),
	orden: z.number(),
});
export type AliadoData = z.input<typeof aliadoSchema>;

export const cifraSchema = z.object({
	notionId: z.string(),
	nombre: z.string().min(1),
	valor: z.number(),
	prefijo: z.string(),
	sufijo: z.string(),
	descripcion: z.string(),
	orden: z.number(),
	actualizadoAl: z.coerce.date().nullable(),
});
export type CifraData = z.input<typeof cifraSchema>;

/** Tabla "Sitio": una sola fila con lo que el equipo cambia sin programar. */
export const sitioSchema = z.object({
	nombre: z.string(),
	mision: z.string(),
	vision: z.string(),
	descripcion: z.string(),
	redes: z.object({
		instagram: z.string().nullable(),
		linkedin: z.string().nullable(),
		tiktok: z.string().nullable(),
		facebook: z.string().nullable(),
		whatsapp: z.string().nullable(),
	}),
	correo: z.string().nullable(),
	unete: z.object({ url: z.string().nullable(), texto: z.string() }),
	actualizado: z.coerce.date(),
});
export type SitioData = z.input<typeof sitioSchema>;
