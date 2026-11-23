# Cómo funciona la web: Notion → build → Cloudflare Pages → visitante

La web es **estática**: no hay servidor consultando Notion cuando alguien entra. Todo se lee de Notion **una vez, al compilar** (build), y se publica como archivos HTML, imágenes y PNG ya listos. Por eso es rápida, barata y no expone el token de Notion.

```mermaid
flowchart TD
    subgraph N["① Notion · Centro de Datos - LEAD (lo editan los coordinadores)"]
        NOV["Novedades<br/>Estado, Formato, Pilar, Autor,<br/>Imagen principal, Galería, Slugs anteriores…"]
        PIL["Pilares"]
        MIE["Miembros<br/>(Autoriza uso de imagen)"]
        TES["Testimonios"]
        ALI["Aliados"]
        CIF["Cifras"]
        SIT["Sitio (1 fila)<br/>Misión, Visión, redes, Únete<br/>+ cuerpo = texto de Nosotros"]
    end

    subgraph T["② Qué dispara un build"]
        T1["git push a GitHub"]
        T2["Tarea diaria 6:00 Lima<br/>(GitHub Actions → Deploy Hook) · Sprint 2"]
        T3["Botón / aviso al pasar a Publicado<br/>(opcional) · Sprint 2"]
    end

    subgraph B["③ Build en Cloudflare Pages: pnpm build = astro build"]
        L["Loaders · src/lib/notion/collections.ts<br/>consulta con filtros: solo Publicado y fecha ≤ hoy (Lima),<br/>testimonios con permiso, pilares activos…"]
        API["API de Notion<br/>NOTION_TOKEN (solo lectura)"]
        M["Mapeadores · mappers.ts + props.ts<br/>valida columnas (si cambian → el build falla)<br/>falta contenido → se omite la fila con aviso"]
        BL["Bloques → HTML seguro · blocks.ts<br/>(cuerpo de cada página de Notion)"]
        IMG["Imágenes · images.ts<br/>descarga (URLs caducan en 1 h) → .cache/notion/<br/>sharp → WebP 480/960/1600 + ancho/alto"]
        Z["Esquemas zod · schemas.ts<br/>+ relaciones (pilar, autor)"]
        S["Content store de Astro<br/>colecciones tipadas"]
        Q["queries.ts<br/>getSitio, getNovedades, getPortada,<br/>getPilares, getEquipo…"]
        P["Páginas · src/pages/<br/>/, /nosotros, /contacto, /novedades,<br/>/novedades/[slug], 404"]
        SEO["Seo.astro + seo.ts<br/>canónica, Open Graph, JSON-LD<br/>(Organización, Noticia/Evento, migas)"]
        OG["og/ · satori + resvg<br/>PNG 1200×630 por novedad"]
        EXT["sitemap-index.xml · robots.txt · rss.xml<br/>redirecciones de slugs anteriores"]
        D["dist/ (HTML + CSS + JS + WebP + PNG)"]
    end

    subgraph V["④ Cloudflare Pages (CDN)"]
        VJ["public/_headers<br/>CSP, HSTS, X-Frame-Options, caché<br/>+ regla en el panel: www → leadupntrujillo.com"]
    end

    subgraph U["⑤ Visitante"]
        BR["Navegador / Google / WhatsApp / LinkedIn"]
    end

    N --> T
    T1 & T2 & T3 --> L
    L <--> API
    API --> M
    M --> BL & IMG
    BL --> Z
    IMG --> Z
    Z --> S --> Q --> P
    P --> SEO
    P --> OG
    P --> EXT
    SEO & OG & EXT --> D
    D --> VJ --> BR
```

## Las capas en una frase

| Capa | Dónde | Qué hace |
|---|---|---|
| Contenido | Notion | El equipo escribe y marca qué se publica. Es la única fuente de verdad. |
| Backend (en build) | `src/lib/notion/` | Lee Notion, valida, aplica las reglas de publicación, convierte el texto a HTML y optimiza las fotos. |
| Datos | `src/content.config.ts`, `src/lib/queries.ts` | Colecciones tipadas; las páginas nunca llaman a Notion. |
| Frontend | `src/pages/`, `src/components/` | Arma el HTML con la línea gráfica de LEAD y el SEO de cada página. |
| Hosting | Cloudflare Pages | Sirve los archivos desde la CDN con los encabezados de seguridad. No hay funciones de servidor (el formulario de contacto se pospuso). |

## Qué pasa cuando alguien publica una novedad

1. En Notion la pasa a **Publicado** y pone la **Fecha de publicación**.
2. En el siguiente build (push, tarea diaria o botón), el loader la trae; si la fecha es futura, espera al build de ese día.
3. Si le falta algo que su formato necesita, se publica igual y el log del build lo avisa.
4. Sus fotos se descargan, se convierten a WebP y se genera su imagen para compartir.
5. Cloudflare Pages publica la versión nueva en uno o dos minutos. Si el build falla, sigue en línea la versión anterior.
