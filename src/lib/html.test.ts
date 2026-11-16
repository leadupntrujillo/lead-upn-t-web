import { describe, expect, it } from 'vitest';
import { extraerCifras, extraerCita, textoPlano } from './html';

describe('textoPlano', () => {
	it('quita etiquetas y decodifica entidades', () => {
		expect(textoPlano('<p>Hola &amp; <strong>chau</strong><br>fin</p>')).toBe('Hola & chau fin');
	});
});

describe('extraerCifras', () => {
	const html =
		'<p>Intro</p><h3 id="en-cifras">En cifras</h3><ul><li><strong>120</strong> asistentes en total</li><li><strong>8</strong> eventos</li></ul><p>Después</p>';

	it('saca la lista de cifras y el encabezado que la anuncia', () => {
		const out = extraerCifras(html);
		expect(out.cifras).toEqual([
			{ valor: '120', etiqueta: 'asistentes en total' },
			{ valor: '8', etiqueta: 'eventos' },
		]);
		expect(out.html).toBe('<p>Intro</p><p>Después</p>');
	});

	it('deja el encabezado si no habla de cifras', () => {
		const out = extraerCifras('<h3>Cómo fue</h3><ul><li><strong>3</strong> días</li></ul>');
		expect(out.cifras).toHaveLength(1);
		expect(out.html).toBe('<h3>Cómo fue</h3>');
	});

	it('ignora listas normales o mezcladas', () => {
		const normal = '<ul><li>Uno</li><li>Dos</li></ul>';
		expect(extraerCifras(normal)).toEqual({ cifras: [], html: normal });
		const mezcla = '<ul><li><strong>5</strong> a</li><li>sin cifra</li></ul>';
		expect(extraerCifras(mezcla).cifras).toEqual([]);
		const sinNumero = '<ul><li><strong>Importante</strong> aviso</li></ul>';
		expect(extraerCifras(sinNumero).cifras).toEqual([]);
	});

	it('acepta porcentajes y sufijos cortos', () => {
		expect(extraerCifras('<ul><li><strong>95%</strong> de satisfacción</li></ul>').cifras[0]).toEqual({ valor: '95%', etiqueta: 'de satisfacción' });
	});
});

describe('extraerCita', () => {
	it('saca la primera cita como texto plano', () => {
		const out = extraerCita('<blockquote>Liderar es <em>acompañar</em>.</blockquote><p>Resto</p><blockquote>Otra</blockquote>');
		expect(out.cita).toBe('Liderar es acompañar.');
		expect(out.html).toBe('<p>Resto</p><blockquote>Otra</blockquote>');
	});
	it('sin cita deja el HTML igual', () => {
		expect(extraerCita('<p>Hola</p>')).toEqual({ cita: null, html: '<p>Hola</p>' });
	});
});
