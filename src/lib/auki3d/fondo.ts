import { type IUniform, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

/**
 * Fondo de bloques pixelados (brief §8): un plano que cubre todo el lienzo, detrás de Auki.
 * Es la segunda y última llamada de dibujo.
 *  - Ruido cuantizado en celdas de 14 px; el tiempo avanza a 2 pasos por segundo y cada celda
 *    cambia cada ~2 s, desfasada de las demás (parpadeo suave, no un destello general).
 *  - Bloques en marino y morado. Pocos: más densos en los bordes del lienzo y, durante las
 *    transiciones, cerca del frente de la banda.
 * El fondo del hero (CSS) sigue debajo: si el 3D no carga, el texto se lee igual.
 */
export interface UniformsFondo {
	[nombre: string]: IUniform;
	uTime: IUniform<number>;
	uPixelRatio: IUniform<number>;
	/** Tamaño del lienzo en px del dispositivo. */
	uResolucion: IUniform<Vector2>;
	/** Altura en pantalla del frente de la banda (0 abajo, 1 arriba). */
	uBandaY: IUniform<number>;
	/** 0–1: cuánto se nota la banda (solo durante las transiciones). */
	uBandaFuerza: IUniform<number>;
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	// Directo a pantalla completa, en el fondo de todo
	gl_Position = vec4(position.xy, 0.999, 1.0);
}`;

const FRAGMENT = /* glsl */ `
varying vec2 vUv;
uniform float uTime, uPixelRatio, uBandaY, uBandaFuerza;
uniform vec2 uResolucion;

const vec3 MARINO = vec3(0.086, 0.102, 0.306);
const vec3 MOR    = vec3(0.549, 0.247, 0.820);

float azar(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void main() {
	float lado = 14.0 * uPixelRatio;
	vec2 celda = floor(gl_FragCoord.xy / lado);
	vec2 centro = (celda + 0.5) * lado / uResolucion; // centro de la celda, 0–1

	// Tiempo cuantizado a 2 pasos/s; cada celda cambia cada 4 pasos, con su propio desfase
	float paso = floor(uTime * 2.0);
	float desfase = floor(azar(celda + 7.1) * 4.0);
	float turno = floor((paso + desfase) / 4.0);
	float n = azar(celda + turno * vec2(17.0, 31.0));

	// Densidad: casi nada al centro (ahí está Auki), algo más hacia los bordes del lienzo.
	// En el borde mismo se apaga, para que no se dibuje el contorno cuadrado del lienzo.
	vec2 aBorde = min(centro, 1.0 - centro);
	float d = min(aBorde.x, aBorde.y);
	float borde = (1.0 - smoothstep(0.04, 0.26, d)) * smoothstep(0.0, 0.05, d);
	float banda = exp(-abs(centro.y - uBandaY) * 14.0) * uBandaFuerza;
	float probabilidad = 0.004 + 0.06 * borde + 0.08 * banda;
	if (n > probabilidad) discard;

	// Marino casi opaco o morado translúcido, como en el diseño
	bool morado = azar(celda + 3.7) > 0.55;
	gl_FragColor = morado ? vec4(MOR, 0.25) : vec4(MARINO, 0.9);
}`;

export function crearFondo(pixelRatio: number) {
	const uniforms: UniformsFondo = {
		uTime: { value: 0 },
		uPixelRatio: { value: pixelRatio },
		uResolucion: { value: new Vector2(1, 1) },
		uBandaY: { value: 0.5 },
		uBandaFuerza: { value: 0 },
	};
	const material = new ShaderMaterial({
		vertexShader: VERTEX,
		fragmentShader: FRAGMENT,
		uniforms,
		transparent: true,
		depthTest: false,
		depthWrite: false,
	});
	const malla = new Mesh(new PlaneGeometry(2, 2), material);
	malla.frustumCulled = false;
	malla.renderOrder = -1; // antes que Auki
	return {
		malla,
		uniforms,
		dispose() {
			malla.geometry.dispose();
			material.dispose();
		},
	};
}
