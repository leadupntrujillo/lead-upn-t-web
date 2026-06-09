![Lead UPN Trujillo](./public/portada-lead.png) 
#  LEAD UPN Trujillo — Web Oficial 🚀

> **Documento de contexto para agentes de vibe coding.**
> Lee TODO esto antes de escribir una sola línea de código. Aquí está todo lo que necesitas saber para trabajar en este proyecto sin preguntar nada.

---

## 🏛️ ¿Qué es LEAD UPN Trujillo?

**LEAD** significa **L**earn, **E**xplore, **A**spire, **D**iscover.

Es la **organización estudiantil de liderazgo con propósito** de la Universidad Privada del Norte (UPN), sede Trujillo, Perú. Promueve espacios de aprendizaje, acción y reflexión que integran competencias profesionales, tecnológicas y personales para **generar impacto** dentro y fuera de la universidad.

### Pilares de especialización

| Pilar | Descripción |
|---|---|
| **Desarrollo Profesional** | Coordinar y ejecutar actividades y eventos formativos. Logística y seguimiento. |
| **Impacto Comunitario** | Identificar problemáticas sociales. Acciones de educación y servicio. |
| **Desarrollo De Capítulo** | Integración de nuevos miembros. Cultura de colaboración interna. |
| **Área De Marketing** | Estrategia de contenidos, redes sociales, diseño y producción. |

---

## ⚙️ Stack Técnico

| Tecnología | Versión | Rol |
|---|---|---|
| **Astro** | `^6.0.4` | Framework principal (SSG/SSR) |
| **Vanilla CSS** | — | Todo el estilo, sin frameworks CSS externos |
| **TypeScript** | via tsconfig | Tipado básico |
| **pnpm** | — | Gestor de paquetes |
| **Node.js** | `>=22.12.0` | Runtime |

**Comandos esenciales:**

```bash
pnpm dev        # Servidor de desarrollo en localhost:4321
pnpm build      # Build de producción
pnpm preview    # Preview del build
```

> ⚠️ **NO uses Tailwind**. Todo el CSS es vanilla, escopeado dentro de cada componente `.astro` con `<style>`. Las variables globales están en `src/layouts/Layout.astro` dentro del bloque `<style is:global>`.

---

## 🎨 Design System — "Glassmorphism Tech"

Este es el sistema de diseño establecido y **NO debe cambiarse**. Todo componente nuevo debe adherirse a él.

### Paleta de colores

```css
:root {
  --bg-deep:    #0A0F2C;   /* Fondo oscuro principal */
  --bg-core:    #161B3D;   /* Fondo base (gradiente) */
  --text-title: #FFFFFF;   /* Títulos */
  --text-body:  #BCC1D4;   /* Cuerpo de texto */
  --magenta:    #E62A6B;   /* Acento primario (rosa/magenta) */
  --cyan:       #2AF6FF;   /* Acento secundario (cian) */
  --gold:       #FFD700;   /* Acento terciario (dorado) */
}
```

### Tipografía

- **Headings:** `Space Grotesk` (400, 500, 600, 700) — Google Fonts
- **Body:** `DM Sans` (400, 500, 700) — Google Fonts
- Variables CSS: `--font-heading`, `--font-body`

### Sistema de espaciado (base 8px)

```css
--space-1: 8px;
--space-2: 16px;
--space-3: 24px;
--space-4: 32px;
--space-5: 48px;
--space-6: 64px;
--space-8: 96px;
```

### Efecto Glassmorphism — `.crystal-fx`

Clase utilitaria global disponible en cualquier componente:

```css
.crystal-fx {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 16px;
}
```

### Background global

El `body` tiene un `radial-gradient` fijo de `--bg-core` a `--bg-deep` con `background-attachment: fixed`. No toques esto.

### Partículas de fondo

`Layout.astro` genera 50 partículas flotantes con JS puro que quedan en `position: fixed; z-index: -1`. Son decorativas, no las elimines.

---

## 📁 Arquitectura de archivos

