// ============================================
// REGISTRO DE HERRAMIENTAS
// ============================================
// Única fuente de verdad de qué herramientas existen. La usan:
//   - components/ToolSidebar.jsx  → arma el menú por categorías
//   - components/ToolRenderer.jsx → carga el código de la herramienta elegida
//   - pages/tools.jsx             → recuerda la última herramienta y lee ?tool=
//
//   - scripts/generate-sitemap.mjs → lista cada herramienta en sitemap.xml
//
// Para agregar una herramienta: crea pages/tools/<id>.jsx y agrégala aquí.
//
// Campos: name/desc → menú. seoTitle/seoDescription → lo que muestra Google
// para la página propia de la herramienta (/tools/<id>): conviene que digan
// lo que la gente busca ("comprimir imágenes", "quitar fondo"...).

export const TOOL_CATEGORIES = [
  {
    name: "Conversión",
    tools: [
      {
        id: "pdf-converter", name: "PDF Converter", desc: "Combina, extrae u optimiza PDFs",
        seoTitle: "Convertir imágenes y TXT a PDF, unir y extraer páginas",
        seoDescription: "Convierte JPG, PNG, WEBP y TXT a PDF, une varios PDFs, extrae páginas y optimiza el tamaño. Gratis y sin subir tus archivos.",
      },
    ],
  },
  {
    name: "Imagen",
    tools: [
      {
        id: "file-utils", name: "Compresor", desc: "Reduce el peso de tus fotos",
        seoTitle: "Comprimir imágenes JPG, PNG y WEBP online",
        seoDescription: "Reduce el peso de tus fotos eligiendo la calidad, el tamaño y el formato (JPG o WEBP). Gratis, sin registro y sin subir tus imágenes.",
      },
      {
        id: "remove-metadata", name: "Limpiar metadatos", desc: "Borra datos ocultos (GPS, cámara)",
        seoTitle: "Eliminar metadatos EXIF y ubicación GPS de fotos",
        seoDescription: "Borra la ubicación GPS, el modelo de cámara y la fecha de tus fotos JPG y PNG sin perder calidad. Todo ocurre en tu navegador.",
      },
      {
        id: "remove-bg", name: "Eliminar fondo", desc: "Quita fondos de color uniforme",
        seoTitle: "Quitar fondo de color a una imagen (PNG transparente)",
        seoDescription: "Elimina fondos blancos o de color uniforme y descarga un PNG transparente. Ideal para logos y productos. Gratis y sin subir la imagen.",
      },
      {
        id: "png-to-dxf", name: "PNG/JPG a DXF", desc: "Convierte a DXF para AutoCAD",
        seoTitle: "Convertir PNG o JPG a DXF para AutoCAD",
        seoDescription: "Convierte siluetas y logos en PNG o JPG a contornos DXF listos para AutoCAD, corte láser o CNC. Gratis, en tu navegador.",
      },
    ],
  },
  {
    name: "Texto y códigos",
    tools: [
      {
        id: "text-humanizer", name: "Humanizar", desc: "Quita lo robótico a la IA",
        seoTitle: "Humanizar texto generado por IA",
        seoDescription: "Haz que un texto escrito con IA suene más natural: cambia frases repetitivas y conectores robóticos. Gratis y sin registro.",
      },
      {
        id: "qr-generator", name: "Generador QR", desc: "Crea códigos con logo y color",
        seoTitle: "Generador de códigos QR con logo y colores",
        seoDescription: "Crea códigos QR personalizados con tu logo, colores, degradados y marcos, y descárgalos en alta resolución. Gratis y sin marcas de agua.",
      },
    ],
  },
];

// Funciones que cargan el código de cada herramienta bajo demanda.
// Cada import() genera un archivo JS aparte (code splitting): quien solo usa
// el QR nunca descarga pdf-lib. Las rutas deben ser literales para que
// webpack sepa qué archivos separar.
export const TOOL_LOADERS = {
  "pdf-converter": () => import("../pages/tools/pdf-converter"),
  "file-utils": () => import("../pages/tools/file-utils"),
  "remove-metadata": () => import("../pages/tools/remove-metadata"),
  "remove-bg": () => import("../pages/tools/remove-bg"),
  "png-to-dxf": () => import("../pages/tools/png-to-dxf"),
  "text-humanizer": () => import("../pages/tools/text-humanizer"),
  "qr-generator": () => import("../pages/tools/qr-generator"),
};

const ALL_TOOLS = TOOL_CATEGORIES.flatMap((c) => c.tools);

// Devuelve la herramienta con ese id, o null si no existe.
export const findTool = (id) => ALL_TOOLS.find((t) => t.id === id) || null;

export const ALL_TOOL_IDS = ALL_TOOLS.map((t) => t.id);

// Props de SEO para la página propia de una herramienta: <Layout {...toolPageSeo(id)}>
export function toolPageSeo(id) {
  const tool = findTool(id);
  return {
    title: `${tool.seoTitle} | Nuvex`,
    description: tool.seoDescription,
    path: `/tools/${id}`,
    appName: tool.name,
  };
}

// Empieza a descargar el código de una herramienta sin mostrarla todavía
// (se usa al pasar el mouse por el menú, para que el clic se sienta instantáneo).
// El navegador guarda el resultado, así que llamarlo varias veces no cuesta nada.
export function prefetchTool(id) {
  TOOL_LOADERS[id]?.().catch(() => {});
}
