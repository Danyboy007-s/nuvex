// ============================================
// LÓGICA DE IMAGEN (Compresor y Eliminar fondo)
// ============================================
// Funciones puras (sin DOM) para poder probarlas con Jest, más dos helpers
// de navegador (decodeImage / encodeCanvas) que usan canvas.
// Todo corre en el navegador: las imágenes nunca se suben a ningún servidor.

// Formatos de salida que ofrece el Compresor.
export const OUTPUT_FORMATS = [
  { id: "auto", label: "Mismo formato" },
  { id: "image/webp", label: "WEBP" },
  { id: "image/jpeg", label: "JPG" },
];

// Lado mayor máximo (px). null = conservar el tamaño original.
export const SIZE_PRESETS = [
  { value: null, label: "Original" },
  { value: 2560, label: "2560 px" },
  { value: 1920, label: "1920 px" },
  { value: 1280, label: "1280 px" },
];

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const extensionFor = (mime) => EXTENSIONS[mime] || "png";

// Formato final según la elección del usuario. En "auto" se conserva el
// formato original si el navegador sabe codificarlo (JPG, PNG, WEBP);
// cualquier otro (GIF, BMP, HEIC...) sale como JPG.
export function resolveOutputMime(inputMime, choice = "auto") {
  if (choice !== "auto") return choice;
  if (inputMime === "image/jpg") return "image/jpeg";
  return EXTENSIONS[inputMime] ? inputMime : "image/jpeg";
}

// PNG es sin pérdida: el control de calidad no le afecta.
export const supportsQuality = (mime) => mime === "image/jpeg" || mime === "image/webp";

// Escala (width, height) para que el lado mayor no pase de maxSide,
// manteniendo la proporción. Nunca agranda.
export function fitWithin(width, height, maxSide) {
  if (!maxSide || Math.max(width, height) <= maxSide) return { width, height };
  const scale = maxSide / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// ---------- Eliminar fondo ----------

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const rgbToHex = (r, g, b) =>
  "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

// Color de fondo probable: el más repetido entre los píxeles del borde
// (más fiable que mirar un solo punto de una esquina).
export function guessBackgroundColor(data, width, height) {
  const counts = new Map();
  const add = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] === 0) return; // ya transparente
    // Se agrupan colores parecidos (pasos de 8) para tolerar ruido o JPG.
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const c = counts.get(key) || { n: 0, i };
    c.n++;
    counts.set(key, c);
  };
  for (let x = 0; x < width; x++) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y++) { add(0, y); add(width - 1, y); }

  let best = null;
  for (const c of counts.values()) if (!best || c.n > best.n) best = c;
  if (!best) return "#ffffff";
  return rgbToHex(data[best.i], data[best.i + 1], data[best.i + 2]);
}

// Vuelve transparentes los píxeles parecidos a `color` (distancia RGB < tolerance).
//   mode "connected": solo los que tocan el borde a través de píxeles parecidos
//                     (el fondo real; respeta el mismo color dentro del objeto).
//   mode "all":       todos los píxeles parecidos, estén donde estén.
// Además suaviza el borde: los píxeles vecinos al fondo con color "casi" igual
// (hasta 1.5× la tolerancia) quedan semitransparentes, para evitar el halo.
// Modifica `data` (RGBA) en el lugar y devuelve cuántos píxeles quitó.
export function removeBackground(data, width, height, color, tolerance, mode = "connected") {
  const { r, g, b } = typeof color === "string" ? hexToRgb(color) : color;
  const total = width * height;
  const tol2 = tolerance * tolerance;
  const soft = tolerance * 1.5;

  const dist = (p) => {
    const i = p * 4;
    const dr = data[i] - r, dg = data[i + 1] - g, db = data[i + 2] - b;
    return dr * dr + dg * dg + db * db;
  };

  // removed[p] = 1 si el píxel p es fondo.
  const removed = new Uint8Array(total);
  let count = 0;

  if (mode === "all") {
    for (let p = 0; p < total; p++) {
      if (dist(p) < tol2) { removed[p] = 1; count++; }
    }
  } else {
    // Relleno por inundación (flood fill) desde todos los píxeles del borde.
    // Se usa una pila explícita en vez de recursión para no desbordar la pila
    // con imágenes grandes.
    const stack = new Int32Array(total);
    let top = 0;
    const push = (p) => {
      if (!removed[p] && dist(p) < tol2) { removed[p] = 1; count++; stack[top++] = p; }
    };
    for (let x = 0; x < width; x++) { push(x); push((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { push(y * width); push(y * width + width - 1); }
    while (top > 0) {
      const p = stack[--top];
      const x = p % width;
      if (x > 0) push(p - 1);
      if (x < width - 1) push(p + 1);
      if (p >= width) push(p - width);
      if (p < total - width) push(p + width);
    }
  }

  for (let p = 0; p < total; p++) {
    if (removed[p]) { data[p * 4 + 3] = 0; continue; }
    // Borde suave: solo píxeles que tocan el fondo quitado.
    const x = p % width;
    const touches =
      (x > 0 && removed[p - 1]) || (x < width - 1 && removed[p + 1]) ||
      (p >= width && removed[p - width]) || (p < total - width && removed[p + width]);
    if (!touches) continue;
    const d = Math.sqrt(dist(p));
    if (d < soft) {
      const alpha = (d - tolerance) / (soft - tolerance); // 0 → 1
      data[p * 4 + 3] = Math.round(data[p * 4 + 3] * Math.max(0, Math.min(1, alpha)));
    }
  }
  return count;
}

// ---------- Helpers de navegador ----------

// Decodifica un archivo de imagen a un <canvas>, opcionalmente reducido.
// createImageBitmap aplica la orientación EXIF (fotos de celular giradas).
export async function decodeImage(file, maxSide = null) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx, bitmap, width, height };
}

// Codifica un canvas. JPG no tiene transparencia: se pinta fondo blanco
// debajo para que las zonas transparentes no salgan negras.
export function encodeCanvas(canvas, mime, quality) {
  let source = canvas;
  if (mime === "image/jpeg") {
    source = document.createElement("canvas");
    source.width = canvas.width;
    source.height = canvas.height;
    const ctx = source.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, source.width, source.height);
    ctx.drawImage(canvas, 0, 0);
  }
  return new Promise((resolve, reject) =>
    source.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo codificar la imagen"))), mime, quality)
  );
}

// Comprime una imagen. Si el resultado pesa más que el original y no se
// cambió ni formato ni tamaño, devuelve el original (comprimir de nuevo una
// foto ya optimizada a veces la agranda).
export async function compressImage(file, { quality = 0.8, maxSide = null, format = "auto" } = {}) {
  const mime = resolveOutputMime(file.type, format);
  const { canvas, ctx, bitmap, width, height } = await decodeImage(file, maxSide);
  const resized = width !== bitmap.width || height !== bitmap.height;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.(); // libera memoria (después de esto bitmap.width vale 0)
  const blob = await encodeCanvas(canvas, mime, supportsQuality(mime) ? quality : undefined);

  // Safari no sabe codificar WEBP y entrega PNG sin avisar: se usa el
  // formato real del resultado para que la extensión sea la correcta.
  const actualMime = blob.type || mime;

  const sameShape = actualMime === file.type && !resized;
  if (blob.size >= file.size && sameShape) {
    return { blob: file, mime: file.type, width, height, keptOriginal: true };
  }
  return { blob, mime: actualMime, width, height, keptOriginal: false };
}
