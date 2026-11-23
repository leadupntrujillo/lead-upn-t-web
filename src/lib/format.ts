/**
 * Formato de fechas para la web (es-PE, hora de Lima).
 *
 * Una fecha de Notion sin hora ("2026-05-22") llega como medianoche UTC: si se mostrara en
 * hora de Lima caería en el día anterior. Por eso las fechas "solo día" se formatean en UTC
 * y las que traen hora, en Lima.
 */
const LIMA = 'America/Lima';

/** true si la fecha es medianoche UTC exacta (es decir, venía sin hora). */
export const esSoloDia = (d: Date): boolean =>
	d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

const zona = (d: Date, conHora?: boolean): string => ((conHora ?? !esSoloDia(d)) ? LIMA : 'UTC');

const fmt = (d: Date, opciones: Intl.DateTimeFormatOptions, conHora?: boolean): string =>
	new Intl.DateTimeFormat('es-PE', { ...opciones, timeZone: zona(d, conHora) }).format(d);

/** "22 de mayo de 2026" */
export const fechaLarga = (d: Date, conHora?: boolean): string =>
	fmt(d, { day: 'numeric', month: 'long', year: 'numeric' }, conHora);

/** "22 may 2026" */
export const fechaCorta = (d: Date, conHora?: boolean): string =>
	fmt(d, { day: 'numeric', month: 'short', year: 'numeric' }, conHora).replace(/\./g, '');

/** "sábado 5 de diciembre" */
export const fechaConDia = (d: Date, conHora?: boolean): string =>
	fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }, conHora);

/** "6:00 p. m." (siempre en hora de Lima) */
export const hora = (d: Date): string =>
	new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: LIMA }).format(d);

/** Partes para una "hojita de calendario": { dia: "5", mes: "dic", anio: "2026" } */
export function partesDeFecha(d: Date, conHora?: boolean): { dia: string; mes: string; anio: string } {
	return {
		dia: fmt(d, { day: 'numeric' }, conHora),
		mes: fmt(d, { month: 'short' }, conHora).replace(/\./g, '').toLowerCase(),
		anio: fmt(d, { year: 'numeric' }, conHora),
	};
}

/** Valor para el atributo datetime de <time>. */
export const isoDia = (d: Date): string => d.toISOString().slice(0, 10);

export const minutosDeLectura = (n: number): string => `${n} min de lectura`;

/** Días que faltan hasta `limite` (0 = es hoy, negativo = ya pasó). */
export function diasRestantes(limite: Date, ahora: Date = new Date(), conHora?: boolean): number {
	const dia = (d: Date, z: string) => new Intl.DateTimeFormat('en-CA', { timeZone: z }).format(d);
	const hoy = Date.parse(dia(ahora, LIMA));
	const fin = Date.parse(dia(limite, zona(limite, conHora)));
	return Math.round((fin - hoy) / 86_400_000);
}

/** "Sábado 18:00" (con hora, en Lima) o "Sábado" (fecha sin hora). Para la franja "Próxima fecha". */
export function diaYHora(d: Date, conHora?: boolean): string {
	const lima = conHora ?? !esSoloDia(d);
	const dia = fmt(d, { weekday: 'long' }, lima);
	const texto = dia.charAt(0).toUpperCase() + dia.slice(1);
	if (!lima) return texto;
	const h = new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIMA }).format(d);
	return `${texto} ${h}`;
}

const MODALIDADES = { presencial: 'Presencial', virtual: 'Virtual', hibrido: 'Híbrido' } as const;

/** "Presencial" | "Virtual" | "Híbrido" */
export const modalidadTexto = (m: keyof typeof MODALIDADES | null | undefined): string | null => (m ? MODALIDADES[m] : null);
