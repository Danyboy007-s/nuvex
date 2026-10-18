// ============================================
// Utilidades del PDF Converter (pages/tools/pdf-converter.jsx).
// Viven aparte para poder probarlas con tests (__tests__/lib/pdf.test.js).
// ============================================
import { PDFDocument, StandardFonts, EncryptedPDFError, PDFName, PDFArray, PDFRawStream, PDFNumber, PDFBool } from "pdf-lib";
import { fitWithin } from "./image";

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
    // exifr se importa aquí (y no arriba) para que solo se descargue si
    // alguien sube un JPG; así la página del PDF carga más ligera.
    const { default: exifr } = await import("exifr");
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


// ============================================
// OPTIMIZAR: RECOMPRIMIR IMÁGENES
// ============================================
// Un PDF de fotos pesa por sus imágenes. Aquí se recorren las imágenes del PDF
// (sin pdf.js: pdf-lib da acceso directo a cada objeto), se reducen a la
// resolución elegida y se vuelven a guardar como JPG. Solo se reemplaza una
// imagen si queda más liviana.
//
// Se recomprimen:
//   - JPG (filtro DCTDecode) en RGB o escala de grises: fotos, escaneos de celular.
//   - Imágenes sin pérdida (FlateDecode, 8 bits, RGB/grises) SOLO si parecen
//     foto. Texto, logos o capturas se dejan igual: en JPG se verían manchados.
// Se dejan como están (por seguridad): CMYK, colores indexados, imágenes de
// 1 bit (escaneos en blanco y negro), máscaras y otros filtros (JBIG2, CCITT...).

// Lado mayor máximo pensado para una hoja A4: 3508 px = 300 ppp, 1754 = 150, 1170 = 100.
export const IMAGE_LEVELS = [
  { id: "print", label: "Impresión", hint: "300 ppp", maxSide: 3508, quality: 0.85 },
  { id: "screen", label: "Pantalla", hint: "150 ppp", maxSide: 1754, quality: 0.75 },
  { id: "small", label: "Mínimo", hint: "100 ppp", maxSide: 1170, quality: 0.6 },
];

const N = (name) => PDFName.of(name);

// Número de componentes de color (1 = grises, 3 = RGB) o null si no se soporta.
function colorComponents(context, colorSpace) {
  const cs = context.lookup(colorSpace);
  if (cs === N("DeviceRGB")) return 3;
  if (cs === N("DeviceGray")) return 1;
  // [/ICCBased <perfil>]: el perfil dice cuántos componentes tiene.
  if (cs instanceof PDFArray && cs.lookup(0) === N("ICCBased")) {
    const n = cs.lookup(1)?.dict?.lookup(N("N"));
    const v = n instanceof PDFNumber ? n.asNumber() : null;
    return v === 1 || v === 3 ? v : null;
  }
  return null;
}

// Lista las imágenes que se pueden recomprimir con seguridad.
export function findRecompressibleImages(pdfDoc) {
  const { context } = pdfDoc;
  const all = context.enumerateIndirectObjects();

  // Las máscaras de transparencia (SMask/Mask) también son imágenes, pero no
  // se tocan: recomprimirlas por separado ensuciaría los bordes transparentes.
  const masks = new Set();
  for (const [, obj] of all) {
    if (!(obj instanceof PDFRawStream)) continue;
    for (const key of ["SMask", "Mask"]) {
      const m = obj.dict.get(N(key));
      if (m && !(m instanceof PDFArray)) masks.add(m.toString());
    }
  }

  const found = [];
  for (const [ref, obj] of all) {
    if (!(obj instanceof PDFRawStream)) continue;
    if (masks.has(ref.toString())) continue;
    const dict = obj.dict;
    if (dict.lookup(N("Subtype")) !== N("Image")) continue;
    if (dict.lookup(N("ImageMask")) === PDFBool.True) continue;
    if (dict.has(N("Decode"))) continue; // colores invertidos u otros mapeos raros

    let filter = dict.lookup(N("Filter"));
    if (filter instanceof PDFArray) filter = filter.size() === 1 ? filter.lookup(0) : null;
    const bpc = dict.lookup(N("BitsPerComponent"));
    const comps = colorComponents(context, dict.get(N("ColorSpace")));
    const width = dict.lookup(N("Width"))?.asNumber?.();
    const height = dict.lookup(N("Height"))?.asNumber?.();
    if (!comps || !width || !height || bpc?.asNumber?.() !== 8) continue;

    if (filter === N("DCTDecode")) {
      found.push({ ref, stream: obj, kind: "jpeg", width, height, comps });
    } else if (filter === N("FlateDecode") && !dict.has(N("DecodeParms"))) {
      found.push({ ref, stream: obj, kind: "raw", width, height, comps });
    }
  }
  return found;
}

