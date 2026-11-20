import type { APIRoute } from 'astro';
import { tarjetaSitio } from '../../lib/og/tarjeta';

/** Imagen para compartir por defecto (inicio y páginas sin imagen propia). */
export const GET: APIRoute = async () =>
	new Response(new Uint8Array(await tarjetaSitio()), { headers: { 'Content-Type': 'image/png' } });
