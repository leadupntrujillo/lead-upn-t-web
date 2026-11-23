# LEAD UPN Trujillo — Web oficial

Responde siempre en español. Usa `pnpm` (nunca npm/yarn). Los `git push` los hace el usuario: solo commits locales. Nunca commitear `.env` ni pegar tokens en el chat.

## Qué es
Web de la organización estudiantil LEAD (UPN Trujillo). Astro 6 estático (SSG), contenido desde Notion, hosting en Cloudflare Pages. Sin framework CSS por ahora; el frontend se construye después del backend.

## Arquitectura (backend = lectura de Notion en tiempo de build)
```
Notion (Centro de Datos - LEAD)
  → loaders de Content Layer   src/lib/notion/
  → colecciones tipadas        src/content.config.ts
  → páginas Astro              src/pages/
```
- Cada tabla de Notion es una colección: `novedades`, `pilares`, `miembros`, `testimonios`, `aliados`, `cifras`, `sitio` (una sola fila; su cuerpo es el texto de "Nosotros").
- Las páginas usan `getCollection()` / `getEntry()` / `render()`; nunca llaman a la API de Notion.
- El cuerpo de cada novedad (bloques de la página de Notion) se convierte a HTML y queda en `entry.rendered.html`.
- Las imágenes de Notion caducan en 1 h: se descargan en build a `.cache/notion/` y se publican optimizadas en `public/_notion/` (WebP 480/960/1600, ignorado por git). Cada imagen es `{ src, alt, width, height, srcset }` (`src/lib/notion/images.ts`): usa siempre `srcset`, `sizes`, `width` y `height` en los `<img>`.
- Fallas **estructurales** (columna renombrada, tipo cambiado, token inválido) rompen el build a propósito. Fallas de **contenido** (falta título o resumen) omiten esa fila con un aviso en el log.

## Cómo pedir datos en las páginas
- Usa siempre `src/lib/queries.ts`: `getSitio()` (misión, visión, redes, Únete, con valores por defecto), `getNovedades()`, `getNovedad(slug)`, `getPortada()` (principal + destacadas + recientes), `getPilares()`, `getEquipo()`, `getTestimonios()`, `getAliados()`, `getCifras()`.
- Ordenar/filtrar/relacionar (puro, sin Astro): `src/lib/novedades.ts` (`delPilar`, `delFormato`, `conEtiqueta`, `relacionadas`, `proximos`, `contarEtiquetas`).
- Los 9 formatos están en `src/lib/notion/formatos.ts` (`FORMATOS_INFO` con nombre/emoji, y `faltantes()` con lo que exige cada uno). Una novedad incompleta se publica igual y avisa en el log del build.
- **Vista previa** (solo local): con `NOTION_PREVIEW=true` en `.env`, `pnpm dev` incluye Borrador y En revisión (`data.estado` ≠ `publicado`; mostrar un aviso "Vista previa" en la UI). Se ignora en `pnpm build` y en Cloudflare Pages.

