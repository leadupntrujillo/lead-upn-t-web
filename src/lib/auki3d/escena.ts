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
import { clamp, estadoEn, suavizar } from './easing';
import { prepararGeometria } from './geometria';
import { crearMaterial } from './material';

/**
 * Escena de Auki en el hero.
 * FASE 5 (brief §12): + la cabeza sigue al mouse con inercia, parallax de cámara, respiración
 * y balanceo automático en táctil (§7).
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
	const gltf = await loader.loadAsync(opciones.glb);

	let malla: Mesh | undefined;
	gltf.scene.traverse((o) => {
		if (!malla && o instanceof Mesh) malla = o;
	});
	if (!malla) throw new Error('El GLB de Auki no trae una malla.');

	const { geometria, radio, minY, maxY } = prepararGeometria(malla.geometry);
	// Las texturas vienen del material del GLB (ya con flipY = false y su espacio de color)
	const original = malla.material as MeshStandardMaterial;
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

	// Encuadre: la esfera que envuelve la cabeza entra completa en la vista
	const distancia = (radio / Math.sin((FOV * Math.PI) / 360)) * 0.8;
	camara.position.set(0, 0, distancia);
	camara.lookAt(0, 0, 0);
	const ojo = new Vector3();

	const ajustar = () => {
		const { clientWidth: w, clientHeight: h } = lienzo;
		if (!w || !h) return;
		renderer.setSize(w, h, false);
		camara.aspect = w / h;
		camara.updateProjectionMatrix();
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
	} else if (!movil) {
		window.addEventListener('pointermove', alMover, { passive: true });
		document.documentElement.addEventListener('pointerleave', alSalir);
	}
	const mouse = new Vector2();
	let linterna = 0;

	// ---------- Bucle ----------
	// `reloj` es tiempo activo: solo avanza mientras se dibuja (la pausa llega en la fase 7).
	let reloj = opciones.tiempoFijo ?? 0;
	let antes = performance.now();
	let cuadro = 0;

	const dibujar = (ahora: number) => {
		cuadro = requestAnimationFrame(dibujar);
		const dt = Math.min((ahora - antes) / 1000, DT_MAX);
		antes = ahora;
		if (opciones.tiempoFijo === undefined) reloj += dt;

		// ---------- Movimiento (§7) ----------
		if (movil && !opciones.mouseFijo) {
			// Táctil: sin seguimiento (ni giroscopio); balanceo lento automático
			giro.x = 0;
			giro.y = Math.sin(reloj * 0.4) * (0.25 / GIRO.y);
		} else {
			giro.x = suavizar(giro.x, mira.x, INERCIA, dt);
			giro.y = suavizar(giro.y, mira.y, INERCIA, dt);
		}
		// La cabeza gira hacia el puntero…
		auki.rotation.y = giro.x * GIRO.y;
		auki.rotation.x = -giro.y * GIRO.x;
		// …y respira: sin esto se ve congelada
		auki.position.y = Math.sin(reloj * 1.2) * 0.012;
		auki.rotation.z = Math.sin(reloj * 0.8) * 0.018;
		// La cámara se mueve al revés (parallax), siempre a la misma distancia y mirando al centro
		ojo.set(-giro.x * PARALLAX.x * distancia, -giro.y * PARALLAX.y * distancia, distancia).setLength(distancia);
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
		}
		renderer.render(escena, camara);
	};
	cuadro = requestAnimationFrame(dibujar);

	return {
		dispose() {
			cancelAnimationFrame(cuadro);
			window.removeEventListener('pointermove', alMover);
			document.documentElement.removeEventListener('pointerleave', alSalir);
			observador.disconnect();
			geometria.dispose();
			malla!.geometry.dispose();
			const texturas: Array<Texture | null> = [original.map, original.normalMap, original.metalnessMap, original.roughnessMap];
			for (const t of new Set(texturas)) t?.dispose();
			material.dispose();
			original.dispose();
			renderer.dispose();
		},
	};
}
