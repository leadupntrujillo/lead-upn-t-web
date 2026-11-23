/**
 * Color de cada pilar (el campo "Color" de la tabla Pilares en Notion) → hex.
 * Se usa solo como identificador pequeño (un punto), nunca como color de página.
 */
const COLORES: Record<string, string> = {
	azul: '#3E7BFA',
	naranja: '#F7941D',
	verde: '#3E8E1F',
	morado: '#8C3FD1',
	rosado: '#E85BA6',
	rojo: '#E5484D',
	amarillo: '#F9C21A',
	marron: '#8B5E3C',
	gris: '#7A7F9A',
};

export const colorPilar = (color: string | null | undefined): string => COLORES[color ?? ''] ?? '#7A7F9A';
