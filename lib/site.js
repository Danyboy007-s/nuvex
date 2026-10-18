// ============================================
// DATOS DEL SITIO (SEO)
// ============================================
// Un solo lugar para el dominio y los textos que ven Google y las redes
// sociales. Lo usan components/Layout.jsx y scripts/generate-sitemap.mjs.
//
// El dominio se puede cambiar sin tocar código con la variable de entorno
// NEXT_PUBLIC_SITE_URL (por ejemplo, al migrar a Vercel o comprar un dominio).

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://nuvex-beta.vercel.app").replace(/\/+$/, "");

export const SITE_NAME = "Nuvex";

// Título y descripción de la portada (y valores por defecto).
export const DEFAULT_TITLE = "Nuvex — Herramientas gratis para PDF, imágenes y QR";
export const DEFAULT_DESCRIPTION =
  "Convierte PDFs, comprime fotos, limpia metadatos, quita fondos y crea códigos QR. " +
  "Gratis, sin registro y sin subir tus archivos: todo se procesa en tu navegador.";

// Imagen que aparece al compartir un enlace (1200×630, scripts/generate-icons.py).
export const OG_IMAGE = "/og-image.png";

// "/tools" → "https://dominio/tools"
export const absoluteUrl = (path = "/") => SITE_URL + (path === "/" ? "/" : path);
