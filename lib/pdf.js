// ============================================
// Utilidades del PDF Converter (pages/tools/pdf-converter.jsx).
// Viven aparte para poder probarlas con tests (__tests__/lib/pdf.test.js).
// ============================================
import { PDFDocument, StandardFonts, EncryptedPDFError } from "pdf-lib";
import exifr from "exifr";

// ============================================
// CONSTANTES
// ============================================
// Tamaño A4 en puntos PDF (1 pt = 1/72 pulgada).
export const A4 = { width: 595.28, height: 841.89 };

// Margen alrededor de imágenes y texto en las páginas generadas.
export const PAGE_MARGIN = 36;

// Texto plano: tipografía y espaciado.
export const TEXT_FONT_SIZE = 11;
export const TEXT_LINE_HEIGHT = 15;

export const MAX_FILES = 20;

// Tipos que acepta cada modo. "Convertir" solo admite lo que de verdad
// sabemos pasar a PDF; el resto de modos trabajan sobre PDFs existentes.
export const ACCEPT_CONVERT = {
  "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"],
  "text/plain": [".txt"],
  "application/pdf": [".pdf"],
};
export const ACCEPT_PDF = { "application/pdf": [".pdf"] };

export const MODES = [
  { id: "convert", label: "Convertir", action: "Convertir a PDF", hint: "Imágenes, TXT o PDF" },
  { id: "merge", label: "Combinar", action: "Combinar PDFs", hint: "Dos o más PDFs" },
  { id: "extract", label: "Extraer", action: "Extraer páginas", hint: "Un PDF" },
  { id: "optimize", label: "Optimizar", action: "Optimizar PDF", hint: "Un PDF" },
];

// Modos que trabajan con un único PDF: al soltar uno nuevo, reemplaza al anterior.
export const SINGLE_FILE_MODES = ["extract", "optimize"];

// ============================================
// UTILIDADES
// ============================================
export const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

export const isPdf = (file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);
export const isText = (file) => file.type === "text/plain" || /\.txt$/i.test(file.name);

// Abre un PDF y traduce los errores típicos a un mensaje entendible.
export async function loadPdf(file) {
  try {
    return await PDFDocument.load(await file.arrayBuffer());
  } catch (err) {
    if (err instanceof EncryptedPDFError) {
      throw new Error(`"${file.name}" está protegido con contraseña.`);
    }
    throw new Error(`"${file.name}" no es un PDF válido o está dañado.`);
  }
}

// Identifica el formato real por sus primeros bytes ("firma"), no por la
// extensión: un .jpg renombrado que en realidad es PNG también funciona.
export function sniffImageType(bytes) {
  const b = new Uint8Array(bytes.slice(0, 4));
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  return "other";
}

// Dibuja la imagen en un canvas y la devuelve como bytes PNG/JPEG.
// createImageBitmap ya aplica la rotación EXIF de las fotos del celular.
export async function rasterize(file, mime) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
  return blob.arrayBuffer();
}

// pdf-lib solo sabe incrustar PNG y JPEG. Cualquier otro formato (WEBP, GIF,
// BMP, AVIF...) se convierte a PNG primero.
export async function embedImage(pdfDoc, file) {
  const bytes = await file.arrayBuffer();
  const kind = sniffImageType(bytes);

  if (kind === "png") return pdfDoc.embedPng(bytes);

  if (kind === "jpg") {
    // pdf-lib ignora la orientación EXIF: una foto vertical del celular
    // saldría acostada. Si viene rotada, la "enderezamos" vía canvas.
    const orientation = await exifr.orientation(file).catch(() => undefined);
    if (orientation && orientation !== 1) {
      return pdfDoc.embedJpg(await rasterize(file, "image/jpeg"));
    }
    return pdfDoc.embedJpg(bytes);
  }

  return pdfDoc.embedPng(await rasterize(file, "image/png"));
}

