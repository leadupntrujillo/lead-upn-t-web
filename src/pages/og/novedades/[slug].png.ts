import type { APIRoute, GetStaticPaths } from 'astro';
import { fechaCorta } from '../../../lib/format';
import { FORMATOS_INFO } from '../../../lib/notion/formatos';
import { rutaPublica } from '../../../lib/notion/images';
import { tarjetaNovedad } from '../../../lib/og/tarjeta';
import { getNovedades } from '../../../lib/queries';

/** Una imagen para compartir (1200×630) por novedad: /og/novedades/<slug>.png */
export const getStaticPaths = (async () => {
	const novedades = await getNovedades();
	return novedades.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
	const { entry } = props as Awaited<ReturnType<typeof getStaticPaths>>[number]['props'];
	const d = entry.data;
	const foto = d.imagen ?? d.galeria[0] ?? null;
	const fecha = d.fechaEvento && (d.formato === 'evento' || d.formato === 'convocatoria') ? d.fechaEvento : null;
	const etiqueta = [FORMATOS_INFO[d.formato].nombre, fecha ? fechaCorta(fecha.inicio, fecha.conHora) : null].filter(Boolean).join(' · ');
	const png = await tarjetaNovedad({
		titulo: d.titulo,
		etiqueta,
		// Solo fotos locales ya optimizadas (las externas sin descargar se omiten).
		foto: foto?.src.startsWith('/_notion/') ? rutaPublica(foto.src) : null,
	});
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
