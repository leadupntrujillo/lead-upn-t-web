import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import {
	aliadosLoader,
	cifrasLoader,
	miembrosLoader,
	novedadesLoader,
	pilaresLoader,
	testimoniosLoader,
} from './lib/notion/collections';
import {
	aliadoSchema,
	cifraSchema,
	miembroSchema,
	novedadSchema,
	pilarSchema,
	testimonioSchema,
} from './lib/notion/schemas';

/**
 * Colecciones alimentadas desde Notion (ver CLAUDE.md y src/lib/notion/).
 * Los ids de `pilares` y `miembros` son los ids de página de Notion; `novedades` usa el slug.
 */
export const collections = {
	novedades: defineCollection({
		loader: novedadesLoader(),
		schema: novedadSchema.extend({
			pilar: reference('pilares').nullable(),
			autor: reference('miembros').nullable(),
		}),
	}),
	pilares: defineCollection({ loader: pilaresLoader(), schema: pilarSchema }),
	miembros: defineCollection({
		loader: miembrosLoader(),
		schema: miembroSchema.extend({ pilares: z.array(reference('pilares')) }),
	}),
	testimonios: defineCollection({
		loader: testimoniosLoader(),
		schema: testimonioSchema.extend({ pilar: reference('pilares').nullable() }),
	}),
	aliados: defineCollection({
		loader: aliadosLoader(),
		schema: aliadoSchema.extend({ pilar: reference('pilares').nullable() }),
	}),
	cifras: defineCollection({ loader: cifrasLoader(), schema: cifraSchema }),
};
