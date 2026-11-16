import { existsSync } from 'node:fs';

let dotenvLoaded = false;

/** Carga `.env` (si existe) en process.env sin pisar variables ya definidas (p. ej. las de Vercel). */
function loadDotEnv(): void {
	if (dotenvLoaded) return;
	dotenvLoaded = true;
	if (!existsSync('.env')) return;
	try {
		process.loadEnvFile('.env');
	} catch {
		// Un .env mal formado se reporta abajo como "variable faltante".
	}
}

export function requireEnv(name: string): string {
	loadDotEnv();
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(
			`Falta la variable de entorno ${name}. Copia .env.example a .env y complétala (en Vercel: Settings → Environment Variables).`,
		);
	}
	return value;
}
