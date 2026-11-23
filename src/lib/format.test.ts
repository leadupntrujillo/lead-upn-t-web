import { describe, expect, it } from 'vitest';
import { diaYHora, diasRestantes, esSoloDia, fechaCorta, fechaLarga, hora, modalidadTexto, partesDeFecha } from './format';

describe('fechas', () => {
	it('una fecha sin hora no se corre al día anterior (medianoche UTC)', () => {
		const d = new Date('2026-05-22'); // en Lima serían las 19:00 del 21
		expect(esSoloDia(d)).toBe(true);
		expect(fechaLarga(d)).toBe('22 de mayo de 2026');
		expect(fechaCorta(d)).toBe('22 may 2026');
		expect(partesDeFecha(d)).toEqual({ dia: '22', mes: 'may', anio: '2026' });
	});

	it('una fecha con hora se muestra en hora de Lima', () => {
		const d = new Date('2026-12-05T18:00:00-05:00'); // 23:00 UTC
		expect(esSoloDia(d)).toBe(false);
		expect(fechaLarga(d)).toBe('5 de diciembre de 2026');
		expect(hora(d)).toMatch(/^6:00\s?p\.\s?m\.$/);
	});

	it('una hora tarde de Lima que ya es otro día en UTC sigue siendo el día de Lima', () => {
		const d = new Date('2026-12-05T21:00:00-05:00'); // 02:00 UTC del 6
		expect(fechaLarga(d, true)).toBe('5 de diciembre de 2026');
	});
});

describe('diasRestantes', () => {
	const ahora = new Date('2026-12-10T15:00:00Z'); // 10 dic, 10:00 en Lima
	it('cuenta por días de calendario', () => {
		expect(diasRestantes(new Date('2026-12-15'), ahora)).toBe(5);
		expect(diasRestantes(new Date('2026-12-10'), ahora)).toBe(0);
		expect(diasRestantes(new Date('2026-12-08'), ahora)).toBe(-2);
	});
	it('de noche en Lima sigue siendo el mismo día', () => {
		const tarde = new Date('2026-12-11T03:00:00Z'); // 10 dic, 22:00 en Lima
		expect(diasRestantes(new Date('2026-12-10'), tarde)).toBe(0);
	});
});

describe('franja de próxima fecha', () => {
	it('día de la semana y hora de 24 h en Lima', () => {
		expect(diaYHora(new Date('2026-12-05T18:00:00-05:00'))).toBe('Sábado 18:00');
	});
	it('sin hora, solo el día (sin correrse por la zona)', () => {
		expect(diaYHora(new Date('2026-12-05'))).toBe('Sábado');
	});
	it('modalidad con tilde', () => {
		expect(modalidadTexto('hibrido')).toBe('Híbrido');
		expect(modalidadTexto(null)).toBeNull();
	});
});
