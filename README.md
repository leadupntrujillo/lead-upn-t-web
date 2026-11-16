![Lead UPN Trujillo](./public/portada-lead.png)

# LEAD UPN Trujillo — Web Oficial

**LEAD** = **L**earn, **E**xplore, **A**spire, **D**iscover. Organización estudiantil de liderazgo con propósito de la Universidad Privada del Norte (UPN), sede Trujillo, Perú.

> Proyecto en reconstrucción desde cero. Primero el backend (lectura de Notion), después el frontend.

## Stack

| Tecnología | Rol |
|---|---|
| Astro 6 | Framework (SSG) |
| Notion API | Fuente de contenido |
| Vercel | Hosting |
| pnpm | Gestor de paquetes |
| Node.js `>=22.12.0` | Runtime |

## Empezar

```bash
pnpm install
cp .env.example .env   # en Windows: copy .env.example .env
pnpm dev               # http://localhost:4321
```

Otros comandos: `pnpm build`, `pnpm preview`, `pnpm check` (tipos), `pnpm test` (pruebas), `pnpm sync` (vuelve a leer Notion).

## Variables de entorno

Ver [.env.example](./.env.example). El archivo `.env` real está en `.gitignore` y no se sube nunca.

**`pnpm dev` y `pnpm build` leen Notion**, así que necesitan `.env` completo (el token y los 6 IDs). Si falta algo, fallan con un mensaje que indica qué variable falta. En Vercel se cargan en *Settings → Environment Variables*.

## Cómo funciona el backend

```
Notion → loaders (src/lib/notion/) → colecciones (src/content.config.ts) → páginas
```

Cada tabla de Notion es una colección de Astro con datos tipados: `novedades`, `pilares`, `miembros`, `testimonios`, `aliados` y `cifras`. En las páginas se usan con `getCollection('novedades')`, `getEntry(...)` y `render(entry)`; nunca se llama a la API de Notion directamente.

- **Solo se publica lo marcado para la web:** novedades `Publicado` con fecha ≤ hoy; testimonios con `Publicar en la web` y `Autoriza uso de imagen`; aliados y cifras con `Mostrar en la web`; pilares `Activo`.
- **El cuerpo de la página de Notion** se convierte a HTML seguro (`entry.rendered.html`).
- **Las imágenes** se descargan en cada build a `public/_notion/` (las URLs de Notion caducan en 1 h).
- **Si cambia la estructura de Notion** (columna renombrada o de otro tipo) el build falla con un mensaje claro. **Si falta contenido** (novedad sin título o resumen) esa fila se omite con un aviso en el log.
- El contenido nuevo aparece en la web en el siguiente build (ver Paso 4: recompilación automática).

## Contenido (Notion)

Todo el contenido sale de la carpeta **Centro de Datos - LEAD** en Notion:

| Base de datos | Uso en la web |
|---|---|
| Novedades | Noticias, eventos, anuncios y convocatorias (solo las `Publicado`) |
| Pilares | Los pilares y áreas de LEAD |
| Miembros | Equipo y autores de novedades |
| Testimonios | Testimonios (solo los marcados `Publicar en la web`) |
| Aliados | Logos de aliados |
| Cifras | Números de impacto de la portada |

## Estructura

```
public/             Logos e imágenes de marca
src/content.config.ts   Colecciones (esquemas + loaders)
src/lib/notion/     Backend: cliente, loaders, mapeadores, conversor de bloques
src/layouts/        Layout base
src/pages/          Rutas
```

## Hoja de ruta

- [x] Paso 0 — Limpieza del repo
- [x] Paso 1 — Reorganizar Notion (Formato, Pilares, Miembros, guía y plantilla)
- [x] Paso 2 — Backend: integración con la API de Notion (pendiente: primera sincronización con el `.env` real)
- [ ] Paso 3 — Frontend: listado y páginas de novedades por formato
- [ ] Paso 4 — Despliegue en Vercel con recompilación automática
