import {
	DirectionalLight,
	HemisphereLight,
	type Material,
	Mesh,
	type MeshStandardMaterial,
	PerspectiveCamera,
	Scene,
	type Texture,
	Vector2,
	Vector3,
	WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { FIN_INTRO, clamp, estadoEn, frenteDeBanda, lerp, suavizar } from './easing';
import { crearFondo } from './fondo';
import { prepararGeometria } from './geometria';
import { crearMaterial } from './material';
import { texturasSinUrl } from './texturas';

/**
 * Escena de Auki en el hero (brief §5–§10). Dos llamadas de dibujo: fondo de bloques y Auki.
 *  - Línea de tiempo: intro, ciclo cada 14 s y linterna con el mouse (§6).
 *  - Movimiento: sigue al mouse con inercia, parallax, respiración, balanceo en táctil (§7).
 *  - Se pausa con la pestaña oculta o el lienzo fuera de pantalla; el reloj de la animación
 *    solo cuenta tiempo activo (§10).
 *  - Con `prefers-reduced-motion: reduce`: un solo cuadro estático en Capas (§9).
 */
export interface OpcionesAuki {
	glb: string;
	/**
	 * Solo desarrollo, para comparar: `estandar` = el MeshStandardMaterial del GLB (fase 1);
	 * `sin-normal` = el mismo sin normal map (las facetas deben desaparecer).
	 */
	modo?: 'capas' | 'estandar' | 'sin-normal';
	/** Solo desarrollo: congela la línea de tiempo en este segundo (para capturas). */
	tiempoFijo?: number;
	/** Solo desarrollo: posición fija de la linterna, en px CSS dentro del lienzo (para capturas). */
	linternaFija?: { x: number; y: number };
	/** Solo desarrollo: mouse fijo, normalizado de -1 a 1 (x a la derecha, y hacia arriba), sin inercia. */
	mouseFijo?: { x: number; y: number };
	/** Fuerza el modo de movimiento reducido (si no, se lee `prefers-reduced-motion`). */
	reducido?: boolean;
	/** Se llama si el navegador pierde el contexto WebGL: quien llama vuelve a mostrar el póster. */
	alFallar?: () => void;
}

export interface Auki {
	dispose(): void;
}

const FOV = 30;
/** Suavizado del mouse por cuadro a 60 FPS (§7). */
const INERCIA = 0.08;
/** El paso de tiempo máximo por cuadro: al volver de una pausa, la animación no salta. */
const DT_MAX = 1 / 20;
/** Topes del giro de la cabeza (§7, en radianes): con ellos la silueta siempre se lee. */
const GIRO = { y: 0.35, x: 0.22 };
/**
 * Parallax de cámara (§7: x = -mx·0,5, y = -my·0,3). El brief da esos valores para una cámara a
 * ~4 unidades; aquí la cámara está más cerca, así que se escalan con la distancia real para que el
 * ángulo sea el mismo (~7° y ~4°). Sin esto el giro de la cabeza y el de la cámara se suman de más.
 */
const PARALLAX = { x: 0.5 / 4, y: 0.3 / 4 };

export async function iniciarAuki(lienzo: HTMLCanvasElement, opciones: OpcionesAuki): Promise<Auki> {
	const movil = window.matchMedia('(hover: none)').matches;
	// Movimiento reducido: un cuadro estático en Capas, sin ciclo, seguimiento ni respiración
	const estatico = opciones.reducido ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const modo = opciones.modo ?? 'capas';
	const pixelRatio = Math.min(window.devicePixelRatio, movil ? 1.5 : 2);
	const renderer = new WebGLRenderer({ canvas: lienzo, alpha: true, antialias: true, powerPreference: 'high-performance' });
	renderer.setPixelRatio(pixelRatio);
	renderer.setClearColor(0x000000, 0);

	const escena = new Scene();
	const camara = new PerspectiveCamera(FOV, 1, 0.1, 20);

	// Luces solo para comparar con el material estándar; el shader de Capas trae su propia luz
	if (modo !== 'capas') {
		const sol = new DirectionalLight(0xffffff, 2.4);
		sol.position.set(0.6, 0.8, 0.7);
		escena.add(sol, new HemisphereLight(0xffffff, 0x161a4e, 1.1));
	}

	const loader = new GLTFLoader();
	loader.setMeshoptDecoder(MeshoptDecoder);
	loader.register(texturasSinUrl); // sin URLs blob: (CSP)
	const gltf = await loader.loadAsync(opciones.glb);

	let malla: Mesh | undefined;
	gltf.scene.traverse((o) => {
		if (!malla && o instanceof Mesh) malla = o;
	});
	if (!malla) throw new Error('El GLB de Auki no trae una malla.');

	const { geometria, radio, minY, maxY } = prepararGeometria(malla.geometry);
	// Las texturas vienen del material del GLB (ya con flipY = false y su espacio de color)
	const original = malla.material as MeshStandardMaterial;
	// Sin textura, Auki sería una silueta vacía: mejor que se quede el póster
	if (!original.map || !original.normalMap) throw new Error('El GLB de Auki llegó sin sus texturas.');
	let material: Material = original;
	const shader = modo === 'capas' ? crearMaterial(original, minY, maxY, pixelRatio) : null;
	if (shader) {
		material = shader;
	} else if (modo === 'sin-normal') {
		original.normalMap = null;
		original.needsUpdate = true;
	}
	const auki = new Mesh(geometria, material);
	escena.add(auki);
	const fondo = crearFondo(pixelRatio);
	if (modo === 'capas') escena.add(fondo.malla);
	const punto = new Vector3();
	let bandaFuerza = 0;

	// Encuadre: la esfera que envuelve la cabeza entra completa en la vista
	// En táctil, un poco más lejos: el balanceo automático gira más que el mouse y las orejas rozarían el borde
	const distancia = (radio / Math.sin((FOV * Math.PI) / 360)) * (movil ? 0.86 : 0.8);
	camara.position.set(0, 0, distancia);
	camara.lookAt(0, 0, 0);
	const ojo = new Vector3();

	/** Id del requestAnimationFrame en curso (0 = en pausa) y si ya se dibujó el primer cuadro. */
	let cuadro = 0;
	let dibujoInicial = false;

	const ajustar = () => {
		const { clientWidth: w, clientHeight: h } = lienzo;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camara.aspect = w / h;
		camara.updateProjectionMatrix();
		fondo.uniforms.uResolucion.value.set(w * pixelRatio, h * pixelRatio);
		// En pausa o en modo estático no hay bucle: se vuelve a dibujar el cuadro con el nuevo tamaño
		if (!cuadro && dibujoInicial) paso(0);
	};
	const observador = new ResizeObserver(ajustar);
	observador.observe(lienzo);
	ajustar();

	// ---------- Mouse (linterna) ----------
	// Posición en px CSS relativa al lienzo; se suaviza y se pasa al shader en px del dispositivo
	// con el origen abajo a la izquierda, igual que gl_FragCoord.
	const puntero = { x: -9999, y: -9999, dentro: false };
	const suave = { x: -9999, y: -9999 };
	const alMover = (e: PointerEvent) => {
		if (e.pointerType === 'touch') return;
		const r = lienzo.getBoundingClientRect();
		puntero.x = e.clientX - r.left;
		puntero.y = e.clientY - r.top;
		puntero.dentro = puntero.x >= 0 && puntero.y >= 0 && puntero.x <= r.width && puntero.y <= r.height;
		if (suave.x < -999) Object.assign(suave, { x: puntero.x, y: puntero.y }); // primera vez: sin barrido
		// Para el giro: posición respecto al centro de Auki, normalizada por media ventana (y hacia arriba)
		mira.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
		mira.y = clamp(-(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
	};
	/** Hacia dónde mira la cabeza: objetivo (mira) y valor con inercia (giro). */
	const mira = { x: 0, y: 0 };
	const giro = { x: 0, y: 0 };
	if (opciones.mouseFijo) {
		Object.assign(mira, opciones.mouseFijo);
		Object.assign(giro, opciones.mouseFijo);
	}
	// Si el puntero sale de la ventana, la linterna se apaga y Auki vuelve a mirar al frente
	const alSalir = () => {
		puntero.dentro = false;
		mira.x = 0;
		mira.y = 0;
	};
	if (opciones.linternaFija) {
		Object.assign(puntero, opciones.linternaFija, { dentro: true });
		Object.assign(suave, opciones.linternaFija);
	} else if (!movil && !estatico) {
		window.addEventListener('pointermove', alMover, { passive: true });
		document.documentElement.addEventListener('pointerleave', alSalir);
	}
	const mouse = new Vector2();
	let linterna = 0;

	// ---------- Bucle ----------
	// `reloj` es tiempo activo: solo avanza mientras se dibuja, así el ciclo no corre a escondidas.
	let reloj = opciones.tiempoFijo ?? (estatico ? FIN_INTRO : 0);
	let antes = 0;

	/** Avanza `dt` segundos y dibuja un cuadro. */
	function paso(dt: number) {
		if (opciones.tiempoFijo === undefined && !estatico) reloj += dt;

		// ---------- Movimiento (§7) ----------
		if (estatico) {
			giro.x = 0;
			giro.y = 0;
		} else if (movil && !opciones.mouseFijo) {
			// Táctil: sin seguimiento (ni giroscopio); balanceo lento automático
			// rotation.y = sin(t · 0,4) · 0,25 (giro a los lados, sin cabeceo)
			giro.x = Math.sin(reloj * 0.4) * (0.25 / GIRO.y);
			giro.y = 0;
		} else {
			giro.x = suavizar(giro.x, mira.x, INERCIA, dt);
			giro.y = suavizar(giro.y, mira.y, INERCIA, dt);
		}
		// La cabeza gira hacia el puntero…
		auki.rotation.y = giro.x * GIRO.y;
		auki.rotation.x = -giro.y * GIRO.x;
		// …y respira: sin esto se ve congelada
		const respira = estatico ? 0 : 1;
		auki.position.y = Math.sin(reloj * 1.2) * 0.012 * respira;
		auki.rotation.z = Math.sin(reloj * 0.8) * 0.018 * respira;
		// La cámara se mueve al revés (parallax), siempre a la misma distancia y mirando al centro.
		// Solo con mouse: en táctil el balanceo es únicamente de la cabeza (si no, las orejas se salen del cuadro).
		const parallax = movil && !opciones.mouseFijo ? 0 : 1;
		ojo.set(-giro.x * PARALLAX.x * distancia * parallax, -giro.y * PARALLAX.y * distancia * parallax, distancia).setLength(distancia);
		camara.position.copy(ojo);
		camara.lookAt(0, 0, 0);

		if (shader) {
			const u = shader.uniforms;
			const { fase, sentido } = estadoEn(reloj);
			u.uFase.value = fase;
			u.uSentido.value = sentido;
			u.uTime.value = reloj;
			// Translúcido en Polígonos (sin escribir profundidad); sólido cuando ya hay Capas
			shader.depthWrite = fase > 1;

			// Linterna: solo en Capas y con el puntero sobre Auki; entra y sale con suavidad
			suave.x = suavizar(suave.x, puntero.x, INERCIA, dt);
			suave.y = suavizar(suave.y, puntero.y, INERCIA, dt);
			const quiere = puntero.dentro && fase >= 1.999 ? 1 : 0;
			linterna = opciones.linternaFija ? quiere : suavizar(linterna, quiere, 0.1, dt);
			mouse.set(suave.x * pixelRatio, (lienzo.clientHeight - suave.y) * pixelRatio);
			u.uMouse.value.copy(mouse);
			u.uLinterna.value = linterna;

			// Fondo: mismo reloj; más bloques cerca del frente de la banda mientras se mueve
			const banda = frenteDeBanda({ fase, sentido });
			punto.set(0, lerp(minY, maxY, banda.altura), 0).applyMatrix4(auki.matrixWorld).project(camara);
			bandaFuerza = suavizar(bandaFuerza, banda.activa ? 1 : 0, 0.15, dt);
			fondo.uniforms.uTime.value = reloj;
			fondo.uniforms.uBandaY.value = (punto.y + 1) / 2;
			fondo.uniforms.uBandaFuerza.value = opciones.tiempoFijo === undefined ? bandaFuerza : Number(banda.activa);
		}
		renderer.render(escena, camara);
		// Solo desarrollo: llamadas de dibujo del último cuadro (el brief pide 2)
		if (import.meta.env.DEV) {
			lienzo.dataset.llamadas = String(renderer.info.render.calls);
			lienzo.dataset.cuadros = String(Number(lienzo.dataset.cuadros ?? 0) + 1);
		}
	}

	const dibujar = (ahora: number) => {
		cuadro = requestAnimationFrame(dibujar);
		const dt = Math.min((ahora - antes) / 1000, DT_MAX);
		antes = ahora;
		paso(dt);
	};

	// ---------- Pausa (§10): pestaña oculta o lienzo fuera de pantalla ----------
	let enPantalla = true;
	const arrancar = () => {
		if (cuadro || estatico || document.hidden || !enPantalla) return;
		antes = performance.now(); // al volver, la animación sigue donde quedó (sin salto)
		cuadro = requestAnimationFrame(dibujar);
	};
	const detener = () => {
		cancelAnimationFrame(cuadro);
		cuadro = 0;
	};
	const alCambiarVisibilidad = () => (document.hidden ? detener() : arrancar());
	document.addEventListener('visibilitychange', alCambiarVisibilidad);
	const vigia = new IntersectionObserver(([e]) => {
		enPantalla = Boolean(e?.isIntersecting);
		if (enPantalla) arrancar();
		else detener();
	});
	vigia.observe(lienzo);

	// Si el navegador recupera la memoria de la GPU, se vuelve al póster
	const alPerderContexto = (e: Event) => {
		e.preventDefault();
		detener();
		opciones.alFallar?.();
	};
	lienzo.addEventListener('webglcontextlost', alPerderContexto);

	// Primer cuadro antes de devolver: cuando el póster se funde, Auki ya está dibujado
	paso(0);
	dibujoInicial = true;
	arrancar();

	return {
		dispose() {
			detener();
			vigia.disconnect();
			document.removeEventListener('visibilitychange', alCambiarVisibilidad);
			lienzo.removeEventListener('webglcontextlost', alPerderContexto);
			window.removeEventListener('pointermove', alMover);
			document.documentElement.removeEventListener('pointerleave', alSalir);
			observador.disconnect();
			geometria.dispose();
			malla!.geometry.dispose();
			const texturas: Array<Texture | null> = [original.map, original.normalMap, original.metalnessMap, original.roughnessMap];
			for (const t of new Set(texturas)) {
				t?.dispose();
				(t?.image as ImageBitmap | undefined)?.close?.(); // libera la imagen decodificada
			}
			material.dispose();
			fondo.dispose();
			original.dispose();
			renderer.dispose();
			// Devuelve la memoria de la GPU sin esperar al recolector (si el navegador no la quitó ya)
			if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
		},
	};
}
