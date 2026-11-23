import { describe, expect, it } from 'vitest';
import { memoTtl, normalizeId, readingMinutes, safeHref, safeWebUrl, slugify, todayInLima } from './util';

describe('slugify', () => {
	it('quita acentos y signos', () => {
		expect(slugify('Educación & Ciencia — ¡Hola, Perú!')).toBe('educacion-ciencia-hola-peru');
		expect(slugify('Ingeniería')).toBe('ingenieria');
		expect(slugify('Post IG')).toBe('post-ig');
		expect(slugify('Híbrido')).toBe('hibrido');
	});
	it('corta en límite de palabra', () => {
		const slug = slugify('palabra '.repeat(30), 20);
		expect(slug.length).toBeLessThanOrEqual(20);
		expect(slug.endsWith('-')).toBe(false);
	});
	it('devuelve vacío si no hay letras', () => {
		expect(slugify('¡¡¡')).toBe('');
	});
});

describe('helpers', () => {
	it('normalizeId quita guiones', () => {
		expect(normalizeId('31A6ACB1-45F5-805A')).toBe('31a6acb145f5805a');
	});
	it('readingMinutes: mínimo 1, 200 palabras por minuto', () => {
		expect(readingMinutes(0)).toBe(1);
		expect(readingMinutes(200)).toBe(1);
		expect(readingMinutes(201)).toBe(2);
		expect(readingMinutes(930)).toBe(5);
	});
	it('todayInLima usa la fecha de Lima, no la UTC', () => {
		// 03:00 UTC del día 16 = 22:00 del día 15 en Lima (UTC-5)
		expect(todayInLima(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-15');
	});
});

describe('URLs seguras', () => {
	it('acepta http(s), mailto y tel', () => {
		expect(safeHref('https://leadupn.page/')).toBe('https://leadupn.page/');
		expect(safeHref('mailto:hola@lead.pe')).toBe('mailto:hola@lead.pe');
	});
	it('rechaza javascript:, data: y rutas relativas', () => {
		expect(safeHref('javascript:alert(1)')).toBeNull();
		expect(safeHref('data:text/html,<script>')).toBeNull();
		expect(safeHref('/3216acb145f580dc')).toBeNull();
		expect(safeHref(null)).toBeNull();
	});
	it('descarta enlaces a páginas privadas de Notion', () => {
		expect(safeHref('https://www.notion.so/abc')).toBeNull();
		expect(safeHref('https://app.notion.com/p/abc')).toBeNull();
		expect(safeHref('https://lead.notion.site/publica')).not.toBeNull();
	});
	it('safeWebUrl solo permite http(s)', () => {
		expect(safeWebUrl('mailto:a@b.c')).toBeNull();
		expect(safeWebUrl('https://lead.pe')).toBe('https://lead.pe/');
	});
});

describe('memoTtl', () => {
	it('reutiliza la promesa dentro del TTL y reintenta si falló', async () => {
		let calls = 0;
		const ok = memoTtl(async () => ++calls, 10_000);
		await ok();
		await ok();
		expect(calls).toBe(1);

		let attempts = 0;
		const flaky = memoTtl(async () => {
			if (++attempts === 1) throw new Error('falló');
			return 'ok';
		}, 10_000);
		await expect(flaky()).rejects.toThrow('falló');
		await new Promise((r) => setTimeout(r));
		await expect(flaky()).resolves.toBe('ok');
	});
});
