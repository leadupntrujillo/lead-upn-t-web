import type { APIRoute, GetStaticPaths } from 'astro';
import { eventoCal, icsDe } from '../../lib/calendario';
import { getNovedades } from '../../lib/queries';

/** /novedades/<slug>.ics: archivo de calendario para los eventos y convocatorias con fecha. */
export const getStaticPaths = (async () => {
	const todas = await getNovedades();
	return todas.filter((n) => n.data.fechaEvento).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
	const evento = eventoCal(props.entry, site!.origin);
	return new Response(evento ? icsDe(evento) : '', { headers: { 'content-type': 'text/calendar; charset=utf-8' } });
};
