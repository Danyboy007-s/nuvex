# Nuvex

Herramientas de conversión que funcionan **100% en el navegador**: los archivos nunca salen del dispositivo del usuario. Sin cuentas, sin servidores y sin colas.

> Estado: beta en desarrollo activo. Ver [Registro de cambios](#registro-de-cambios).

---

## Herramientas

| Herramienta | Archivo | Cómo funciona |
|---|---|---|
| PDF Converter | `pages/tools/pdf-converter.jsx` + `lib/pdf.js` | Usa `pdf-lib` para convertir imágenes, TXT y PDFs en un solo PDF, combinar, extraer páginas y optimizar. |
| Compresor de imágenes | `pages/tools/file-utils.jsx` + `lib/image.js` | Vuelve a codificar con el codificador del navegador (canvas): calidad real, tamaño máximo opcional y formato (mismo, WEBP o JPG). Sin librerías externas. |
| Limpiar metadatos | `pages/tools/remove-metadata.jsx` + `lib/metadata.js` | En JPG y PNG quita los bloques de metadatos del archivo sin recomprimir. Muestra el EXIF con `exifr` (cargado bajo demanda). |
| Eliminar fondo | `pages/tools/remove-bg.jsx` + `lib/image.js` | Vuelve transparente un color por tolerancia: solo el fondo conectado a los bordes, o todo ese color. **Todavía no usa IA.** |
| PNG/JPG a DXF | `pages/tools/png-to-dxf.jsx` + `lib/dxf.js` | Traza el borde de la forma en contornos cerrados (con agujeros), quita los escalones de píxel y exporta polilíneas DXF R12, a escala en mm. |
| Humanizar texto | `pages/tools/text-humanizer.jsx` | Reglas y reemplazos aleatorios (sin IA por ahora). |
| Generador QR | `pages/tools/qr-generator.jsx` | Usa `qr-code-styling`, con estilos, gradientes, marcos y logo. |

### Detalles del Generador QR

Estas decisiones existen para que el QR **siempre se pueda escanear**:

- **Zona de silencio** (`QUIET_ZONE_RATIO`): margen del color de fondo alrededor del código. Sin él, muchas cámaras no lo leen.
- **Corrección de errores**: nivel `H` cuando hay logo (aguanta ~30% del código tapado) y `M` cuando no lo hay.
- **Contraste**: todos los presets usan puntos oscuros sobre fondo claro. Si el usuario elige colores con poco contraste o un QR invertido, aparece un aviso.
- **Descarga en alta resolución** (`EXPORT_SIZE` = 1024 px): se usa `getRawData()`, que espera a que cargue el logo antes de exportar.

### Detalles de las herramientas de imagen

- **Compresor** (`lib/image.js`):
  - La calidad (30–95%) es la del codificador JPG/WEBP.
  - Por defecto se conserva el tamaño original; se puede limitar el lado mayor a 2560, 1920 o 1280 px.
  - PNG no tiene calidad ajustable: para bajar su peso conviene pasarlo a WEBP.
  - Si comprimir de nuevo da un archivo más pesado, se conserva el original.
  - Las fotos de celular giradas se enderezan.
  - Funciona sin conexión.
- **Limpiar metadatos** (`lib/metadata.js`):
  - JPG: se quitan EXIF (cámara, GPS, fecha), XMP, IPTC y comentarios.
  - PNG: se quitan los bloques de texto, EXIF y fecha.
  - La imagen queda idéntica píxel a píxel y en su formato original.
  - En JPG se conserva **solo** la orientación, para que las fotos no salgan giradas.
  - Otros formatos (WEBP) se vuelven a guardar con calidad 92%.
- **Eliminar fondo** (`lib/image.js`):
  - El color de fondo se adivina con el color más común del borde.
  - El modo "Solo el fondo" usa un relleno por inundación desde los bordes, así el mismo color dentro del objeto se conserva.
  - Los píxeles del contorno quedan semitransparentes para evitar un halo.

### Detalles de PNG/JPG a DXF

La lógica está en `lib/dxf.js`, con tests en `__tests__/lib/dxf.test.js`.

1. **Forma o fondo**:
   - Si la imagen tiene fondo transparente, la forma es lo visible.
   - Si no, la forma es lo oscuro, con umbral automático Otsu.
   - Se puede elegir "Lo claro" para un logo blanco sobre fondo negro.
2. **Contornos**: se sigue el borde entre forma y fondo por las aristas de los píxeles.
   - Cada contorno sale **cerrado**.
   - Los agujeros (el interior de una "O") salen como contornos aparte.
3. **Suavizado**:
   - `smoothStaircase` pasa la línea por el medio de los escalones de píxel.
   - Douglas-Peucker deja solo los puntos necesarios, conservando las esquinas reales.
4. **DXF R12** con `POLYLINE` cerradas:
   - Se puede abrir en AutoCAD, LibreCAD, Inkscape y programas de láser o CNC.
   - El ancho se elige en mm.

Resultado con un logo de prueba: 123 vértices y 5 KB, contra 3.094 vértices y 120 KB de la versión anterior. Validado con `ezdxf`: todas las polilíneas cerradas y sin errores.

### Detalles del PDF Converter

La lógica está en `lib/pdf.js` (con tests en `__tests__/lib/pdf.test.js`); la página solo maneja la interfaz.

- **Imágenes**: PNG y JPG se incrustan tal cual. WEBP, GIF, BMP y AVIF se pasan a PNG con un canvas. El formato se detecta por los bytes del archivo, no por la extensión. Cada imagen va en una página A4 (vertical u horizontal), centrada y sin agrandarse.
- **Fotos de celular**: si el JPG trae rotación EXIF, se endereza antes de incrustarlo.
- **TXT**: se ajusta al ancho y se reparte en tantas páginas como haga falta. La fuente Helvetica solo cubre el alfabeto latino, así que los emojis y otros caracteres se cambian por `?`.
- **Extraer**: acepta `1,3,5-7` y rangos al revés (`7-5`); avisa si una página no existe.
- **Optimizar**:
  - Reconstruye el PDF: descarta objetos sobrantes y metadatos, y comprime la estructura.
  - **Recomprime las fotos** con `recompressImages`, en tres calidades: Impresión 300 ppp, Pantalla 150 ppp y Mínimo 100 ppp.
    - Usa `pdf-lib` y el codificador del navegador, sin `pdf.js`.
    - Recomprime los JPG en RGB o grises, y las imágenes sin pérdida que parecen foto.
    - No toca el texto, los logos, las máscaras de transparencia, CMYK ni los escaneos de 1 bit.
    - Una imagen solo se reemplaza si queda más liviana.
  - **Resultado de la prueba:** un PDF de fotos de 7,2 MB bajó a 315 KB con calidad "Pantalla".
  - Muestra el tamaño antes y después, y avisa si no se pudo reducir.
- **Errores**: los PDF con contraseña o dañados muestran un mensaje claro dentro de la página.

---

## Diseño

El sistema de diseño está en `styles/globals.css` (comentado al principio).

- **Colores sólidos, sin degradados.**
  - Fondo papel cálido (`--bg`) y tinta oscura (`--text-primary`).
  - Modo oscuro con las mismas variables.
- **Azul (`--accent`) = herramientas; violeta (`--ai`) = Nuvex IA**, y solo la IA. Así lo de IA siempre destaca.
  - El lima `#d4ff3a` es el color de acento para resaltar.
- **Cada herramienta tiene su color** en `components/toolVisuals.jsx`: ícono blanco sobre cuadro de color.
- **Animaciones suaves**, todas desactivadas con "reducir movimiento":
  - `.lift`: la tarjeta se eleva con sombra al pasar el mouse.
  - `.rise-in`: entrada de la portada, sin esperar a JavaScript.
  - `.reveal` con `Reveal.jsx`: aparición al hacer scroll.
  - `.orb-*`: el orbe de la IA "respira".
  - `.message-in` y `.typing-dot`: mensajes del chat.

### Nuvex IA

- **Dónde aparece:** es lo primero de la portada y del menú de `/tools`, y tiene su propia URL, `/tools/assistant`.
- **Qué hace hoy:** es una versión **local**. `lib/assistant.js` reconoce pedidos por palabras clave y sugiere la herramienta indicada.
  - No envía nada a internet.
  - La interfaz lo dice ("Beta").
- **Para conectar una IA real:** reemplaza `answer()` por una llamada a una ruta `/api` del servidor que devuelva el mismo formato, `{ text, toolIds }`. La interfaz no cambia.
- **Lo marcado "Próximamente"** en la portada (`AiRoadmap.jsx`) todavía no existe.

## Tecnología

- **Next.js 16** (Pages Router) y **React 19**.
  - `dev` y `build` usan `--webpack`, porque el plugin de PWA necesita webpack (Next 16 usa Turbopack por defecto).
- **Tailwind CSS 4**: la configuración está en `styles/globals.css` (`@theme`). Ya no existe `tailwind.config.js`.
  - Los colores del tema son variables CSS (`--bg`, `--surface`, `--accent`...), con modo oscuro mediante la clase `.dark`.
  - Clases como `bg-(--surface)` son la forma corta de Tailwind 4 para `bg-[var(--surface)]`.
  - Ojo: en Tailwind 4, un estilo propio fuera de `@layer` le gana a todas las clases utilitarias.
- **@ducanh2912/next-pwa** (reemplazo mantenido de `next-pwa`): la app se puede instalar y funciona sin conexión.
- **Exportación estática** (`output: 'export'` en `next.config.js`): el build genera HTML/JS plano en `out/`, sin servidor.
- **Jest 30 + Testing Library** para los tests.
- **ESLint 9** con las reglas de Next.js (`eslint.config.mjs`), incluidas las de React Hooks. Para leer `localStorage` sin efectos se usa `lib/useLocalStorage.js` (`useSyncExternalStore`).

## Estructura

```
nuvex/
├── components/          # Piezas de interfaz reutilizables
│   ├── Layout.jsx         # Envoltorio común: <head>/SEO, encabezado y botón de tema
│   ├── HeroSection.jsx    # Portada: titular + Nuvex IA
│   ├── AssistantChat.jsx  # Interfaz de Nuvex IA (portada y /tools)
│   ├── AiOrb.jsx          # Símbolo animado de la IA
│   ├── FeaturedTools.jsx  # Cuadrícula de herramientas del inicio
│   ├── AiRoadmap.jsx      # Bloque violeta: qué hace la IA hoy y qué viene
│   ├── WhyNuvex.jsx       # Tres bloques "por qué Nuvex"
│   ├── Reveal.jsx         # Aparición suave al hacer scroll
│   ├── toolVisuals.jsx    # Ícono y color de cada herramienta
│   ├── Footer.jsx
│   ├── ToolSidebar.jsx    # Menú lateral de /tools (lista de herramientas)
│   └── ToolRenderer.jsx   # Carga dinámicamente la herramienta elegida
├── pages/
│   ├── index.jsx          # Página de inicio (/)
│   ├── tools.jsx          # Panel de herramientas (/tools)
│   ├── 404.jsx
│   ├── _app.jsx / _document.jsx
│   └── tools/             # Una herramienta por archivo (ver tabla)
├── lib/                 # Lógica sin interfaz, fácil de probar
│   ├── tools.js           # Registro único de herramientas (menú, carga y textos SEO)
│   ├── assistant.js       # Respuestas de Nuvex IA (hoy local, por palabras clave)
│   ├── useLocalStorage.js # Hook para leer/guardar preferencias (tema, menú...)
│   ├── site.js            # Dominio, título y descripción del sitio (SEO)
│   ├── pdf.js             # Lógica del PDF Converter
│   ├── image.js           # Compresor y Eliminar fondo
│   ├── dxf.js             # Vectorización PNG/JPG → DXF
│   └── metadata.js        # Limpiar metadatos sin recomprimir
├── public/              # Archivos estáticos: manifest, robots, sitemap e íconos
├── scripts/
│   ├── generate-icons.py  # Regenera los íconos PNG/ICO y la imagen para redes
│   └── generate-sitemap.mjs # Crea sitemap.xml y robots.txt (corre antes de cada build)
├── styles/globals.css   # Diseño: variables de tema, configuración de Tailwind 4 y animaciones
├── eslint.config.mjs    # Reglas de ESLint
├── vercel.json          # Ajustes de Vercel (archivo de verificación de Google)
└── __tests__/           # Tests (components/ y lib/)
```

### Cómo se conecta una herramienta

1. Cada herramienta vive en `pages/tools/<id>.jsx` y acepta la prop `standalone`:
   - `standalone = true`: devuelve solo su contenido (se usa dentro de `/tools`).
   - `standalone = false`: se envuelve en `Layout` (se usa si alguien visita `/tools/<id>` directo).
2. `lib/tools.js` es el **registro**: `TOOL_CATEGORIES` (nombre, descripción y categoría del menú) y `TOOL_LOADERS` (cómo cargar su código).
3. `components/ToolSidebar.jsx` arma el menú con el registro y **precarga** el código de una herramienta al pasar el mouse sobre ella.
4. `components/ToolRenderer.jsx` la carga con `dynamic(..., { ssr: false })`, porque estas librerías necesitan `window`. Cada herramienta es un archivo JS aparte: quien solo usa el QR nunca descarga `pdf-lib`.

**Para agregar una herramienta nueva:** crea `pages/tools/<id>.jsx` y agrégala en `lib/tools.js` (en `TOOL_CATEGORIES` y en `TOOL_LOADERS`). Un test (`__tests__/lib/tools.test.js`) avisa si falta en uno de los dos.

**Enlaces directos:** `/tools?tool=<id>` abre esa herramienta (lo usan las tarjetas del inicio). Al elegir una en el menú, la URL se actualiza para poder compartirla.

---

### Rendimiento de carga

- **Fuente Inter con `next/font`** (`pages/_app.jsx`): se descarga al compilar y se sirve desde el propio sitio, sin bloquear el primer pintado ni pedir nada a Google.
- **Tema oscuro sin destello**: un script mínimo en `pages/_document.jsx` aplica la clase `dark` antes de pintar.
- **Portada con animación CSS** (`.hero-in` en `globals.css`): el título aparece desde el primer pintado, sin esperar a JavaScript. Respeta "reducir movimiento" del sistema.
- **Carga bajo demanda**: cada herramienta, y `exifr` dentro del PDF Converter, solo se descargan cuando se usan.

## Desarrollo

Requisitos: Node.js 20.9 o superior (probado con 22).

```bash
npm install       # instalar dependencias
npm run dev       # servidor local en http://localhost:3000
npm run build     # build de producción; el sitio estático queda en out/
npm test          # correr los tests
npm run lint      # revisar el código con ESLint
```

> El service worker (`public/sw.js`, `public/workbox-*.js`) lo genera el plugin de PWA en cada build y está en `.gitignore`. No se edita a mano.

### Logo e íconos
El logo es una N blanca sobre el azul de acento (`#007aff`). El original es
`public/favicon.svg`; los PNG e ICO se generan con:

```bash
python3 scripts/generate-icons.py   # requiere Pillow (pip install pillow)
```

Si cambias el logo, actualiza el SVG **y** el polígono del script.

## Despliegue

El sitio está en **Vercel**: **https://nuvex-beta.vercel.app**

- **Despliegue automático:** cada `git push` a `main` publica una versión nueva. Vercel detecta Next.js solo, sin configuración extra.
- **Ramas de prueba:** las demás ramas generan una vista previa con su propia URL. Así se puede revisar un cambio antes de unirlo a `main`.
- **Compilación:** usa `npm run build`, que antes genera el sitemap (`prebuild`) y deja el sitio estático en `out/`.
- **Historial:** hasta octubre de 2026 el sitio estuvo en Cloudflare Pages (`nuvex-5d7.pages.dev`).

### Dominio y SEO

- **Dominio actual:** `https://nuvex-beta.vercel.app`, definido en `lib/site.js`.
  - Para cambiarlo sin tocar código, define la variable de entorno `NEXT_PUBLIC_SITE_URL` en Vercel (Settings → Environment Variables) (por ejemplo `https://midominio.com`).
  - Afecta el canonical, la imagen para redes, el sitemap y `robots.txt`.
- **Cada página tiene su propio título, descripción, canonical y vista previa para redes** (`components/Layout.jsx`).
  - Los textos de cada herramienta están en `lib/tools.js` (`seoTitle`, `seoDescription`).
  - Las páginas `/tools/<id>` son las que Google debe mostrar: cada una es una herramienta completa y lleva datos estructurados (JSON-LD).
- **`public/sitemap.xml` y `public/robots.txt` se generan solos** en cada `npm run build` (`prebuild`). No los edites a mano.
- **Google Search Console:** el sitio se verifica con dos métodos. No borres ninguno de los dos.
  - La etiqueta `google-site-verification` de `pages/_document.jsx`.
  - El archivo `public/google4b1e7e258e65d09d.html`. Vercel sirve los `.html` sin la extensión, así que `vercel.json` hace que también responda con el nombre exacto que pide Google.
  - El sitemap que se envía es `sitemap.xml`.

---

## Pendientes

- [x] Actualizar Next.js (14.0.3 → 15.5.28).
- [x] PDF Converter: WEBP y otros formatos, TXT largos, errores claros.
- [x] PDF Converter: recomprimir imágenes al optimizar (requiere pdf.js para renderizar páginas).
- [x] Revisar los avisos de `npm audit`. Quedan 25, todos originados en dos paquetes internos de herramientas de compilación y tests: `braces` (vía workbox, ESLint y Jest) y `sprintf-js` (vía Jest).
  - **No existe versión corregida** de ninguno; se revisará cuando la publiquen.
  - No llegan al sitio publicado.
  - `serialize-javascript` se fuerza a 7.1.2 con `overrides` en `package.json`.
- [x] Limpiar metadatos: conservar el formato original (hoy todo sale como PNG y pesa más).
- [x] `/tools`: sincronizar el estado colapsado del menú con el margen del contenido (ahora el estado vive solo en `ToolSidebar`).
- [x] Las tarjetas del inicio abren directamente su herramienta (`/tools?tool=<id>`).
- [x] `/tools`: en escritorio el contenido queda corrido 256 px a la derecha (el menú ocupa su espacio **y** el contenido tiene `md:ml-64`).
- [x] Definir las variables CSS que se usan pero no existen: `--surface-hover` (30 usos, los fondos al pasar el mouse no se ven) y `--text-muted`. Quitar la clase inexistente `rain-atmosphere` de `Layout.jsx`.
- [x] Compresor: el control "Calidad" en realidad fija el tamaño máximo en MB, y por defecto reduce las fotos a 1024 px de ancho.
- [x] Compresor: `browser-image-compression` descarga su worker desde cdn.jsdelivr.net; sin conexión (PWA) no funciona en segundo plano.
- [x] Eliminar fondo: borra el color elegido en **toda** la imagen, no solo el fondo conectado al borde.
- [x] SEO: el `canonical` apunta a la portada en todas las páginas; el sitemap solo lista 2 URLs; falta imagen para `og:image`.
- [x] Animaciones de las tarjetas del inicio (`FeaturedTools`): siguen ocultas hasta que carga JavaScript.
- [x] Agregar los íconos que faltan en `public/` (`icon-192.png`, `icon-512.png`, `favicon.ico`/`favicon.svg`).
- [x] PNG/JPG a DXF: los contornos salen pixelados (escalones) y pesados; falta simplificarlos.
- [x] Actualizaciones mayores: Next 16, React 19, Tailwind 4, Jest 30 y Testing Library 16. Siguen en versiones anteriores, a propósito:
  - `react-dropzone` (14): la 20 no aporta nada que se use y exige Node 22.
  - ESLint (9): la 10 es muy reciente para los plugins de Next.
- [x] Agregar configuración de ESLint (`npm run lint`, sin errores ni avisos).
- [x] Confirmar el dominio que usan `sitemap.xml`, `robots.txt` y el canonical (`nuvex.app`).
- [x] Migrar a Vercel (https://nuvex-beta.vercel.app).
- [ ] Dar de baja el proyecto de Cloudflare Pages (después de comprobar Vercel).
- [ ] Integrar IA con una ruta `/api` en el servidor (la clave de la API nunca debe ir en el navegador). La interfaz ya existe: solo hay que cambiar `answer()` en `lib/assistant.js`.
- [ ] Eliminar fondo con IA real (por ejemplo `@imgly/background-removal`, que corre en el navegador).

## Registro de cambios

### 2026-10-18 (mantenimiento)
- **Actualizaciones**: Next 15 → 16, React 18 → 19, Tailwind 3 → 4 (con su herramienta oficial de migración), Jest 29 → 30 y Testing Library 14 → 16.
  - Se comprobó con capturas que el sitio se ve igual.
- **ESLint** configurado; todo el código pasa sin errores ni avisos.
- **Lo que destapó ESLint**:
  - Eliminar fondo: la vista previa podía no actualizarse al mover la tolerancia, porque el `<img>` reutilizado no volvía a disparar `load`.
  - Eliminar fondo: el color elegido con clic se medía contra el recuadro y no contra la imagen.
  - Tema, menú lateral y última herramienta ahora se leen con `useLocalStorage` (`useSyncExternalStore`), sin `setState` dentro de efectos.
  - La herramienta abierta en `/tools` se calcula desde la URL en vez de copiarse al estado.
  - Generador QR: la vista previa depende de su configuración completa.
- **`npm audit`**: de 46 avisos a 25, ninguno con solución publicada (ver Pendientes).
- `next.config.js`: se quitaron opciones que no aplican a un sitio estático.

### 2026-10-17 (Vercel)
- **El sitio se mudó a Vercel:** https://nuvex-beta.vercel.app. El dominio en `lib/site.js` (canonical, sitemap, imagen para redes) ahora apunta ahí.

### 2026-10-17 (rediseño + Nuvex IA)
- **Rediseño completo**:
  - Colores sólidos sin degradados: fondo papel y tinta, con modo oscuro.
  - Sombras y animaciones suaves.
  - Encabezado nuevo con acceso directo a la IA; se quitó el reloj.
  - Cuadrícula de herramientas con un color por herramienta.
  - Bloques "por qué Nuvex" y página 404 nueva.
- **Nuvex IA**, lo más destacado del sitio:
  - Asistente en la portada (tarjeta oscura con orbe animado) y primero en el menú de `/tools`.
  - Por ahora responde con palabras clave y lleva a la herramienta correcta; está listo para conectar una IA real.
- `/tools` reacciona a cambios de `?tool=`: abrir una herramienta desde la IA cambia el panel.
- Tests nuevos: `assistant.test.js` y `AssistantChat.test.jsx`; se actualizaron los de la portada y el pie.

### 2026-10-17 (DXF y PDF)
- **PNG/JPG a DXF reescrito** (`lib/dxf.js`). La versión anterior tenía varios problemas:
  - Recorría el relleno en vez del borde.
  - Dejaba los contornos abiertos.
  - Los PNG con fondo transparente salían como un bloque negro.
  - Marcaba los vértices como 3D.
- **Lo que hace ahora:**
  - Contornos cerrados con agujeros y curvas sin escalones.
  - Unas 25 veces menos puntos.
  - Ancho en mm.
  - Vista previa en vivo y opciones de forma, detalle y manchas.
- **Optimizar PDF ahora recomprime las fotos** en tres calidades (300, 150 o 100 ppp). Un PDF de fotos de 7,2 MB baja a 315 KB.
- Tests nuevos: `dxf.test.js`, `pdf-images.test.js` y `PngToDxf.test.jsx` (componente).

### 2026-10-17 (SEO y visibilidad)
- **El dominio estaba mal:** `nuvex.app` no es de Nuvex (está a la venta). Ahora todo apunta a `https://nuvex-5d7.pages.dev`, configurable con `NEXT_PUBLIC_SITE_URL` (`lib/site.js`).
- **Cada página tiene su propio título, descripción y canonical.** Antes todas decían ser la portada, y Google podía ignorar el resto.
  - Las páginas de herramienta (`/tools/<id>`) tienen títulos pensados para lo que la gente busca, datos estructurados (JSON-LD), un enlace "← Nuvex" y márgenes propios.
  - La 404 lleva `noindex`.
- **Sitemap automático** con las 9 URLs (antes 2), generado en cada build desde el registro de herramientas.
- **Imagen para redes** `og-image.png` (1200×630) con el logo; ahora los enlaces compartidos muestran una vista previa.
- **Tarjetas del inicio visibles sin JavaScript**: solo las que están fuera de pantalla se animan al hacer scroll, y se respeta "reducir movimiento".

### 2026-10-17 (herramientas de imagen)
- **Compresor reescrito** sin `browser-image-compression` (se desinstaló):
  - El control "Calidad" ahora es la calidad real; antes fijaba el tamaño máximo en MB.
  - Ya no reduce las fotos a 1024 px sin avisar.
  - Se puede elegir el formato de salida y volver a comprimir con otros ajustes.
  - Funciona sin conexión.
- **Limpiar metadatos** ya no convierte todo a PNG: en JPG y PNG quita los metadatos sin recomprimir. El archivo queda más liviano, no más pesado, y conserva la orientación. `exifr` se carga solo al pedir "Ver metadatos" (la página bajó de 36 kB a 5,6 kB).
- **Eliminar fondo**:
  - Por defecto borra solo el fondo conectado a los bordes; antes borraba ese color en toda la imagen.
  - Tiene bordes suaves y detecta mejor el color de fondo.
  - El menú ya no dice "con IA".
- Tests nuevos: `__tests__/lib/image.test.js` y `__tests__/lib/metadata.test.js`.

### 2026-10-17 (logo)
- **Logo nuevo** (N blanca sobre azul): `favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icon-192.png` e `icon-512.png`, generados con `scripts/generate-icons.py`. Antes el sitio pedía estos archivos pero no existían (la pestaña no tenía ícono y la app no se instalaba bien).
- Los íconos se declaran en un solo lugar (`_document.jsx`); se quitó el duplicado de `Layout.jsx`. El manifest los marca como `maskable`.

### 2026-10-17 (arreglos visuales)
- `/tools`: se quitó el `md:ml-64` del contenido, que duplicaba el espacio del menú (el contenido quedaba corrido 256 px). El estado "menú colapsado" ahora vive solo en `ToolSidebar`, y el menú ocupa toda la altura (`h-screen`).
- Se definieron `--surface-hover` y `--text-muted` en ambos temas (los fondos al pasar el mouse no se veían). Se quitó el `div` vacío `rain-atmosphere`.

### 2026-10-17 (organización y carga)
- **Registro único de herramientas** en `lib/tools.js` (antes la lista estaba repetida en el menú y en el cargador), con test.
- **Enlaces directos** `/tools?tool=<id>`; las tarjetas del inicio abren su herramienta. La última herramienta se guarda solo por id, con compatibilidad con el formato anterior.
- **Precarga** del código de cada herramienta al pasar el mouse por el menú.
- **Fuente** autoalojada con `next/font`, **tema oscuro sin destello** y **portada visible desde el primer pintado**.
- `exifr` se carga bajo demanda en el PDF Converter (la página bajó de 316 kB a 286 kB).
- Se quitaron imports sin usar (`Image` en FeaturedTools, `Link` en Footer, `useEffect`/`useState` en HeroSection).

### 2026-10-17
- **Next.js 14.0.3 → 15.5.28**: corrige vulnerabilidades conocidas. Se cambió `next-pwa` (abandonado) por `@ducanh2912/next-pwa` y se quitó `swcMinify` de `next.config.js`, que ya no existe.
- **PDF Converter**: soporte para WEBP, GIF, BMP y AVIF; rotación EXIF; páginas A4; TXT de varias páginas; extracción con validación; optimizar muestra el ahorro real; los errores se ven en la página (sin `alert()`); en Combinar se corrigió el tamaño que salía "NaN KB". La lógica pasó a `lib/pdf.js` con 14 tests.
- **QR**: zona de silencio, corrección de errores según haya logo o no, presets legibles, aviso de contraste, descarga a 1024 px sin carreras con el logo y validación de colores hex.
- **Limpieza**: se borraron el archivo basura `react` (captura de pantalla de 26 MB) y los componentes sin uso (`WhyUse`, `HowItWorks`, `ToolDetailView`, `Analytics`); se quitaron las dependencias sin usar (`fabric`, `mathjs`, `tesseract.js`) y el import sin usar en `_app.jsx`; el service worker generado pasó a `.gitignore`.
