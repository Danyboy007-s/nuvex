# Nuvex

Herramientas de conversión que funcionan **100% en el navegador**: los archivos nunca salen del dispositivo del usuario. Sin cuentas, sin servidores y sin colas.

> Estado: beta en desarrollo activo. Ver [Registro de cambios](#registro-de-cambios).

---

## Herramientas

| Herramienta | Archivo | Cómo funciona |
|---|---|---|
| PDF Converter | `pages/tools/pdf-converter.jsx` + `lib/pdf.js` | Usa `pdf-lib` para convertir imágenes, TXT y PDFs en un solo PDF, combinar, extraer páginas y optimizar. |
| Compresor de imágenes | `pages/tools/file-utils.jsx` | Usa `browser-image-compression`. |
| Limpiar metadatos | `pages/tools/remove-metadata.jsx` | Lee el EXIF con `exifr` y vuelve a dibujar la imagen en un canvas para quitarlo. |
| Eliminar fondo | `pages/tools/remove-bg.jsx` | Vuelve transparente un color (por tolerancia). **Todavía no usa IA.** |
| PNG/JPG a DXF | `pages/tools/png-to-dxf.jsx` | Detecta contornos con código propio y exporta un DXF para AutoCAD. |
| Humanizar texto | `pages/tools/text-humanizer.jsx` | Reglas y reemplazos aleatorios (sin IA por ahora). |
| Generador QR | `pages/tools/qr-generator.jsx` | Usa `qr-code-styling`, con estilos, gradientes, marcos y logo. |

### Detalles del Generador QR

Estas decisiones existen para que el QR **siempre se pueda escanear**:

- **Zona de silencio** (`QUIET_ZONE_RATIO`): margen del color de fondo alrededor del código. Sin él, muchas cámaras no lo leen.
- **Corrección de errores**: nivel `H` cuando hay logo (aguanta ~30% del código tapado) y `M` cuando no lo hay.
- **Contraste**: todos los presets usan puntos oscuros sobre fondo claro. Si el usuario elige colores con poco contraste o un QR invertido, aparece un aviso.
- **Descarga en alta resolución** (`EXPORT_SIZE` = 1024 px): se usa `getRawData()`, que espera a que cargue el logo antes de exportar.

### Detalles del PDF Converter

La lógica está en `lib/pdf.js` (con tests en `__tests__/lib/pdf.test.js`); la página solo maneja la interfaz.

- **Imágenes**: PNG y JPG se incrustan tal cual. WEBP, GIF, BMP y AVIF se pasan a PNG con un canvas. El formato se detecta por los bytes del archivo, no por la extensión. Cada imagen va en una página A4 (vertical u horizontal), centrada y sin agrandarse.
- **Fotos de celular**: si el JPG trae rotación EXIF, se endereza antes de incrustarlo.
- **TXT**: se ajusta al ancho y se reparte en tantas páginas como haga falta. La fuente Helvetica solo cubre el alfabeto latino, así que los emojis y otros caracteres se cambian por `?`.
- **Extraer**: acepta `1,3,5-7` y rangos al revés (`7-5`); avisa si una página no existe.
- **Optimizar**: reconstruye el PDF (descarta objetos sobrantes y metadatos, y comprime la estructura). **No recomprime imágenes**, así que un PDF de fotos casi no baja de peso. Muestra el tamaño antes y después, y avisa si no se pudo reducir.
- **Errores**: los PDF con contraseña o dañados muestran un mensaje claro dentro de la página.

---

## Tecnología

- **Next.js 15.5** (Pages Router) y **React 18**. Todavía no se usa Next 16 porque compila con Turbopack, y el plugin de PWA necesita webpack.
- **Tailwind CSS**: los colores del tema son variables CSS (`--bg`, `--surface`, `--accent`...) definidas en `styles/globals.css`, con modo oscuro mediante la clase `.dark`.
- **@ducanh2912/next-pwa** (reemplazo mantenido de `next-pwa`): la app se puede instalar y funciona sin conexión.
- **Exportación estática** (`output: 'export'` en `next.config.js`): el build genera HTML/JS plano en `out/`, sin servidor.
- **Jest + Testing Library** para los tests.

## Estructura

```
nuvex/
├── components/          # Piezas de interfaz reutilizables
│   ├── Layout.jsx         # Envoltorio común: <head>, reloj y botón de tema
│   ├── HeroSection.jsx    # Portada de la página de inicio
│   ├── FeaturedTools.jsx  # Tarjetas de herramientas en el inicio
│   ├── WhyNuvex.jsx       # Bloque de texto del inicio
│   ├── Footer.jsx
│   ├── ToolSidebar.jsx    # Menú lateral de /tools (lista de herramientas)
│   └── ToolRenderer.jsx   # Carga dinámicamente la herramienta elegida
├── pages/
│   ├── index.jsx          # Página de inicio (/)
│   ├── tools.jsx          # Panel de herramientas (/tools)
│   ├── 404.jsx
│   ├── _app.jsx / _document.jsx
│   └── tools/             # Una herramienta por archivo (ver tabla)
├── lib/                 # Lógica sin interfaz, fácil de probar (ej. pdf.js)
├── public/              # Archivos estáticos: manifest, robots, sitemap
├── styles/globals.css   # Variables de tema y estilos globales
└── __tests__/           # Tests (components/ y lib/)
```

### Cómo se conecta una herramienta

1. Cada herramienta vive en `pages/tools/<id>.jsx` y acepta la prop `standalone`:
   - `standalone = true`: devuelve solo su contenido (se usa dentro de `/tools`).
   - `standalone = false`: se envuelve en `Layout` (se usa si alguien visita `/tools/<id>` directo).
2. `components/ToolRenderer.jsx` la importa con `dynamic(..., { ssr: false })`, porque estas librerías necesitan `window`.
3. `components/ToolSidebar.jsx` la muestra en el menú (`toolCategories`).

**Para agregar una herramienta nueva:** crea el archivo en `pages/tools/`, regístralo en `toolsMap` (ToolRenderer) y agrégalo a `toolCategories` (ToolSidebar).

---

## Desarrollo

Requisitos: Node.js 18 o superior (probado con 22).

```bash
npm install       # instalar dependencias
npm run dev       # servidor local en http://localhost:3000
npm run build     # build de producción; el sitio estático queda en out/
npm test          # correr los tests
```

> El service worker (`public/sw.js`, `public/workbox-*.js`) lo genera el plugin de PWA en cada build y está en `.gitignore`. No se edita a mano.

## Despliegue

Hoy el sitio está en **Cloudflare Pages**. Para desplegarlo:

- Comando de build: `npm run build`
- Carpeta de salida: `out`

Está pendiente la migración a Vercel (ver Pendientes).

---

## Pendientes

- [x] Actualizar Next.js (14.0.3 → 15.5.28).
- [x] PDF Converter: WEBP y otros formatos, TXT largos, errores claros.
- [ ] PDF Converter: recomprimir imágenes al optimizar (requiere pdf.js para renderizar páginas).
- [ ] Revisar los avisos de `npm audit` que quedan: son de herramientas que solo se usan al compilar (workbox, postcss interno de Next), no del sitio publicado.
- [ ] Limpiar metadatos: conservar el formato original (hoy todo sale como PNG y pesa más).
- [ ] `/tools`: sincronizar el estado colapsado del menú con el margen del contenido.
- [ ] Las tarjetas del inicio deberían abrir directamente su herramienta.
- [ ] Agregar los íconos que faltan en `public/` (`icon-192.png`, `icon-512.png`, `favicon.ico`/`favicon.svg`).
- [ ] Confirmar el dominio que usan `sitemap.xml`, `robots.txt` y el canonical (`nuvex.app`).
- [ ] Migrar a Vercel.
- [ ] Integrar IA con una ruta `/api` en el servidor (la clave de la API nunca debe ir en el navegador).
- [ ] Eliminar fondo con IA real (por ejemplo `@imgly/background-removal`, que corre en el navegador).

## Registro de cambios

### 2026-10-17
- **Next.js 14.0.3 → 15.5.28**: corrige vulnerabilidades conocidas. Se cambió `next-pwa` (abandonado) por `@ducanh2912/next-pwa` y se quitó `swcMinify` de `next.config.js`, que ya no existe.
- **PDF Converter**: soporte para WEBP, GIF, BMP y AVIF; rotación EXIF; páginas A4; TXT de varias páginas; extracción con validación; optimizar muestra el ahorro real; los errores se ven en la página (sin `alert()`); en Combinar se corrigió el tamaño que salía "NaN KB". La lógica pasó a `lib/pdf.js` con 14 tests.
- **QR**: zona de silencio, corrección de errores según haya logo o no, presets legibles, aviso de contraste, descarga a 1024 px sin carreras con el logo y validación de colores hex.
- **Limpieza**: se borraron el archivo basura `react` (captura de pantalla de 26 MB) y los componentes sin uso (`WhyUse`, `HowItWorks`, `ToolDetailView`, `Analytics`); se quitaron las dependencias sin usar (`fabric`, `mathjs`, `tesseract.js`) y el import sin usar en `_app.jsx`; el service worker generado pasó a `.gitignore`.