## Notion: nombres exactos (no renombrar columnas)
Variables en `.env` (lista en el README): `NOTION_TOKEN` y un ID por tabla (`NOTION_NOVEDADES_ID`, `_PILARES_`, `_MIEMBROS_`, `_TESTIMONIOS_`, `_ALIADOS_`, `_CIFRAS_`, `_SITIO_`). Son IDs de *data source*. **Sin formulario de contacto** por ahora (pospuesto; `/contacto` solo muestra canales; sin Turnstile ni `api/`; respaldo en `C:\REPOS\leadupn\_respaldo-formulario-contacto\`). **No se usa Google Analytics** (decisión del equipo): no hay banner de cookies.

- **Novedades:** Título, Slug, Resumen, Estado, Formato, Pilar, Autor, Responsable, Imagen principal, Galería, Texto alternativo, Fecha de publicación, Fecha del evento, Modalidad, Lugar, Texto del botón, Link del botón, Etiquetas, Destacado, Tiempo de lectura, Descripción SEO, Créditos de foto, Slugs anteriores.
- **Pilares:** Nombre, Descripción, Imagen, Color, Orden, Activo, Correo del pilar.
- **Miembros:** Nombre, Cargo, Rol, Pilar, Bio, Foto, Instagram, LinkedIn, Web personal, Mostrar en la web, Orden, Autoriza uso de imagen. (El correo NO se publica; sin "Autoriza uso de imagen" la foto no se publica.)
- **Testimonios:** Nombre, Rol, Carrera, Ciclo, Frase destacada, Testimonio, Habilidades, Foto, Instagram, Pilar, Orden, Autoriza uso de imagen, Publicar en la web.
- **Aliados:** Nombre, Logo, Sitio web, Tipo, Pilar, Descripción, Mostrar en la web, Orden.
- **Cifras:** Nombre, Valor, Prefijo, Sufijo, Descripción, Mostrar en la web, Orden, Actualizado al.
- **Sitio:** Nombre, Misión, Visión, Descripción corta, Instagram, LinkedIn, TikTok, Facebook, WhatsApp, Correo público, Link de Únete, Texto de Únete.

### Reglas de publicación
- Novedad visible solo si `Estado = Publicado` y `Fecha de publicación` ≤ hoy (hora de Lima). Las programadas aparecen en el siguiente build.
- Testimonio visible solo con `Publicar en la web` **y** `Autoriza uso de imagen`.
- Formatos de novedad: periodico, anuncio, post-ig, evento, convocatoria, galeria, logros, entrevista, breve.
- `Destacado`: `portada` (solo 1; si hay varias, usar la más reciente) o `destacada`.

## Diseño (frontend)
Para UI usa la skill `frontend-design`; la línea gráfica está en la skill `contenido-lead-upn-trujillo`. Reglas de marca que ya están aplicadas:
- **Color:** marino `#161A4E` + degradado coral `#F0606A` → magenta `#D6297A` → morado `#8C3FD1` + blanco (tokens en `src/styles/global.css`). Máximo 3 colores principales. Los botones con texto blanco usan `--degradado-boton` (arranca en magenta) por contraste. El color de cada pilar es solo un punto pequeño (`PilarChip`).
- **Tipografía:** Anton en mayúsculas para títulos y Poppins para texto (paquetes `@fontsource`, sin Google Fonts). Solo dos familias.
- **Recursos de marca:** símbolo con máscara + degradado (`public/brand/lead-mark.svg`, componente `Logo`), caja de palabra clave (`.caja`), pills redondeadas, flechas `>>>` (`.flechas`), polaroid. Auki (`public/brand/auki-cohete.webp`) solo en el hero.
- **Un único momento memorable:** el hero con el lema apilado y Auki. Lo demás es sobrio; evitar animaciones por sección.
- **Cada formato tiene su esqueleto** en `src/components/formatos/` (Periodico, Anuncio, PostIG, Evento, Convocatoria, Galeria, Logros, Entrevista, Breve) y la tarjeta (`NovedadCard`) cambia según el formato. Todo debe verse bien **sin imagen** (`Cover` usa un fondo con el símbolo).
- **Convenciones de contenido que el diseño aprovecha** (están en la guía de Notion): Logros = lista con la cifra en negrita; Entrevista = primera cita como frase destacada y preguntas como Encabezado 3 (`src/lib/html.ts`).
- Fechas: usar `src/lib/format.ts` (las fechas sin hora se formatean en UTC; las que traen hora, en Lima).
- Comprobar con capturas: Chrome sin ventana (`chrome --headless=new --screenshot`) mide mínimo ~500 px de ancho; no usar 390.
- Datos de prueba en Notion: 8 novedades "[Prueba] …" en Borrador (una por formato). No salen en producción; con `NOTION_PREVIEW=true` se ven en `pnpm dev`.

## Conocimiento del usuario (vault CEREBRO)
El vault está en `C:\REPOS\CEREBRO`. Nota del proyecto: `10-Proyectos/LEAD_UPN/00-Resumen.md` (más `Bitácora.md` y `Decisiones.md`). Léela solo si el usuario lo pide; sus reglas dicen que ese proyecto está "sin revisar". Al cerrar una sesión de trabajo, ofrece actualizar la bitácora.

## SEO y seguridad
- Cada página pasa `titulo`, `descripcion` y, si aplica, `jsonLd`, `imagen`, `tipo` al `Layout` (componente `Seo.astro`; funciones puras en `src/lib/seo.ts`). Dominio: `https://leadupntrujillo.com` (`site` en `astro.config.mjs`), URLs sin `.html` ni barra final.
- CSP y demás encabezados en `public/_headers` (Cloudflare Pages; la redirección de `www` es una regla en el panel de Cloudflare): solo scripts propios. Por eso Astro no inlinea scripts (`assetsInlineLimit: 0`) y no se usa `define:vars` ni `is:inline` en scripts: pasa datos por atributos `data-*`.
- Los estilos con alcance de un componente no llegan a los elementos de otro componente: los `<img>` se escriben en el mismo componente que los estiliza.
- `pnpm add` falla en esta máquina (error `reading 'manifest'` de pnpm 10.22): agrega la dependencia a `package.json` a mano y corre `pnpm install`.

## Comandos
`pnpm dev` · `pnpm build` · `pnpm check` (tipos) · `pnpm test` (vitest) · `pnpm sync` (re-sincroniza Notion) · `pnpm iconos` (íconos desde el símbolo).
