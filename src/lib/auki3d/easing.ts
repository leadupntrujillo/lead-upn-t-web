/**
 * Easings, suavizado y línea de tiempo de Auki (brief §6). Funciones puras: se prueban con vitest.
 */

export const clamp = (x: number, min = 0, max = 1): number => Math.min(Math.max(x, min), max);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const easeOutCubic = (t: number): number => 1 - (1 - clamp(t)) ** 3;
export const easeInOutCubic = (t: number): number => {
	const x = clamp(t);
	return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
};

/**
 * `actual += (objetivo - actual) * factor` por cuadro, pero normalizado al tiempo real:
 * con `dt` en segundos da lo mismo a 30, 60 o 120 FPS (el factor está pensado para 60 FPS).
 */
export function suavizar(actual: number, objetivo: number, factor: number, dt: number): number {
	const k = 1 - (1 - factor) ** (dt * 60);
	return actual + (objetivo - actual) * k;
}

// ---------- Línea de tiempo (§6) ----------

/** Duraciones en segundos. */
export const TIEMPOS = {
	dibujo: 1.6, // uFase 0 → 1 (easeOutCubic): aparecen los polígonos
	pausa: 0.8, // en Polígonos
	revelar: 2.2, // uFase 1 → 2 (easeInOutCubic): la banda revela las Capas
	enCapas: 14, // cada 14 s en Capas…
	volver: 1.2, // …vuelve a Polígonos (2 → 1)…
} as const;

/** Momento en que termina la intro y Auki queda en Capas por primera vez. */
export const FIN_INTRO = TIEMPOS.dibujo + TIEMPOS.pausa + TIEMPOS.revelar;
/** Un ciclo completo después de la intro: Capas → Polígonos → pausa → Capas. */
export const CICLO = TIEMPOS.enCapas + TIEMPOS.volver + TIEMPOS.pausa + TIEMPOS.revelar;

export interface Estado {
	/** uFase: 0 → 1 Polígonos, 1 → 2 Capas. */
	fase: number;
	/**
	 * Sentido de la banda (siempre baja de arriba abajo):
	 * 0 = revela Capas (arriba ya hay Capas), 1 = vuelve a Polígonos (arriba ya hay Polígonos).
	 */
	sentido: 0 | 1;
}

/**
 * Estado en el segundo `t` desde que el GLB está listo. `t` es tiempo **activo**: el reloj se
 * detiene con la pestaña oculta o el hero fuera de pantalla, así que el ciclo no avanza a escondidas.
 */
export function estadoEn(t: number): Estado {
	const { dibujo, pausa, revelar, enCapas, volver } = TIEMPOS;
	if (t <= 0) return { fase: 0, sentido: 0 };
	if (t < dibujo) return { fase: easeOutCubic(t / dibujo), sentido: 0 };
	if (t < dibujo + pausa) return { fase: 1, sentido: 0 };
	if (t < FIN_INTRO) return { fase: 1 + easeInOutCubic((t - dibujo - pausa) / revelar), sentido: 0 };

	const c = (t - FIN_INTRO) % CICLO;
	if (c < enCapas) return { fase: 2, sentido: 0 };
	if (c < enCapas + volver) return { fase: 2 - easeInOutCubic((c - enCapas) / volver), sentido: 1 };
	if (c < enCapas + volver + pausa) return { fase: 1, sentido: 0 };
	return { fase: 1 + easeInOutCubic((c - enCapas - volver - pausa) / revelar), sentido: 0 };
}
