import { getCollection, getEntry } from 'astro:content';
import { armarPortada, porFecha } from './novedades';

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

/** Miembros marcados "Mostrar en la web" (sección Equipo). */
export const getEquipo = async () => porOrden((await getCollection('miembros')).filter((m) => m.data.mostrar));

export const getTestimonios = async () => porOrden(await getCollection('testimonios'));

export const getAliados = async () => porOrden(await getCollection('aliados'));

export const getCifras = async () => porOrden(await getCollection('cifras'));
