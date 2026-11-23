import { DoubleSide, type IUniform, ShaderMaterial, type Texture, Vector2 } from 'three';

/**
 * Material único de Auki (brief §5). Un solo ShaderMaterial y una sola llamada de dibujo.
 * La fase la controla `uFase`:
 *   0 → 1  vacío → **Polígonos**: las líneas aparecen de arriba abajo (§5.1)
 *   1 → 2  Polígonos → **Capas**: una banda magenta baja y por donde pasa, Auki gana color (§5.2)
 * `uSentido` = 1 cuando el ciclo vuelve de Capas a Polígonos: la banda también baja de arriba abajo.
 * Linterna (§6): alrededor del mouse (suavizado) se ven los polígonos debajo de las Capas.
 * Capas (§5.3) suma cuatro capas: textura × 3 bandas de luz, facetas del normal map,
 * trama de puntos marino en la sombra y borde de luz con el degradado de marca.
 *
 * La salida no pasa por la conversión de color de Three: los colores de la paleta salen exactos.
 * La textura se usa tal como la entrega Three (en lineal), igual que en los fotogramas del diseño:
 * eso le da el naranja más profundo y hace que las bandas y las facetas se lean mejor.
 */
export interface TexturasAuki {
	map: Texture | null;
	normalMap: Texture | null;
	metalnessMap: Texture | null;
	/** El GLTFLoader invierte la Y (y = -1) cuando el GLB no trae tangentes, como este. */
	normalScale: Vector2;
}

export interface UniformsAuki {
	[nombre: string]: IUniform;
	uMap: IUniform<Texture | null>;
	uNormal: IUniform<Texture | null>;
	uMR: IUniform<Texture | null>;
	uNormalScale: IUniform<Vector2>;
	uMinY: IUniform<number>;
	uMaxY: IUniform<number>;
	/** Píxeles del dispositivo por píxel CSS: líneas y trama miden lo mismo en cualquier pantalla. */
	uPixelRatio: IUniform<number>;
	/** 0 → 1 Polígonos, 1 → 2 Capas. */
	uFase: IUniform<number>;
	/** Segundos, para el pulso de las aristas. */
	uTime: IUniform<number>;
	/** 0 = la banda revela Capas, 1 = la banda devuelve a Polígonos. */
	uSentido: IUniform<number>;
	/** Mouse suavizado en px del dispositivo, origen abajo a la izquierda del lienzo (como gl_FragCoord). */
	uMouse: IUniform<Vector2>;
	/** Intensidad de la linterna, 0–1 (entra y sale suave). */
	uLinterna: IUniform<number>;
}

