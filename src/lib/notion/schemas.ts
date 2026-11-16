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

const imagen = z.object({ src: z.string(), alt: z.string() });

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
	resumen: z.string().min(1),
	imagen: imagen.nullable(),
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
