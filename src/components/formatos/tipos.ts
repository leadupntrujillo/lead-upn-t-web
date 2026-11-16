import type { CollectionEntry } from 'astro:content';

export type Novedad = CollectionEntry<'novedades'>;
export type Pilar = CollectionEntry<'pilares'>;
export type Miembro = CollectionEntry<'miembros'>;

/** Lo que recibe cada plantilla de formato. */
export interface FormatoProps {
	entry: Novedad;
	pilar?: Pilar;
	autor?: Miembro;
	/** Cuerpo de la página de Notion ya convertido a HTML. */
	html: string;
	relacionadas: Novedad[];
	pilares: Map<string, Pilar>;
}
