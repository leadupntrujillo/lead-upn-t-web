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

Otros comandos: `pnpm build`, `pnpm preview`.

## Variables de entorno

Ver [.env.example](./.env.example). El archivo `.env` real está en `.gitignore` y no se sube nunca.

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
public/          Logos e imágenes de marca
src/layouts/     Layout base
src/pages/       Rutas
```

## Hoja de ruta

- [x] Paso 0 — Limpieza del repo
- [x] Paso 1 — Reorganizar Notion (Formato, Pilares, Miembros, guía y plantilla)
- [ ] Paso 2 — Backend: integración con la API de Notion
- [ ] Paso 3 — Frontend: listado y páginas de novedades por formato
- [ ] Paso 4 — Despliegue en Vercel con recompilación automática