// ¿Parecen foto estos píxeles? Las fotos tienen miles de colores distintos;
// el texto, los logos y las capturas, pocos.
export function looksLikePhoto(pixels, comps, sample = 20000, minColors = 1500) {
  const count = pixels.length / comps;
  const step = Math.max(1, Math.floor(count / sample));
  const colors = new Set();
  for (let p = 0; p < count; p += step) {
    const i = p * comps;
    colors.add(comps === 3 ? (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2] : pixels[i]);
    if (colors.size >= minColors) return true;
  }
  return false;
}

// Descomprime FlateDecode (zlib) con la API del navegador (también existe en Node 18+).
async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---- Funciones de navegador (canvas). Se pueden reemplazar en los tests. ----

const browserCodec = {
  async decodeJpeg(bytes) {
    return createImageBitmap(new Blob([bytes], { type: "image/jpeg" }));
  },
  async fromPixels(pixels, width, height, comps) {
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let p = 0, i = 0; p < width * height; p++, i += comps) {
      rgba[p * 4] = pixels[i];
      rgba[p * 4 + 1] = pixels[comps === 3 ? i + 1 : i];
      rgba[p * 4 + 2] = pixels[comps === 3 ? i + 2 : i];
      rgba[p * 4 + 3] = 255;
    }
    return createImageBitmap(new ImageData(rgba, width, height));
  },
  async encodeJpeg(source, width, height, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, width, height);
    source.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    return new Uint8Array(await blob.arrayBuffer());
  },
};

// Recomprime las imágenes del PDF en el lugar. Devuelve cuántas se
// reemplazaron y cuántos bytes se ahorraron (solo en imágenes).
export async function recompressImages(pdfDoc, level, { codec = browserCodec, onProgress } = {}) {
  const { context } = pdfDoc;
  const images = findRecompressibleImages(pdfDoc);
  let replaced = 0, saved = 0;

  for (let k = 0; k < images.length; k++) {
    onProgress?.(k, images.length);
    const img = images[k];
    try {
      let source;
      if (img.kind === "jpeg") {
        source = await codec.decodeJpeg(img.stream.contents);
      } else {
        const pixels = await inflate(img.stream.contents);
        if (pixels.length !== img.width * img.height * img.comps) continue; // datos inesperados
        if (!looksLikePhoto(pixels, img.comps)) continue;
        source = await codec.fromPixels(pixels, img.width, img.height, img.comps);
      }

      const { width, height } = fitWithin(img.width, img.height, level.maxSide);
      const jpeg = await codec.encodeJpeg(source, width, height, level.quality);
      if (jpeg.length >= img.stream.contents.length) continue; // no mejora: se deja

      // Diccionario nuevo: mismas claves (máscara de transparencia, etc.)
      // salvo las que describen los datos, que cambian.
      const replaced_keys = ["Filter", "DecodeParms", "ColorSpace", "Width", "Height", "BitsPerComponent", "Length"];
      const stream = context.stream(jpeg, {
        Type: "XObject", Subtype: "Image", Width: width, Height: height,
        ColorSpace: "DeviceRGB", BitsPerComponent: 8, Filter: "DCTDecode",
      });
      for (const [key, value] of img.stream.dict.entries()) {
        if (!replaced_keys.includes(key.decodeText()) && !stream.dict.has(key)) stream.dict.set(key, value);
      }
      context.assign(img.ref, stream);
      replaced++;
      saved += img.stream.contents.length - jpeg.length;
    } catch (err) {
      // Una imagen que el navegador no puede leer se deja como estaba.
      console.warn("No se pudo recomprimir una imagen del PDF:", err);
    }
  }
  onProgress?.(images.length, images.length);
  return { total: images.length, replaced, saved };
}
