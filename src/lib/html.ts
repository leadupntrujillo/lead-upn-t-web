/**
 * Utilidades para sacar piezas del HTML que genera el backend (src/lib/notion/blocks.ts).
 * Permiten que formatos como Logros o Entrevista muestren partes del texto con otro diseño.
 * Convenciones para quien escribe en Notion:
 *   - Logros: una lista cuyos ítems empiezan con la cifra en negrita ("**120** asistentes").
 *   - Entrevista: la primera cita es la frase destacada; cada pregunta es un Encabezado 3.
 */
const ENTIDADES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

export const textoPlano = (html: string): string =>
	html
		.replace(/<br\s*\/?>/g, ' ')
		.replace(/<[^>]+>/g, '')
		.replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTIDADES[e] ?? e)
		.replace(/\s+/g, ' ')
		.trim();

export interface Cifra {
	valor: string;
	etiqueta: string;
}

/**
 * Busca la primera lista cuyos ítems son "<strong>cifra</strong> texto" (1 a 6 ítems) y la saca del HTML.
 * También quita el encabezado inmediatamente anterior si dice "cifras", "números" o "resultados".
 */
export function extraerCifras(html: string): { cifras: Cifra[]; html: string } {
	for (const lista of html.matchAll(/<ul>((?:<li>.*?<\/li>)+)<\/ul>/gs)) {
		const items = [...lista[1]!.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[1]!);
		const cifras: Cifra[] = [];
		for (const item of items) {
			const m = /^<strong>([^<]{1,10})<\/strong>\s*(.*)$/s.exec(item);
			if (!m || !/\d/.test(m[1]!)) break;
			cifras.push({ valor: textoPlano(m[1]!), etiqueta: textoPlano(m[2]!) });
		}
		if (cifras.length === 0 || cifras.length !== items.length || cifras.length > 6) continue;

		const inicio = lista.index!;
		const antes = html.slice(0, inicio);
		const titulo = /<h[2-4][^>]*>([^<]*)<\/h[2-4]>$/.exec(antes);
		const corte = titulo && /cifras|n[uú]meros|resultados/i.test(titulo[1]!) ? inicio - titulo[0].length : inicio;
		return { cifras, html: html.slice(0, corte) + html.slice(inicio + lista[0].length) };
	}
	return { cifras: [], html };
}

/** Saca la primera cita (<blockquote>) del HTML y devuelve su texto. */
export function extraerCita(html: string): { cita: string | null; html: string } {
	const m = /<blockquote>(.*?)<\/blockquote>/s.exec(html);
	if (!m) return { cita: null, html };
	const cita = textoPlano(m[1]!);
	return { cita: cita || null, html: html.slice(0, m.index) + html.slice(m.index + m[0].length) };
}
