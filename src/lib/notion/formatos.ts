import type { Formato } from './schemas';

/**
 * Los 9 formatos de novedad: nombre para mostrar y qué le exige cada uno a la fila de Notion.
 * La web NO oculta una novedad por faltarle algo de esto: avisa en el log del build para que
 * el editor la complete (ver `faltantes`).
 */
export interface FormatoInfo {
	nombre: string;
	emoji: string;
	descripcion: string;
}

export const FORMATOS_INFO: Record<Formato, FormatoInfo> = {
	periodico: { nombre: 'Periódico', emoji: '📰', descripcion: 'Noticia completa con varias partes' },
	anuncio: { nombre: 'Anuncio', emoji: '📢', descripcion: 'Aviso corto e importante' },
	'post-ig': { nombre: 'Post IG', emoji: '📱', descripcion: 'Una o varias fotos con un texto corto' },
	evento: { nombre: 'Evento', emoji: '📅', descripcion: 'Invitación a algo que va a pasar' },
	convocatoria: { nombre: 'Convocatoria', emoji: '🎯', descripcion: 'Búsqueda de postulantes o voluntarios' },
	galeria: { nombre: 'Galería', emoji: '🖼️', descripcion: 'Fotorreportaje de algo que ya pasó' },
	logros: { nombre: 'Logros', emoji: '🏆', descripcion: 'Resultados, premios y cifras' },
	entrevista: { nombre: 'Entrevista', emoji: '🎙️', descripcion: 'Preguntas y respuestas con una persona' },
	breve: { nombre: 'Breve', emoji: '⚡', descripcion: 'Noticia de uno o dos párrafos' },
};

export interface RequisitosInput {
	imagen: unknown | null;
	galeria: unknown[];
	fechaEvento: unknown | null;
	modalidad: string | null;
	lugar: unknown | null;
	boton: unknown | null;
	/** true si la página de Notion no tiene texto. */
	textoVacio: boolean;
}

/** Qué le falta a una novedad para estar completa según su formato (lista vacía = completa). */
export function faltantes(formato: Formato, d: RequisitosInput): string[] {
	const falta: string[] = [];
	const texto = () => d.textoVacio && falta.push('texto dentro de la página');
	const fotos = (d.imagen ? 1 : 0) + d.galeria.length;

	switch (formato) {
		case 'periodico':
			if (!d.imagen) falta.push('Imagen principal');
			texto();
			break;
		case 'anuncio':
		case 'breve':
		case 'logros':
			texto();
			break;
		case 'post-ig':
			if (fotos < 1) falta.push('al menos 1 foto (Imagen principal o Galería)');
			break;
		case 'galeria':
			if (d.galeria.length < 4) falta.push(`4 o más fotos en Galería (hay ${d.galeria.length})`);
			break;
		case 'evento':
			if (!d.fechaEvento) falta.push('Fecha del evento');
			if (!d.modalidad) falta.push('Modalidad');
			if (!d.lugar && !d.boton) falta.push('Lugar o Link del botón');
			texto();
			break;
		case 'convocatoria':
			if (!d.fechaEvento) falta.push('Fecha del evento (fecha límite)');
			if (!d.boton) falta.push('Link del botón (para postular)');
			texto();
			break;
		case 'entrevista':
			if (!d.imagen) falta.push('Imagen principal (foto de la persona)');
			texto();
			break;
	}
	return falta;
}