```
lead-upn-t-web/
├── public/                     # Assets estáticos
│   ├── lead-tr-upn.svg         # Logo vectorial oficial
│   ├── lead-tr-upn.ico         # Favicon
│   ├── lead_upn_tru.png        # Logo en PNG
│   ├── portada-lead.png        # Imagen portada general
│   ├── instagram.svg           # Icono Instagram
│   ├── linkedin.svg            # Icono LinkedIn
│   └── *.gif                   # Animaciones decorativas
│
├── src/
│   ├── layouts/
│   │   └── Layout.astro        # Shell HTML: <head>, CSS global, partículas
│   ├── pages/
│   │   └── index.astro         # Homepage — ensambla todos los componentes
│   └── components/
│       ├── Header.astro        # Navbar sticky con logo, text loop animado y menú mobile
│       ├── Metrics.astro       # Cards de métricas (Instagram, WhatsApp, LinkedIn)
│       ├── CtaButtons.astro    # Fila de botones CTA secundarios
│       └── Events.astro        # Grid de tarjetas de próximos eventos
│
├── .agent/
│   └── skills/
│       └── ui-ux-pro-max/      # Skill de diseño UI/UX — LEER SIEMPRE al trabajar UI
│           ├── SKILL.md        # Instrucciones del skill (leer antes de crear UI)
│           ├── data/           # Bases de datos de estilos, paletas, tipografías
│           └── scripts/
│               └── search.py  # Script de búsqueda del design system
│
├── design-system/              # (se crea al usar --persist en el skill)
│   ├── MASTER.md               # Fuente de verdad del design system persisted
│   └── pages/                  # Overrides por página
│
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── ui-result.md                # Salida del design system generado por el skill
```

---

## 🧩 Inventario de Componentes Existentes

### `Layout.astro`
- Wrapper HTML base: `<html lang="es">`, meta SEO, Google Fonts
- Define **todas las variables CSS globales** en `<style is:global>`
- Crea el sistema de partículas flotantes en JS
- Todo componente/página lo usa como envoltorio

### `Header.astro`
- Navbar sticky con `backdrop-filter: blur(10px)`
- **Logo:** "LEAD" con la "L" en `--magenta` con glow neón
- **Text loop animado:** cicla entre LEARN / EXPLORE / ASPIRE / DISCOVER en `--cyan`, con animaciones `translateY` (3s por palabra)
- **Botón ÚNETE:** gradiente magenta→cyan, hover con inversión del gradiente, accesible (min-height: 44px)
- **Menú hamburguesa:** off-canvas panel derecho glassmorphism, links: Home, About, Events, Contact (todos con `href="#"` por ahora — aún sin rutas reales)
- Responsive: el text loop se oculta en mobile (`@media max-width: 768px`)

### `Metrics.astro`
- Sección con 3 tarjetas glassmorphism usando `.crystal-fx`
- **Instagram Community:** `+5.2k` en `--magenta`
- **WhatsApp Members:** `+1.1k` en `--cyan`
- **LinkedIn Followers:** `+800` en `--gold`
- Cada tarjeta tiene un `.glow-layer` que aparece on-hover
- Animación de entrada con `IntersectionObserver` (fade-up desde `translateY(30px)`)

> 🔴 **DATOS HARDCODEADOS.** En el futuro estos vendrán de Google Sheets vía script. Ver sección "Integraciones futuras".

### `CtaButtons.astro`
- 3 botones CTA secundarios en fila: **OUR PILLARS**, **OUR PROGRESS**, **APPLY NOW**
- Bordes glassmorphism, hover con gradiente magenta→cyan reveal (`::before`)
- El botón APPLY NOW tiene borde cian sutil para destacarlo

> 🔴 **SIN FUNCIONALIDAD.** Los botones no tienen `onClick` ni `href` funcionales aún. Se completarán cuando haya páginas de destino.

### `Events.astro`
- Sección "UPCOMING EVENTS" con 2 tarjetas glassmorphism en grid
- **LEAD GALA** (Nov 15, 2026) — badge magenta
- **CONVOCATORIA 2026** (Dic 01, 2026) — badge cyan
- Animación de entrada con `IntersectionObserver` (scroll reveal)
- Hover: `translateY(-8px)` + `box-shadow`
- Imágenes reemplazadas por gradientes decorativos (placeholder)

> 🔴 **DATOS HARDCODEADOS.** En el futuro vendrán de Notion API. Ver sección "Integraciones futuras".

---

## 🔮 Integraciones Futuras (Planificadas)

Estas integraciones **NO están implementadas todavía** pero el código debe estar preparado para recibirlas. NO incorpores datos de forma hardcoded en lugares que luego serán dinámicos sin dejar un comentario `// TODO: integrar con [fuente]`.

### 1. Notion API — Base de datos de Eventos

