import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { FORMATOS_INFO } from '../lib/notion/formatos';
import { getNovedades, getSitio } from '../lib/queries';
import { NOMBRE } from '../lib/seo';

/** RSS con las últimas 30 novedades publicadas. */
export const GET: APIRoute = async ({ site }) => {
	const [novedades, sitio] = await Promise.all([getNovedades(), getSitio()]);
	return rss({
		title: `Novedades de ${NOMBRE}`,
		description: sitio.descripcion,
		site: site ?? 'https://leadupntrujillo.com',
		customData: '<language>es-pe</language>',
		items: novedades.slice(0, 30).map((n) => ({
			title: n.data.titulo,
			description: n.data.resumen,
			link: `/novedades/${n.id}`,
			pubDate: n.data.fechaPublicacion,
			categories: [FORMATOS_INFO[n.data.formato].nombre, ...n.data.etiquetas],
		})),
	});
};
