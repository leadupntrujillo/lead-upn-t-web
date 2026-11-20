import type { APIRoute } from 'astro';

/** robots.txt: todo indexable salvo la 404; apunta al sitemap. */
export const GET: APIRoute = ({ site }) => {
	const sitemap = new URL('/sitemap-index.xml', site ?? 'https://leadupntrujillo.com').toString();
	return new Response(`User-agent: *\nAllow: /\nDisallow: /404\n\nSitemap: ${sitemap}\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
