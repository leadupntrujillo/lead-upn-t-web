![LEAD UPN Trujillo](./docs/portada.webp)

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
pnpm dev               # http://localhost:4321 (necesita el archivo .env, ver abajo)
```

Otros comandos: `pnpm build`, `pnpm preview`, `pnpm check` (tipos), `pnpm test` (pruebas), `pnpm sync` (vuelve a leer Notion), `pnpm iconos` (regenera favicon e íconos desde `public/brand/lead-mark.svg`).

## Variables de entorno

Crea un archivo `.env` en la raíz con estas variables (está en `.gitignore`: nunca se sube):

```env
# Token de la integración de Notion (https://www.notion.so/profile/integrations).
# La integración debe estar conectada a la página "Centro de Datos - LEAD", de preferencia solo lectura.
NOTION_TOKEN=

# IDs de las bases de datos (data sources) de Notion
NOTION_NOVEDADES_ID=
NOTION_PILARES_ID=
NOTION_MIEMBROS_ID=
NOTION_TESTIMONIOS_ID=
NOTION_ALIADOS_ID=
NOTION_CIFRAS_ID=
NOTION_SITIO_ID=

# Cloudflare Turnstile (antispam del formulario de contacto, Sprint 3).
# La clave pública puede verse en el sitio; la secreta solo va en .env y en Vercel.
PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# OPCIONAL, solo en tu computadora: `pnpm dev` también muestra Borrador y En revisión.
# Se ignora en `pnpm build` y en Vercel.
# NOTION_PREVIEW=true
```

**`pnpm dev` y `pnpm build` leen Notion**, así que necesitan `.env` completo (el token y los 7 IDs). Si falta algo, fallan con un mensaje que indica qué variable falta. En Vercel se cargan en *Settings → Environment Variables*.

## Cómo funciona el backend

```
Notion → loaders (src/lib/notion/) → colecciones (src/content.config.ts) → páginas
```

Cada tabla de Notion es una colección de Astro con datos tipados: `novedades`, `pilares`, `miembros`, `testimonios`, `aliados` y `cifras`. En las páginas se usan con `getCollection('novedades')`, `getEntry(...)` y `render(entry)`; nunca se llama a la API de Notion directamente.

- **Solo se publica lo marcado para la web:** novedades `Publicado` con fecha ≤ hoy; testimonios con `Publicar en la web` y `Autoriza uso de imagen`; aliados y cifras con `Mostrar en la web`; pilares `Activo`.
- **El cuerpo de la página de Notion** se convierte a HTML seguro (`entry.rendered.html`).
- **Las imágenes** se descargan en cada build (las URLs de Notion caducan en 1 h) a `.cache/notion/` y se publican en `public/_notion/` como WebP en 3 anchos (480/960/1600) con su ancho y alto. Una foto de 340 KB queda en unos 30–95 KB según la pantalla.
- **Tabla "Sitio"**: una sola fila con misión, visión, descripción corta (para Google), redes, correo y el link/texto de "Únete". El cuerpo de esa página es el texto de "Nosotros". Se lee con `getSitio()`.
- **SEO**: cada página tiene título, descripción, URL canónica, Open Graph, tarjeta de X y datos estructurados (Organización, Noticia o Evento, rutas de navegación). Cada novedad tiene su imagen para compartir (`/og/novedades/<slug>.png`), generada al compilar. También se generan `sitemap-index.xml`, `robots.txt` y `rss.xml`.
- **Slugs anteriores**: si cambias el Slug de una novedad, pega el anterior en "Slugs anteriores" y el enlace viejo redirige al nuevo.
- **Avisos de accesibilidad**: el build avisa si una novedad no tiene "Texto alternativo" o si una imagen del texto no tiene pie de foto.
- **Si cambia la estructura de Notion** (columna renombrada o de otro tipo) el build falla con un mensaje claro. **Si falta contenido** (novedad sin título o resumen) esa fila se omite con un aviso en el log.
- El contenido nuevo aparece en la web en el siguiente build (ver Paso 4: recompilación automática).
- **Los 9 formatos** (Periódico, Anuncio, Post IG, Evento, Convocatoria, Galería, Logros, Entrevista, Breve) están definidos en `src/lib/notion/formatos.ts`. Si a una novedad le falta algo que su formato necesita (p. ej. una Convocatoria sin link para postular), se publica igual y el build avisa.
- **Vista previa:** con `NOTION_PREVIEW=true` en tu `.env`, `pnpm dev` muestra también Borrador y En revisión para revisarlas antes de publicar. Se ignora en `pnpm build` y en Vercel.
- **Para las páginas:** pide los datos con `src/lib/queries.ts` (`getNovedades`, `getPortada`, `getPilares`…).

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
| Sitio | Misión, visión, redes, correo y "Únete" (una sola fila) |

## Estructura

```
public/             Logos e imágenes de marca
src/content.config.ts   Colecciones (esquemas + loaders)
src/lib/notion/     Backend: cliente, loaders, mapeadores, conversor de bloques
src/layouts/        Layout base (cabecera, pie, fuentes)
src/components/     Logo, tarjetas, portada de imagen y una plantilla por formato (formatos/)
src/styles/         Tokens de marca (global.css) y estilos del texto de Notion (prose.css)
src/pages/          Inicio, /nosotros, /contacto, /novedades (con filtros), /novedades/[slug], 404,
                    imágenes para compartir (og/), robots.txt y rss.xml
src/lib/seo.ts      URLs canónicas y datos estructurados (schema.org)
src/lib/og/         Generador de las imágenes para compartir (satori)
scripts/iconos.mjs  Favicon, íconos de la app y Auki para móvil
vercel.json         Encabezados de seguridad (CSP), caché y redirección de www
```

## Hoja de ruta

- [x] Paso 0 — Limpieza del repo
- [x] Paso 1 — Reorganizar Notion (Formato, Pilares, Miembros, guía y plantilla)
- [x] Paso 2 — Backend: integración con la API de Notion (pendiente: primera sincronización con el `.env` real)
- [x] Paso 3 — Frontend: portada, listado con filtros y una página por cada uno de los 9 formatos (pendiente: afinar con contenido e imágenes reales)
- [ ] Paso 4 — Despliegue en Vercel con recompilación automática