- **Propósito:** Los eventos (LEAD GALA, Convocatorias, Talleres, etc.) se gestionarán en una base de datos de Notion.
- **Flujo esperado:**
  - Script de fetching en build-time (Astro SSG) o en endpoint API de Astro
  - Se llamará a la Notion API con el integration token
  - Los datos se mapearán a props/interfaces TypeScript
  - El componente `Events.astro` se volverá dinámico

- **Interfaz de datos esperada:**
  ```typescript
  interface Event {
    id: string;
    title: string;
    date: string;           // ISO 8601
    description: string;
    badge_color: 'magenta' | 'cyan' | 'gold';
    image_url?: string;
    cta_label: string;
    cta_url: string;
    is_published: boolean;
  }
  ```

- **Dónde integrarlo:** `src/lib/notion.ts` (crear cuando sea necesario)
- **Astro approach:** usar `getStaticPaths()` o endpoints en `src/pages/api/`

### 2. Google Sheets Script — Métricas de Comunidad

- **Propósito:** Los números de seguidores/miembros (Instagram, WhatsApp, LinkedIn) se actualizarán desde un Google Sheet.
- **Flujo esperado:**
  - Un Google Apps Script exportará los datos como JSON endpoint público (o con auth)
  - El componente `Metrics.astro` consumirá esos datos en build-time
  - Los números se actualizarán con cada nuevo build

- **Interfaz de datos esperada:**
  ```typescript
  interface Metric {
    platform: 'instagram' | 'whatsapp' | 'linkedin';
    label: string;    // "INSTAGRAM COMMUNITY"
    value: string;    // "+5.2k"
    color: 'magenta' | 'cyan' | 'gold';
  }
  ```

- **Dónde integrarlo:** `src/lib/sheets.ts` (crear cuando sea necesario)

> 💡 **Para el agente:** cuando llegue el momento de implementar estas integraciones, crear la carpeta `src/lib/` con los archivos correspondientes y refactorizar los componentes afectados para recibir datos como props.

---

## 📐 Reglas de Código — OBLIGATORIAS

Estas reglas aplican siempre. No hay excepciones.

### CSS
- ✅ **Vanilla CSS únicamente.** Sin Tailwind, sin frameworks.
- ✅ **Variables CSS** del design system para colores, espaciado y tipografía.
- ✅ **Scoped styles** dentro de `<style>` en cada componente `.astro`.
- ✅ **Breakpoints obligatorios:** 375px, 768px, 1024px, 1440px.
- ✅ **Animaciones:** usar `transition` de 150–300ms. Respetar `prefers-reduced-motion`.
- ❌ No colores hardcoded directamente (usar variables). Excepción: valores dentro de `rgba()` que ya referencian una variable semánticamente.

### Accesibilidad (a11y)
- ✅ Todos los elementos interactivos: `cursor: pointer` y tamaño mínimo de 44x44px.
- ✅ Focus states visibles: `outline: 2px solid var(--cyan)`.
- ✅ `aria-label` en íconos SVG y botones sin texto visible.
- ✅ Imágenes reales: siempre con `alt` descriptivo.
- ✅ Usar `IntersectionObserver` para animaciones de entrada (no `setTimeout` globales).
- ❌ No emojis como iconos de UI. Usar SVG (Heroicons, Lucide, Simple Icons).

### Astro
- ✅ Frontmatter (---) en todo componente que lo necesite.
- ✅ Scripts JS dentro de `<script>` en el componente correspondiente.
- ✅ Props tipados con `interface Props` cuando un componente recibe datos.
- ✅ Layout siempre wrapeado en `<Layout title="...">`.

### Semántica HTML
- ✅ Un solo `<h1>` por página.
- ✅ Secciones con `<section aria-label="...">` o `aria-labelledby`.
- ✅ Tarjetas de contenido con `<article>` cuando el contenido es autocontenido.
- ✅ `tabindex="0"` en tarjetas que sean interactivas (clickeables).

---

## 🖥️ Skill UI/UX Pro Max — Cómo usarlo

El proyecto incluye el skill `.agent/skills/ui-ux-pro-max/`. **Úsalo SIEMPRE antes de crear o modificar componentes de UI.**

### Flujo obligatorio al crear nuevo UI

