import { BufferAttribute, type BufferGeometry } from 'three';

/**
 * Prepara la geometría de Auki que trae el GLB:
 *  1. `toNonIndexed()` + atributo `aBary` (1,0,0)/(0,1,0)/(0,0,1) por triángulo: el wireframe del shader
 *     dibuja las aristas con estas coordenadas (sin esto salen diagonales rotas).
 *  2. El GLB viene con **Z arriba**: `rotateX(π/2)` deja +Y arriba y la cara mirando a +Z (la cámara).
 *  3. Centrado en el origen. Devuelve también la altura mínima y máxima (para el degradado por altura).
 */
export function prepararGeometria(original: BufferGeometry): { geometria: BufferGeometry; minY: number; maxY: number; radio: number } {
	const g = original.index ? original.toNonIndexed() : original.clone();
	const n = g.attributes.position!.count;
	const bary = new Float32Array(n * 3);
	for (let i = 0; i < n; i += 3) bary.set([1, 0, 0, 0, 1, 0, 0, 0, 1], i * 3);
	g.setAttribute('aBary', new BufferAttribute(bary, 3));

	g.rotateX(Math.PI / 2);
	g.computeBoundingBox();
	const caja = g.boundingBox!;
	const centro = caja.getCenter(caja.min.clone());
	g.translate(-centro.x, -centro.y, -centro.z);
	g.computeBoundingBox();
	g.computeBoundingSphere();

	return { geometria: g, minY: g.boundingBox!.min.y, maxY: g.boundingBox!.max.y, radio: g.boundingSphere!.radius };
}
