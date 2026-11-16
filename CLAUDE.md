# LEAD UPN Trujillo — Web oficial

Responde siempre en español. Usa `pnpm` (nunca npm/yarn). Los `git push` los hace el usuario: solo commits locales. Nunca commitear `.env` ni pegar tokens en el chat.

## Qué es
Web de la organización estudiantil LEAD (UPN Trujillo). Astro 6 estático (SSG), contenido desde Notion, hosting en Vercel. Sin framework CSS por ahora; el frontend se construye después del backend.

## Arquitectura (backend = lectura de Notion en tiempo de build)
```
Notion (Centro de Datos - LEAD)
  → loaders de Content Layer   src/lib/notion/
  → colecciones tipadas        src/content.config.ts
  → páginas Astro              src/pages/
```
- Cada tabla de Notion es una colección: `novedades`, `pilares`, `miembros`, `testimonios`, `aliados`, `cifras`.
- Las páginas usan `getCollection()` / `getEntry()` / `render()`; nunca llaman a la API de Notion.
- El cuerpo de cada novedad (bloques de la página de Notion) se convierte a HTML y queda en `entry.rendered.html`.
- Las imágenes de Notion caducan en 1 h: se descargan en build a `public/_notion/` (ignorado por git) y los datos apuntan a `/_notion/...`.
- Fallas **estructurales** (columna renombrada, tipo cambiado, token inválido) rompen el build a propósito. Fallas de **contenido** (falta título o resumen) omiten esa fila con un aviso en el log.

## Cómo pedir datos en las páginas
- Usa siempre `src/lib/queries.ts`: `getNovedades()`, `getNovedad(slug)`, `getPortada()` (principal + destacadas + recientes), `getPilares()`, `getEquipo()`, `getTestimonios()`, `getAliados()`, `getCifras()`.
- Ordenar/filtrar/relacionar (puro, sin Astro): `src/lib/novedades.ts` (`delPilar`, `delFormato`, `conEtiqueta`, `relacionadas`, `proximos`, `contarEtiquetas`).
- Los 9 formatos están en `src/lib/notion/formatos.ts` (`FORMATOS_INFO` con nombre/emoji, y `faltantes()` con lo que exige cada uno). Una novedad incompleta se publica igual y avisa en el log del build.
- **Vista previa** (solo local): con `NOTION_PREVIEW=true` en `.env`, `pnpm dev` incluye Borrador y En revisión (`data.estado` ≠ `publicado`; mostrar un aviso "Vista previa" en la UI). Se ignora en `pnpm build` y en Vercel.

## Notion: nombres exactos (no renombrar columnas)
Variables en `.env` (ver `.env.example`): `NOTION_TOKEN` y un ID por tabla (`NOTION_NOVEDADES_ID`, `_PILARES_`, `_MIEMBROS_`, `_TESTIMONIOS_`, `_ALIADOS_`, `_CIFRAS_`). Son IDs de *data source*.

- **Novedades:** Título, Slug, Resumen, Estado, Formato, Pilar, Autor, Responsable, Imagen principal, Galería, Texto alternativo, Fecha de publicación, Fecha del evento, Modalidad, Lugar, Texto del botón, Link del botón, Etiquetas, Destacado, Tiempo de lectura, Descripción SEO.
- **Pilares:** Nombre, Descripción, Imagen, Color, Orden, Activo, Correo del pilar.
- **Miembros:** Nombre, Cargo, Rol, Pilar, Bio, Foto, Instagram, LinkedIn, Web personal, Mostrar en la web, Orden. (El correo NO se publica.)
- **Testimonios:** Nombre, Rol, Carrera, Ciclo, Frase destacada, Testimonio, Habilidades, Foto, Instagram, Pilar, Orden, Autoriza uso de imagen, Publicar en la web.
- **Aliados:** Nombre, Logo, Sitio web, Tipo, Pilar, Descripción, Mostrar en la web, Orden.
- **Cifras:** Nombre, Valor, Prefijo, Sufijo, Descripción, Mostrar en la web, Orden, Actualizado al.

### Reglas de publicación
- Novedad visible solo si `Estado = Publicado` y `Fecha de publicación` ≤ hoy (hora de Lima). Las programadas aparecen en el siguiente build.
- Testimonio visible solo con `Publicar en la web` **y** `Autoriza uso de imagen`.
- Formatos de novedad: periodico, anuncio, post-ig, evento, convocatoria, galeria, logros, entrevista, breve.
- `Destacado`: `portada` (solo 1; si hay varias, usar la más reciente) o `destacada`.

## Diseño
Para UI usa la skill `frontend-design`. La línea gráfica de la marca está en la skill `contenido-lead-upn-trujillo`. Assets de marca en `public/`.

## Conocimiento del usuario (vault CEREBRO)
El vault está en `C:\REPOS\CEREBRO`. Nota del proyecto: `10-Proyectos/LEAD_UPN/00-Resumen.md` (más `Bitácora.md` y `Decisiones.md`). Léela solo si el usuario lo pide; sus reglas dicen que ese proyecto está "sin revisar". Al cerrar una sesión de trabajo, ofrece actualizar la bitácora.

## Comandos
`pnpm dev` · `pnpm build` · `pnpm check` (tipos) · `pnpm test` (vitest) · `pnpm sync` (re-sincroniza Notion).
