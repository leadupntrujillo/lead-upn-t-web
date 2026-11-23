import { describe, expect, it } from 'vitest';
import { CICLO, FIN_INTRO, TIEMPOS, easeInOutCubic, easeOutCubic, estadoEn, frenteDeBanda, lerp, suavizar } from './easing';

describe('easings', () => {
	it('empiezan en 0, terminan en 1 y no se salen del rango', () => {
		for (const f of [easeOutCubic, easeInOutCubic]) {
			expect(f(0)).toBe(0);
			expect(f(1)).toBe(1);
			expect(f(-1)).toBe(0);
			expect(f(2)).toBe(1);
		}
		expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5); // sale rápido y frena
	});

	it('lerp', () => {
		expect(lerp(10, 20, 0.25)).toBe(12.5);
	});
});

describe('suavizado del mouse', () => {
	it('a 60 FPS es exactamente actual += (objetivo - actual) * 0,08', () => {
		expect(suavizar(0, 1, 0.08, 1 / 60)).toBeCloseTo(0.08);
	});

	it('no depende de los FPS: 1 s a 30 FPS y a 120 FPS llegan al mismo punto', () => {
		const correr = (fps: number) => {
			let x = 0;
			for (let i = 0; i < fps; i++) x = suavizar(x, 1, 0.08, 1 / fps);
			return x;
		};
		expect(correr(30)).toBeCloseTo(correr(120), 6);
	});
});

describe('línea de tiempo (§6)', () => {
	const { dibujo, pausa, revelar, enCapas, volver } = TIEMPOS;

	it('intro: vacío → Polígonos (1,6 s) → pausa (0,8 s) → Capas (2,2 s)', () => {
		expect(estadoEn(0).fase).toBe(0);
		expect(estadoEn(dibujo / 2).fase).toBeGreaterThan(0.5); // easeOutCubic
		expect(estadoEn(dibujo + pausa / 2)).toEqual({ fase: 1, sentido: 0 });
		expect(estadoEn(dibujo + pausa + revelar / 2).fase).toBeCloseTo(1.5);
		expect(estadoEn(FIN_INTRO)).toEqual({ fase: 2, sentido: 0 });
		expect(FIN_INTRO).toBeCloseTo(4.6);
	});

	it('se queda 14 s en Capas', () => {
		expect(estadoEn(FIN_INTRO + enCapas - 0.01)).toEqual({ fase: 2, sentido: 0 });
	});

	it('vuelve a Polígonos con la banda bajando (sentido 1), pausa y regresa a Capas', () => {
		const vuelta = estadoEn(FIN_INTRO + enCapas + volver / 2);
		expect(vuelta.sentido).toBe(1);
		expect(vuelta.fase).toBeCloseTo(1.5);
		expect(estadoEn(FIN_INTRO + enCapas + volver + pausa / 2)).toEqual({ fase: 1, sentido: 0 });
		expect(estadoEn(FIN_INTRO + CICLO - 0.001).fase).toBeCloseTo(2, 2);
		expect(CICLO).toBeCloseTo(18.2);
	});

	it('el ciclo se repite igual', () => {
		const t = FIN_INTRO + enCapas + volver / 3;
		expect(estadoEn(t + CICLO * 5).fase).toBeCloseTo(estadoEn(t).fase, 6);
	});

	it('la fase nunca se sale de 0–2', () => {
		for (let t = 0; t < 60; t += 0.05) {
			const { fase } = estadoEn(t);
			expect(fase).toBeGreaterThanOrEqual(0);
			expect(fase).toBeLessThanOrEqual(2);
		}
	});
});

describe('frente de la banda', () => {
	it('baja de arriba abajo y solo está activo mientras se mueve', () => {
		expect(frenteDeBanda({ fase: 2, sentido: 0 }).activa).toBe(false);
		expect(frenteDeBanda({ fase: 1, sentido: 0 }).activa).toBe(false);
		const a = frenteDeBanda({ fase: 1.2, sentido: 0 });
		const b = frenteDeBanda({ fase: 1.8, sentido: 0 });
		expect(a.activa && b.activa).toBe(true);
		expect(a.altura).toBeGreaterThan(b.altura);
		// De vuelta a Polígonos también baja: al principio de la vuelta está arriba
		expect(frenteDeBanda({ fase: 1.9, sentido: 1 }).altura).toBeGreaterThan(frenteDeBanda({ fase: 1.1, sentido: 1 }).altura);
	});
});