```bash
# Paso 1: Generar design system para el nuevo componente/página
python .agent/skills/ui-ux-pro-max/scripts/search.py "education tech landing glassmorphism dark" --design-system -p "LEAD UPN"

# Paso 2 (opcional): Búsquedas de dominio específico
python .agent/skills/ui-ux-pro-max/scripts/search.py "animation accessibility scroll-reveal" --domain ux

# Paso 3: Implementar siguiendo el design system resultante
```

**El design system ya persisted (ui-result.md) establece:**
- Pattern: Horizontal Scroll Journey / Bento Grid Showcase
- Style: Vibrant & Block-based (glassmorphism dark)
- Fonts: Space Grotesk + DM Sans ✅ (ya implementado)
- Effects: Large sections 48px+, bold hover, scroll-snap, 200-300ms transitions

---

## 🗺️ Roadmap de la Homepage (index.astro)

El orden de secciones en la homepage es:

```
[Header] — sticky
  ├── [Hero Section] — h1 principal + descripción
  ├── [Metrics] — métricas de comunidad (3 cards)
  ├── [CtaButtons] — botones secundarios de acción
  └── [Events] — próximos eventos (2 cards)
[Footer] — copyright
```

**Secciones pendientes por crear** (NO implementadas aún):

| Sección | Componente sugerido | Datos | Prioridad |
|---|---|---|---|
| About / Quiénes somos | `About.astro` | Estático | Alta |
| Pilares de especialización | `Pillars.astro` | Estático | Alta |
| Team / Miembros | `Team.astro` | Notion (futuro) | Media |
| Testimonios | `Testimonials.astro` | Estático o Notion | Media |
| Convocatoria CTA | expandir `CtaButtons.astro` | Estático | Alta |
| Formulario "Únete" | `JoinForm.astro` | Form externo o API | Baja |

---

## 📸 Assets Disponibles en `/public`

| Archivo | Uso |
|---|---|
| `lead-tr-upn.svg` | Logo principal vectorial |
| `lead-tr-upn.ico` | Favicon (ya configurado en Layout) |
| `lead_upn_tru.png` | Logo alternativo PNG |
| `portada-lead.png` | Imagen portada general (para og:image) |
| `instagram.svg` / `linkedin.svg` | Íconos de redes sociales |
| `rocket.gif` | Animación decorativa |
| `earth.gif` / `org_emoji_animated.gif` | Animaciones decorativas |
| `dart_in_the_bullseye.gif` | Animación decorativa |
| `handshake.gif` | Animación decorativa |
| `pillars.gif` | Animación decorativa |

> ⚠️ No hay favicon `.svg` en `/public/favicon.svg`. El Layout hace referencia a él, pero el ícono real es `lead-tr-upn.ico`. Revisar y actualizar si es necesario.

---

## 🌐 SEO

El `Layout.astro` ya tiene:
- `<meta charset="UTF-8">`
- `<meta name="viewport" ...>`
- `<meta name="description" content="LEAD UPN Trujillo - Learn, Explore, Aspire, Discover.">`
- `<title>` dinámico vía prop

**Pendiente por implementar:**
- `og:title`, `og:description`, `og:image` (para compartir en redes)
- `og:url`, `og:type`
- `twitter:card`
- Schema.org / JSON-LD para la organización

---

## 🔗 Links de Redes Sociales (reales)

Estos links son los definitivos para cualquier componente de social media:

| Red | URL |
|---|---|
| Instagram | `https://www.instagram.com/lead.upn.trujillo/` |
| LinkedIn | `https://www.linkedin.com/company/lead-upn-trujillo/` |
| WhatsApp | *(pendiente — usar el link oficial cuando se proporcione)* |

---

## ❓ Preguntas Frecuentes para el Agente

**¿Agrego páginas nuevas?**
> Sí, en `src/pages/`. Cada página usa `<Layout title="...">`. Las rutas de Astro son file-based: `src/pages/about.astro` → `/about`.

**¿Puedo usar integraciones de Astro (plugins)?**
> Sí si es necesario (ej: `@astrojs/image`, sitemap, etc.). Siempre instalar con `pnpm add` y registrar en `astro.config.mjs`.

**¿Qué hago con los datos hardcodeados?**
> Déjalos así por ahora. Cuando se integre Notion o Sheets, se refactorizarán los componentes para recibir datos como props. Siempre deja un comentario `// TODO: integrar con Notion` o `// TODO: integrar con Sheets` cuando el dato sea dinámico en el futuro.

---

*Última actualización: Marzo 2026 — LEAD UPN Trujillo Web Team*