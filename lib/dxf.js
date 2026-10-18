// ============================================
// IMAGEN → DXF (vectorización de siluetas)
// ============================================
// Pasos:
//   1. toBinary:      cada píxel es "forma" o "fondo" (umbral automático Otsu;
//                     lo transparente siempre es fondo).
//   2. traceContours: recorre el borde entre forma y fondo siguiendo las aristas
//                     de los píxeles. Cada contorno sale CERRADO; los agujeros
//                     (el interior de una "O") son contornos aparte.
//   3. suavizar:      smoothStaircase pasa la línea por el medio de los
//                     escalones de píxel; luego Douglas-Peucker deja solo los
//                     puntos necesarios, conservando las esquinas reales.
//   4. toDxf:         escribe POLYLINEs cerradas en DXF R12 (el formato que
//                     abre cualquier versión de AutoCAD, LibreCAD, Inkscape,
//                     programas de corte láser y CNC).
// Todo es puro (sin DOM) para poder probarlo con Jest.

// ---------- 1. Binarizar ----------

// Umbral de Otsu: el brillo que mejor separa dos grupos (forma y fondo).
export function otsuThreshold(histogram, total) {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * histogram[i];
    const diff = sumB / wB - (sum - sumB) / wF;
    const between = wB * wF * diff * diff;
    if (between > best) { best = between; threshold = i; }
  }
  return threshold;
}

// Qué se considera "forma":
//   "auto":  si la imagen tiene fondo transparente (≥5% de píxeles), lo visible;
//            si no, lo oscuro.
//   "dark":  lo oscuro (dibujo negro sobre fondo blanco).
//   "light": lo claro (logo blanco sobre fondo negro).
export const SHAPE_MODES = [
  { id: "auto", label: "Automático" },
  { id: "dark", label: "Lo oscuro" },
  { id: "light", label: "Lo claro" },
];

// RGBA → Uint8Array (1 = forma, 0 = fondo). Lo transparente siempre es fondo.
export function toBinary(data, width, height, { shape = "auto", threshold = null } = {}) {
  const n = width * height;
  const lum = new Uint8Array(n);
  const opaque = new Uint8Array(n);
  const histogram = new Array(256).fill(0);
  let counted = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (data[i + 3] < 128) continue;
    opaque[p] = 1;
    // Luminancia percibida (el verde pesa más que el azul).
    lum[p] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    histogram[lum[p]]++;
    counted++;
  }

  const out = new Uint8Array(n);
  if (shape === "auto" && counted <= n * 0.95) {
    out.set(opaque); // PNG con fondo transparente: la forma es lo visible
    return out;
  }
  const t = threshold ?? otsuThreshold(histogram, counted);
  const wantDark = shape !== "light";
  for (let p = 0; p < n; p++) {
    if (opaque[p] && (lum[p] <= t) === wantDark) out[p] = 1;
  }
  return out;
}

// ---------- 2. Contornos ----------

// Direcciones en coordenadas de pantalla (y hacia abajo):
// 0 = derecha, 1 = abajo, 2 = izquierda, 3 = arriba.
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

