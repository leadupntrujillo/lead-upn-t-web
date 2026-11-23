import type { CollectionEntry } from 'astro:content';

/** Datos mínimos de una novedad con fecha de evento para agregarla a un calendario. */
export interface EventoCal {
	titulo: string;
	resumen: string;
	url: string;
	lugar: string;
	inicio: Date;
	fin: Date | null;
	conHora: boolean;
}

export function eventoCal(n: CollectionEntry<'novedades'>, base: string): EventoCal | null {
	const fe = n.data.fechaEvento;
	if (!fe) return null;
	const l = n.data.lugar;
	return {
		titulo: n.data.titulo,
		resumen: n.data.resumen,
		url: `${base}/novedades/${n.id}`,
		lugar: l ? [l.nombre, l.direccion].filter(Boolean).join(', ') : '',
		inicio: fe.inicio,
		fin: fe.fin,
		conHora: fe.conHora,
	};
}

const pad = (n: number) => String(n).padStart(2, '0');
const diaUTC = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const instante = (d: Date) => `${diaUTC(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Inicio y fin en el formato de calendario. Sin hora: evento de día completo (el fin es exclusivo, por eso +1 día). */
export function fechasCal(e: EventoCal): { inicio: string; fin: string; todoElDia: boolean } {
	if (!e.conHora) {
		const ultimo = e.fin ?? e.inicio;
		return { inicio: diaUTC(e.inicio), fin: diaUTC(new Date(ultimo.getTime() + 86_400_000)), todoElDia: true };
	}
	// Sin hora de fin, se asume 1 hora de duración.
	return { inicio: instante(e.inicio), fin: instante(e.fin ?? new Date(e.inicio.getTime() + 3_600_000)), todoElDia: false };
}

export function googleCalendarUrl(e: EventoCal): string {
	const { inicio, fin } = fechasCal(e);
	const p = new URLSearchParams({
		action: 'TEMPLATE',
		text: e.titulo,
		dates: `${inicio}/${fin}`,
		details: `${e.resumen}\n\n${e.url}`,
		location: e.lugar,
	});
	return `https://calendar.google.com/calendar/render?${p}`;
}

const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Archivo .ics (Apple Calendar, Outlook…). */
export function icsDe(e: EventoCal, ahora: Date = new Date()): string {
	const { inicio, fin, todoElDia } = fechasCal(e);
	const f = todoElDia ? ';VALUE=DATE' : '';
	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//LEAD UPN Trujillo//Web//ES',
		'CALSCALE:GREGORIAN',
		'BEGIN:VEVENT',
		`UID:${e.url}`,
		`DTSTAMP:${instante(ahora)}`,
		`DTSTART${f}:${inicio}`,
		`DTEND${f}:${fin}`,
		`SUMMARY:${escapar(e.titulo)}`,
		`DESCRIPTION:${escapar(`${e.resumen}\n${e.url}`)}`,
		e.lugar && `LOCATION:${escapar(e.lugar)}`,
		`URL:${e.url}`,
		'END:VEVENT',
		'END:VCALENDAR',
	]
		.filter(Boolean)
		.join('\r\n');
}
