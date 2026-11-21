import { describe, expect, it } from 'vitest';
import { fechasCal, googleCalendarUrl, icsDe, type EventoCal } from './calendario';
import { slugEtiqueta } from './novedades';

const base: EventoCal = {
	titulo: 'Taller, de liderazgo',
	resumen: 'Resumen',
	url: 'https://leadupntrujillo.com/novedades/taller',
	lugar: 'Auditorio, UPN',
	inicio: new Date('2026-12-05T23:00:00Z'),
	fin: new Date('2026-12-06T01:00:00Z'),
	conHora: true,
};

describe('calendario', () => {
	it('con hora usa instantes UTC', () => {
		expect(fechasCal(base)).toEqual({ inicio: '20261205T230000Z', fin: '20261206T010000Z', todoElDia: false });
	});
	it('sin hora es de día completo con fin exclusivo', () => {
		expect(fechasCal({ ...base, conHora: false, inicio: new Date('2026-12-05T00:00:00Z'), fin: null })).toEqual({
			inicio: '20261205',
			fin: '20261206',
			todoElDia: true,
		});
	});
	it('el .ics escapa comas y trae lo esencial', () => {
		const ics = icsDe(base, new Date('2026-11-20T00:00:00Z'));
		expect(ics).toContain('SUMMARY:Taller\\, de liderazgo');
		expect(ics).toContain('DTSTART:20261205T230000Z');
		expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
	});
	it('arma el enlace de Google Calendar', () => {
		expect(googleCalendarUrl(base)).toContain('dates=20261205T230000Z%2F20261206T010000Z');
	});
});

describe('slugEtiqueta', () => {
	it('quita tildes y signos', () => {
		expect(slugEtiqueta('Liderazgo Femenino')).toBe('liderazgo-femenino');
		expect(slugEtiqueta('¡Innovación!')).toBe('innovacion');
	});
});