// Devuelve una lista de contornos cerrados; cada uno es un arreglo de esquinas
// de píxel [x0, y0, x1, y1, ...] (sin repetir el primer punto al final).
// Los contornos exteriores giran en sentido horario y los agujeros al revés.
export function traceContours(bin, width, height) {
  const W = width + 1; // las esquinas forman una cuadrícula de (w+1)×(h+1)
  const out = new Uint8Array(W * (height + 1)); // bits = aristas que salen de cada esquina
  const isOn = (x, y) => x >= 0 && y >= 0 && x < width && y < height && bin[y * width + x] === 1;

  // Cada lado de un píxel de forma que da al fondo es una arista, orientada
  // para que la forma quede siempre a la derecha.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!bin[y * width + x]) continue;
      if (!isOn(x, y - 1)) out[y * W + x] |= 1 << 0;             // arriba:    (x,y) → (x+1,y)
      if (!isOn(x + 1, y)) out[y * W + x + 1] |= 1 << 1;         // derecha:   (x+1,y) → (x+1,y+1)
      if (!isOn(x, y + 1)) out[(y + 1) * W + x + 1] |= 1 << 2;   // abajo:     (x+1,y+1) → (x,y+1)
      if (!isOn(x - 1, y)) out[(y + 1) * W + x] |= 1 << 3;       // izquierda: (x,y+1) → (x,y)
    }
  }

  const contours = [];
  for (let start = 0; start < out.length; start++) {
    while (out[start]) {
      let v = start;
      let dir = 31 - Math.clz32(out[start] & -out[start]); // primera arista libre
      const pts = [];
      let prevDir = -1;
      do {
        out[v] &= ~(1 << dir);
        // Solo se guardan los vértices donde cambia la dirección.
        if (dir !== prevDir) pts.push(v % W, (v / W) | 0);
        prevDir = dir;
        v += DX[dir] + DY[dir] * W;
        if (v === start) break;
        // En una esquina compartida por dos píxeles en diagonal hay dos
        // salidas: se prefiere girar a la derecha (los separa).
        const m = out[v];
        const right = (dir + 1) & 3, left = (dir + 3) & 3;
        dir = m & (1 << right) ? right : m & (1 << dir) ? dir : left;
        if (!(m & (1 << dir))) break; // no debería pasar; evita un bucle infinito
      } while (true);
      // El primer punto puede ser colineal con el último tramo: se quita.
      if (pts.length >= 6 && collinear(pts, pts.length - 2, 0, 2)) pts.splice(0, 2);
      if (pts.length >= 6) contours.push(pts);
    }
  }
  return contours;
}

function collinear(pts, a, b, c) {
  const n = pts.length;
  const [ax, ay] = [pts[a % n], pts[(a + 1) % n]];
  const [bx, by] = [pts[b % n], pts[(b + 1) % n]];
  const [cx, cy] = [pts[c % n], pts[(c + 1) % n]];
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax) === 0;
}

// Área con signo (fórmula del cordón). Positiva = horario en pantalla.
export function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    a += pts[i] * pts[j + 1] - pts[j] * pts[i + 1];
  }
  return a / 2;
}

// ---------- 3. Suavizar y simplificar ----------

// Quita el efecto "escalera" antes de simplificar. En un borde inclinado los
// píxeles forman escalones de 1 px, y la línea real pasa por el MEDIO de esos
// escalones, no por sus esquinas. Por eso:
//   - de cada tramo de 1 px se toma su punto medio;
//   - una esquina se conserva solo si sus dos tramos son largos (≥ 2 px):
//     es una esquina de verdad (la de un cuadrado), no un escalón.
export function smoothStaircase(pts) {
  const n = pts.length / 2;
  const len = (i) => {
    const j = (i + 1) % n;
    return Math.abs(pts[2 * j] - pts[2 * i]) + Math.abs(pts[2 * j + 1] - pts[2 * i + 1]);
  };
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = len((i + n - 1) % n), cur = len(i);
    if (prev >= 2 && cur >= 2) out.push(pts[2 * i], pts[2 * i + 1]);
    if (cur === 1) {
      const j = (i + 1) % n;
      out.push((pts[2 * i] + pts[2 * j]) / 2, (pts[2 * i + 1] + pts[2 * j + 1]) / 2);
    }
  }
  return out.length >= 6 ? out : pts.slice();
}

// Douglas-Peucker sobre un polígono cerrado. tolerance en píxeles: con ~1 los
// escalones de píxel se vuelven líneas diagonales limpias.
export function simplifyClosed(pts, tolerance) {
  const n = pts.length / 2;
  if (n <= 4 || tolerance <= 0) return pts.slice();
  // Se corta el anillo en el punto 0 y en el más lejano a él.
  let far = 0, farD = -1;
  for (let i = 1; i < n; i++) {
    const d = (pts[2 * i] - pts[0]) ** 2 + (pts[2 * i + 1] - pts[1]) ** 2;
    if (d > farD) { farD = d; far = i; }
  }
  const keep = new Uint8Array(n);
  keep[0] = keep[far] = 1;
  dp(pts, 0, far, tolerance * tolerance, keep, n);
  dp(pts, far, n, tolerance * tolerance, keep, n);
  const result = [];
  for (let i = 0; i < n; i++) if (keep[i]) result.push(pts[2 * i], pts[2 * i + 1]);
  return result;
}

