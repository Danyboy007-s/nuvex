// ============================================
// ASISTENTE DE NUVEX (versión local, sin IA todavía)
// ============================================
// Entiende pedidos como "quiero bajarle el peso a unas fotos" y recomienda la
// herramienta adecuada, buscando palabras clave. Corre en el navegador y no
// envía nada a ningún servidor.
//
// Cuando se conecte la IA real (ruta /api en Vercel), solo hay que cambiar
// `answer()` por una llamada a esa API que devuelva el mismo formato:
//   { text, toolIds: ["file-utils", ...] }
// La interfaz (components/AssistantChat.jsx) no necesita cambios.

// Pistas por herramienta. Cada palabra encontrada suma su peso.
const INTENTS = [
  {
    toolId: "pdf-converter",
    reply: "Para eso usa el PDF Converter: convierte imágenes y TXT a PDF, une varios PDFs, extrae páginas y reduce su peso.",
    keywords: { pdf: 3, unir: 2, juntar: 2, combinar: 2, extraer: 2, paginas: 1, pagina: 1, documento: 1, escaneo: 1, escaneado: 1, txt: 2 },
  },
  {
    toolId: "file-utils",
    reply: "El Compresor reduce el peso de tus fotos: eliges calidad, tamaño y formato (JPG o WEBP).",
    keywords: { comprimir: 3, compresor: 3, peso: 2, pesa: 2, pesado: 2, pesada: 2, ligera: 2, ligero: 2, reducir: 1, tamano: 1, achicar: 2, whatsapp: 1, correo: 1, mb: 2, webp: 2, foto: 1, fotos: 1, imagen: 1, imagenes: 1 },
  },
  {
    toolId: "remove-metadata",
    reply: "Limpiar metadatos borra la ubicación GPS, la cámara y la fecha de tus fotos, sin perder calidad.",
    keywords: { metadatos: 3, exif: 3, gps: 3, ubicacion: 3, privacidad: 2, datos: 1, ocultos: 2, camara: 1, rastro: 2 },
  },
  {
    toolId: "remove-bg",
    reply: "Eliminar fondo quita fondos blancos o de color uniforme y te da un PNG transparente (ideal para logos).",
    keywords: { fondo: 3, transparente: 3, recortar: 2, quitar: 1, borrar: 1, logo: 1, png: 1, sticker: 2 },
  },
  {
    toolId: "png-to-dxf",
    reply: "PNG/JPG a DXF convierte siluetas y logos en contornos para AutoCAD, corte láser o CNC.",
    keywords: { dxf: 3, autocad: 3, cad: 3, laser: 3, cnc: 3, vector: 2, vectorizar: 3, contorno: 2, contornos: 2, plano: 1, silueta: 2, cortar: 1 },
  },
  {
    toolId: "text-humanizer",
    reply: "Humanizar cambia frases repetitivas y conectores robóticos para que un texto suene más natural.",
    keywords: { humanizar: 3, texto: 1, robotico: 3, natural: 2, chatgpt: 2, redaccion: 2, parafrasear: 3, reescribir: 2, ensayo: 1, tarea: 1 },
  },
  {
    toolId: "qr-generator",
    reply: "El Generador QR crea códigos con tu logo, colores y marcos, listos para imprimir.",
    keywords: { qr: 3, codigo: 1, enlace: 1, link: 1, menu: 1, escanear: 2, url: 1, wifi: 2 },
  },
];

export const SUGGESTIONS = [
  "Bajarle el peso a unas fotos para WhatsApp",
  "Unir varios PDFs en uno",
  "Quitar el fondo blanco de mi logo",
  "Borrar la ubicación GPS de una foto",
  "Crear un QR para el menú de mi negocio",
  "Pasar un dibujo a AutoCAD",
];

// "Fotos más LIGERAS" → "fotos mas ligeras" (sin acentos ni mayúsculas).
export const normalize = (text) =>
  text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ");

// Devuelve las herramientas ordenadas por qué tan bien encajan con el pedido.
export function rankTools(text) {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  return INTENTS.map((intent) => ({
    intent,
    score: words.reduce((s, w) => s + (intent.keywords[w] || 0), 0),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

// Respuesta del asistente: un texto y las herramientas sugeridas.
export function answer(text) {
  const ranked = rankTools(text);
  if (ranked.length === 0) {
    return {
      text: "Todavía no sé hacer eso. Por ahora puedo ayudarte con PDFs, fotos, fondos, metadatos, DXF, textos y códigos QR. ¿Lo cuentas de otra forma?",
      toolIds: [],
    };
  }
  const [best, second] = ranked;
  const toolIds = [best.intent.toolId];
  // Si otra herramienta encaja casi igual de bien, también se sugiere.
  if (second && second.score >= best.score * 0.75) toolIds.push(second.intent.toolId);
  return {
    text: toolIds.length > 1 ? `${best.intent.reply} También te puede servir esta otra:` : best.intent.reply,
    toolIds,
  };
}