const VERTEX = /* glsl */ `
attribute vec3 aBary;
varying vec3 vBary;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying float vY;
uniform float uMinY, uMaxY;

void main() {
	vBary = aBary;
	vUv = uv;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	vP = mv.xyz;
	vN = normalize(normalMatrix * normal);
	vY = (position.y - uMinY) / (uMaxY - uMinY);
	gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
varying vec3 vBary;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying float vY;
uniform sampler2D uMap, uNormal, uMR;
uniform vec2 uNormalScale;
uniform float uPixelRatio, uFase, uTime, uSentido, uLinterna;
uniform vec2 uMouse;

// Paleta del §4 (tokens de global.css), en sRGB
const vec3 NOCHE  = vec3(0.043, 0.055, 0.200);
const vec3 MARINO = vec3(0.086, 0.102, 0.306);
const vec3 CORAL  = vec3(0.941, 0.376, 0.416);
const vec3 MAG    = vec3(0.839, 0.161, 0.478);
const vec3 MOR    = vec3(0.549, 0.247, 0.820);
const vec3 MAGC   = vec3(0.910, 0.420, 0.690);
const vec3 MORC   = vec3(0.702, 0.580, 0.957);

// Degradado de marca por altura: coral abajo, magenta al medio, morado arriba
vec3 grad(float y) {
	y = clamp(y, 0.0, 1.0);
	return y < 0.5 ? mix(CORAL, MAG, y * 2.0) : mix(MAG, MOR, (y - 0.5) * 2.0);
}

// Aristas de grosor constante en pantalla (ancho en px): 1 sobre la línea, 0 en el interior
float aristas(vec3 b, float ancho) {
	vec3 d = fwidth(b);
	vec3 a = smoothstep(vec3(0.0), d * ancho, b);
	return 1.0 - min(min(a.x, a.y), a.z);
}

// Normal del normal map sin tangentes, por derivadas (perturbNormal2Arb de Three)
vec3 perturbar(vec3 n, vec3 p, vec2 uv, vec3 mapN) {
	vec3 q0 = dFdx(p), q1 = dFdy(p);
	vec2 st0 = dFdx(uv), st1 = dFdy(uv);
	vec3 q1p = cross(q1, n), q0p = cross(n, q0);
	vec3 T = q1p * st0.x + q0p * st1.x;
	vec3 B = q1p * st0.y + q0p * st1.y;
	float det = max(dot(T, T), dot(B, B));
	float s = det == 0.0 ? 0.0 : inversesqrt(det);
	return normalize(T * (mapN.x * s) + B * (mapN.y * s) + n * mapN.z);
}

// Trama de puntos: celda en px de pantalla; amt = cuánto del punto se llena
float trama(vec2 fc, float celda, float amt) {
	vec2 g = mod(fc, celda) - celda * 0.5;
	float r = celda * 0.5 * sqrt(amt);
	return 1.0 - smoothstep(r - 0.8, r + 0.8, length(g));
}

void main() {
	vec3 n = normalize(vN);
	if (!gl_FrontFacing) n = -n;
	vec3 v = normalize(-vP);
	vec3 L = normalize(vec3(0.6, 0.8, 0.7)); // luz principal: arriba, derecha, frente

	// ---------- Polígonos (§5.1) ----------
	float w = aristas(vBary, 1.2 * uPixelRatio);
	// Las caras que miran hacia atrás se atenúan: así la malla no es una maraña
	float frente = gl_FrontFacing ? clamp(dot(n, v) * 1.4, 0.15, 1.0) : 0.12;
	float pulso = 0.5 + 0.5 * sin(vY * 20.0 - uTime * 2.0);
	vec3 linea = mix(grad(vY), MORC, pulso * 0.25);
	vec4 poligonos = vec4(mix(NOCHE, linea, w), mix(0.15, 1.0, w) * frente);

	// ---------- Capas (§5.3) ----------
	vec3 mapN = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
	mapN.xy *= uNormalScale;
	vec3 pn = perturbar(n, vP, vUv, mapN);                    // 2. facetas
	float d = dot(pn, L);
	float b1 = smoothstep(-0.02, 0.02, d - 0.35);
	float b2 = smoothstep(-0.02, 0.02, d + 0.05);
	float luz = mix(0.5, mix(0.75, 1.0, b1), b2);            // 1. tres bandas
	vec3 col = texture2D(uMap, vUv).rgb * luz;
	float sombra = 1.0 - b2;
	col = mix(col, MARINO, trama(gl_FragCoord.xy, 7.0 * uPixelRatio, 0.55) * sombra * 0.85); // 3. trama
	float rim = pow(1.0 - max(dot(pn, v), 0.0), 3.0);
	col += grad(vY) * rim * 0.6;                              // 4. borde de luz
	float metal = texture2D(uMR, vUv).b;                      // lentes
	vec3 h = normalize(L + v);
	float brillo = pow(max(dot(pn, h), 0.0), 60.0);
	col += vec3(1.0) * brillo * step(0.5, metal) * b1 * 1.5;
	// En Capas solo se ven las caras de adelante (las de atrás son el interior de la cabeza)
	vec4 capas = vec4(col, gl_FrontFacing ? 1.0 : 0.0);

	// ---------- Linterna (§6): radio de ~120 px alrededor del mouse, borde suave de ~60 px ----------
	float radio = 120.0 * uPixelRatio;
	float linterna = uLinterna * (1.0 - smoothstep(radio, radio + 60.0 * uPixelRatio, length(gl_FragCoord.xy - uMouse)));
	capas = mix(capas, poligonos, linterna);

	// ---------- Fases y banda (§5.2): siempre de arriba abajo, frente de ~0,08 ----------
	vec4 color;
	if (uFase <= 1.0) {
		float f = clamp(uFase, 0.0, 1.0);
		float borde = 1.0 - f * 1.1;
		color = poligonos;
		color.a *= smoothstep(borde - 0.04, borde + 0.04, vY);
	} else {
		// p = avance de la banda (0 arriba del todo, 1 abajo del todo)
		float p = uSentido > 0.5 ? clamp(2.0 - uFase, 0.0, 1.0) : clamp(uFase - 1.0, 0.0, 1.0);
		float borde = 1.0 - p * 1.16 + 0.08;
		float arriba = smoothstep(borde - 0.04, borde + 0.04, vY); // 1 por encima del frente
		color = mix(poligonos, capas, uSentido > 0.5 ? 1.0 - arriba : arriba);
		// Resplandor magenta claro justo en el frente de la banda (solo mientras baja)
		float brilloBanda = exp(-abs(vY - borde) * 45.0) * step(0.001, p) * step(p, 0.999) * (gl_FrontFacing ? 1.0 : 0.25);
		color.rgb += MAGC * brilloBanda;
		color.a = max(color.a, brilloBanda);
	}
	if (color.a < 0.004) discard;
	gl_FragColor = color;
}`;

export function crearMaterial(t: TexturasAuki, minY: number, maxY: number, pixelRatio: number): ShaderMaterial & { uniforms: UniformsAuki } {
	const uniforms: UniformsAuki = {
		uMap: { value: t.map },
		uNormal: { value: t.normalMap },
		uMR: { value: t.metalnessMap },
		uNormalScale: { value: t.normalScale.clone() },
		uMinY: { value: minY },
		uMaxY: { value: maxY },
		uPixelRatio: { value: pixelRatio },
		uFase: { value: 2 },
		uTime: { value: 0 },
		uSentido: { value: 0 },
		uMouse: { value: new Vector2(-9999, -9999) },
		uLinterna: { value: 0 },
	};
	return new ShaderMaterial({
		vertexShader: VERTEX,
		fragmentShader: FRAGMENT,
		uniforms,
		side: DoubleSide,
		transparent: true,
	}) as ShaderMaterial & { uniforms: UniformsAuki };
}