// Versión iterativa (con pila) para no desbordar con contornos enormes.
function dp(pts, first, last, tol2, keep, n) {
  const stack = [[first, last]];
  while (stack.length) {
    const [a, b] = stack.pop();
    if (b - a < 2) continue;
    const ax = pts[2 * a], ay = pts[2 * a + 1];
    const bx = pts[2 * (b % n)], by = pts[2 * (b % n) + 1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let maxD = -1, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const px = pts[2 * i] - ax, py = pts[2 * i + 1] - ay;
      // Distancia al segmento (o al punto, si a y b coinciden).
      const d = len2 === 0 ? px * px + py * py : (px * dy - py * dx) ** 2 / len2;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > tol2) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
}

// ---------- Todo junto ----------

// Imagen RGBA → contornos simplificados, sin las manchas más pequeñas que minArea (px²).
export function vectorize(data, width, height, { tolerance = 1, minArea = 4, shape = "auto", threshold = null } = {}) {
  const bin = toBinary(data, width, height, { shape, threshold });
  return traceContours(bin, width, height)
    .filter((c) => Math.abs(polygonArea(c)) >= minArea)
    .map((c) => simplifyClosed(smoothStaircase(c), tolerance))
    .filter((c) => c.length >= 6);
}

// ---------- 4. DXF y vista previa ----------

// scale: unidades de dibujo por píxel (p. ej. mm por píxel).
// La Y se invierte: en la imagen crece hacia abajo y en CAD hacia arriba.
export function toDxf(contours, height, scale = 1) {
  const fmt = (v) => Number(v.toFixed(4)).toString();
  const lines = [];
  const add = (...pairs) => { for (let i = 0; i < pairs.length; i += 2) lines.push(String(pairs[i]), String(pairs[i + 1])); };

  let maxX = 0;
  for (const c of contours) for (let i = 0; i < c.length; i += 2) maxX = Math.max(maxX, c[i]);

  add(0, "SECTION", 2, "HEADER",
      9, "$ACADVER", 1, "AC1009",
      9, "$INSUNITS", 70, 4,                         // 4 = milímetros
      9, "$EXTMIN", 10, 0, 20, 0, 30, 0,
      9, "$EXTMAX", 10, fmt(maxX * scale), 20, fmt(height * scale), 30, 0,
      0, "ENDSEC",
      0, "SECTION", 2, "ENTITIES");
  for (const c of contours) {
    // 70 = 1 → polilínea cerrada. 66 = 1 → le siguen vértices.
    add(0, "POLYLINE", 8, "0", 66, 1, 10, 0, 20, 0, 30, 0, 70, 1);
    for (let i = 0; i < c.length; i += 2) {
      add(0, "VERTEX", 8, "0", 10, fmt(c[i] * scale), 20, fmt((height - c[i + 1]) * scale), 30, 0);
    }
    add(0, "SEQEND", 8, "0");
  }
  add(0, "ENDSEC", 0, "EOF");
  return lines.join("\n") + "\n";
}

// Atributo "d" de un <path> SVG para la vista previa (fill-rule evenodd
// hace que los agujeros se vean vacíos).
export function toSvgPath(contours) {
  return contours
    .map((c) => {
      let d = `M${c[0]} ${c[1]}`;
      for (let i = 2; i < c.length; i += 2) d += `L${c[i]} ${c[i + 1]}`;
      return d + "Z";
    })
    .join("");
}

export const countVertices = (contours) => contours.reduce((n, c) => n + c.length / 2, 0);
