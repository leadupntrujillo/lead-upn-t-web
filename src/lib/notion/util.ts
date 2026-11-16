/** Texto → slug de URL: sin acentos, minúsculas, solo [a-z0-9-]. */
export function slugify(input: string, max = 70): string {
	const slug = input
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	if (slug.length <= max) return slug;
	const cut = slug.slice(0, max);
	const lastDash = cut.lastIndexOf('-');
	return (lastDash > max / 2 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
}

/** UUID de Notion con o sin guiones → siempre sin guiones y en minúsculas. */
export const normalizeId = (id: string): string => id.replace(/-/g, '').toLowerCase();

export const countWords = (text: string): number => (text.match(/\S+/g) ?? []).length;

/** Minutos de lectura a 200 palabras por minuto (mínimo 1). */
export const readingMinutes = (words: number): number => Math.max(1, Math.ceil(words / 200));

/** Quita etiquetas HTML para contar palabras. */
export const stripTags = (html: string): string => html.replace(/<[^>]+>/g, ' ');

/** Fecha de hoy (YYYY-MM-DD) en hora de Lima, para comparar con "Fecha de publicación". */
export const todayInLima = (now: Date = new Date()): string =>
	now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

export const escapeHtml = (s: string): string =>
	s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

/**
 * Devuelve la URL solo si es segura (http, https, mailto, tel). Si no, null.
 * Los enlaces a páginas privadas de Notion (notion.so / notion.com) se descartan.
 */
export function safeHref(raw: string | null | undefined): string | null {
	if (!raw) return null;
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (!['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) return null;
	const host = url.hostname.toLowerCase();
	if (/(^|\.)notion\.(so|com)$/.test(host)) return null;
	return url.toString();
}

/** Solo http/https (para botones, webs, logos). */
export function safeWebUrl(raw: string | null | undefined): string | null {
	const href = safeHref(raw);
	return href && /^https?:/.test(href) ? href : null;
}

/** Memoriza una promesa durante `ttlMs` (para que varios loaders compartan una consulta). */
export function memoTtl<T>(fn: () => Promise<T>, ttlMs: number): () => Promise<T> {
	let cached: { at: number; value: Promise<T> } | undefined;
	return () => {
		const now = Date.now();
		if (!cached || now - cached.at > ttlMs) {
			const value = fn();
			cached = { at: now, value };
			value.catch(() => {
				if (cached?.value === value) cached = undefined;
			});
		}
		return cached.value;
	};
}
