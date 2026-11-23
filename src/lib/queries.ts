import { getCollection, getEntry } from 'astro:content';
import { armarPortada, porFecha } from './novedades';
import { DESCRIPCION_POR_DEFECTO, INSTAGRAM_POR_DEFECTO } from './seo';

/**
 * Punto de entrada de datos para las páginas: todo lo que viene de Notion se pide desde aquí.
 * (La lógica de ordenar y agrupar está en `novedades.ts`.)
 */
const porOrden = <T extends { data: { orden: number } }>(list: T[]): T[] => [...list].sort((a, b) => a.data.orden - b.data.orden);

/** Todas las novedades publicadas, la más reciente primero. */
export const getNovedades = async () => porFecha(await getCollection('novedades'));

export const getNovedad = (slug: string) => getEntry('novedades', slug);

/** Principal + destacadas + recientes para la página de inicio. */
export const getPortada = async () => armarPortada(await getNovedades());

export const getPilares = async () => porOrden(await getCollection('pilares'));

/** Pilares indexados por id (para resolver `novedad.data.pilar.id` sin consultar de nuevo). */
export const getPilaresPorId = async () => new Map((await getPilares()).map((p) => [p.id, p]));

/** Miembros marcados "Mostrar en la web" (sección Equipo). */
export const getEquipo = async () => porOrden((await getCollection('miembros')).filter((m) => m.data.mostrar));

export const getTestimonios = async () => porOrden(await getCollection('testimonios'));

export const getAliados = async () => porOrden(await getCollection('aliados'));

export const getCifras = async () => porOrden(await getCollection('cifras'));

/**
 * Datos generales de la tabla "Sitio" (misión, visión, redes, Únete) y el texto de "Nosotros".
 * Si la tabla está vacía, se usan valores por defecto para que nada se rompa.
 */
export const getSitio = async () => {
	const entry = await getEntry('sitio', 'sitio');
	const d = entry?.data;
	return {
		nombre: d?.nombre ?? 'LEAD UPN Trujillo',
		mision: d?.mision ?? '',
		vision: d?.vision ?? '',
		descripcion: d?.descripcion || DESCRIPCION_POR_DEFECTO,
		redes: {
			instagram: d?.redes.instagram ?? INSTAGRAM_POR_DEFECTO,
			linkedin: d?.redes.linkedin ?? null,
			tiktok: d?.redes.tiktok ?? null,
			facebook: d?.redes.facebook ?? null,
			whatsapp: d?.redes.whatsapp ?? null,
		},
		correo: d?.correo ?? null,
		unete: {
			// Mientras no haya link de postulación, "Únete" lleva al Instagram.
			url: d?.unete.url ?? d?.redes.instagram ?? INSTAGRAM_POR_DEFECTO,
			texto: d?.unete.texto || 'Síguenos para enterarte de las próximas convocatorias y actividades.',
		},
		/** Cuerpo de la página de Notion (historia, LEAD Americas…), ya en HTML. */
		historia: entry?.rendered?.html ?? '',
	};
};
export type Sitio = Awaited<ReturnType<typeof getSitio>>;