// Agrega una página A4 (vertical u horizontal según la imagen) con la
// imagen centrada y escalada para caber dentro de los márgenes.
export function addImagePage(pdfDoc, image) {
  const landscape = image.width > image.height;
  const pageW = landscape ? A4.height : A4.width;
  const pageH = landscape ? A4.width : A4.height;
  const maxW = pageW - PAGE_MARGIN * 2;
  const maxH = pageH - PAGE_MARGIN * 2;
  // Nunca agrandar imágenes pequeñas (se verían pixeladas).
  const scale = Math.min(maxW / image.width, maxH / image.height, 1);
  const w = image.width * scale;
  const h = image.height * scale;
  const page = pdfDoc.addPage([pageW, pageH]);
  page.drawImage(image, { x: (pageW - w) / 2, y: (pageH - h) / 2, width: w, height: h });
}

// Las fuentes estándar de PDF (Helvetica) solo cubren el alfabeto latino
// (WinAnsi): acentos, ñ, ¿¡ sí; emojis, chino, etc. no. Esos caracteres
// se reemplazan por "?" para que no falle toda la conversión.
export function sanitizeForFont(text, font) {
  const cache = new Map();
  return Array.from(text)
    .map((ch) => {
      // El salto de línea no es un glifo de la fuente, pero hay que conservarlo
      // porque wrapText lo usa para separar párrafos.
      if (ch === "\n") return ch;
      if (!cache.has(ch)) {
        try {
          font.encodeText(ch);
          cache.set(ch, ch);
        } catch {
          cache.set(ch, "?");
        }
      }
      return cache.get(ch);
    })
    .join("");
}

// Parte el texto en líneas que caben en `maxWidth`, respetando los saltos
// de línea originales. Las palabras demasiado largas se cortan por letras.
export function wrapText(text, font, size, maxWidth) {
  const fits = (s) => font.widthOfTextAtSize(s, size) <= maxWidth;
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (fits(candidate)) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      // Palabra más ancha que la página (ej. una URL larga): cortarla.
      let rest = word;
      while (!fits(rest)) {
        let cut = rest.length - 1;
        while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

// Convierte un .txt en tantas páginas A4 como haga falta.
export async function addTextPages(pdfDoc, file) {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const raw = (await file.text()).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
  const text = sanitizeForFont(raw, font);
  const lines = wrapText(text, font, TEXT_FONT_SIZE, A4.width - PAGE_MARGIN * 2);
  const linesPerPage = Math.floor((A4.height - PAGE_MARGIN * 2) / TEXT_LINE_HEIGHT);

  for (let i = 0; i < lines.length; i += linesPerPage) {
    const page = pdfDoc.addPage([A4.width, A4.height]);
    lines.slice(i, i + linesPerPage).forEach((line, j) => {
      page.drawText(line, {
        x: PAGE_MARGIN,
        y: A4.height - PAGE_MARGIN - TEXT_FONT_SIZE - j * TEXT_LINE_HEIGHT,
        size: TEXT_FONT_SIZE,
        font,
      });
    });
  }
}

// Interpreta "1,3,5-7" (numeración desde 1) y devuelve índices desde 0.
// Admite rangos al revés ("7-5") y quita duplicados conservando el orden.
export function parsePageRanges(input, totalPages) {
  const pages = [];
  for (const part of input.split(",").map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      const step = a <= b ? 1 : -1;
      for (let n = a; n !== b + step; n += step) pages.push(n);
    } else if (/^\d+$/.test(part)) {
      pages.push(Number(part));
    } else {
      throw new Error(`"${part}" no es un número o rango válido. Ejemplo: 1,3,5-7`);
    }
  }
  if (pages.length === 0) throw new Error("Escribe qué páginas extraer. Ejemplo: 1,3,5-7");
  const outOfRange = pages.filter((n) => n < 1 || n > totalPages);
  if (outOfRange.length > 0) {
    throw new Error(`El PDF tiene ${totalPages} páginas; no existe la página ${outOfRange[0]}.`);
  }
  return [...new Set(pages)].map((n) => n - 1);
}

