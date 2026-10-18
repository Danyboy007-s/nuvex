// ============================================
// LIMPIEZA DE METADATOS SIN RECOMPRIMIR
// ============================================
// En vez de redibujar la imagen en un canvas (que recomprime y antes obligaba
// a guardar todo como PNG, mucho más pesado), aquí se recorren los bloques
// del archivo y se quitan los que contienen metadatos. La imagen en sí queda
// idéntica, bit a bit, y conserva su formato.
//
//   JPG: se quitan EXIF (cámara, GPS, fecha), XMP, IPTC/Photoshop y comentarios.
//        Se conservan JFIF, el perfil de color ICC y el bloque Adobe (necesarios
//        para que los colores se vean igual). La orientación se conserva en un
//        EXIF mínimo, para que las fotos de celular no salgan giradas.
//   PNG: se quitan los bloques de texto (tEXt, zTXt, iTXt), EXIF (eXIf) y la
//        fecha (tIME).
//   Otros formatos (WEBP, etc.): devuelve null y la página usa el canvas.

const ascii = (bytes, start, len) => String.fromCharCode(...bytes.subarray(start, start + len));

// ---------- JPG ----------

// Lee la orientación (1-8) de un bloque APP1 EXIF, o 1 si no hay.
function readExifOrientation(seg) {
  // seg empieza en el contenido del APP1: "Exif\0\0" + cabecera TIFF.
  if (ascii(seg, 0, 4) !== "Exif") return 1;
  const t = 6; // inicio de TIFF
  const little = seg[t] === 0x49; // "II" = little endian, "MM" = big endian
  const u16 = (o) => (little ? seg[t + o] | (seg[t + o + 1] << 8) : (seg[t + o] << 8) | seg[t + o + 1]);
  const u32 = (o) => (little
    ? (seg[t + o] | (seg[t + o + 1] << 8) | (seg[t + o + 2] << 16)) + seg[t + o + 3] * 2 ** 24
    : seg[t + o] * 2 ** 24 + ((seg[t + o + 1] << 16) | (seg[t + o + 2] << 8) | seg[t + o + 3]));
  try {
    const ifd = u32(4);
    const n = u16(ifd);
    for (let k = 0; k < n; k++) {
      const e = ifd + 2 + k * 12;
      if (u16(e) === 0x0112) { // etiqueta Orientation
        const v = u16(e + 8);
        return v >= 1 && v <= 8 ? v : 1;
      }
    }
  } catch { /* EXIF dañado: se ignora */ }
  return 1;
}

// Segmento APP1 con un EXIF que solo contiene la orientación (32 bytes).
function orientationOnlyApp1(orientation) {
  const body = [
    0x45, 0x78, 0x69, 0x66, 0, 0,     // "Exif\0\0"
    0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8,  // TIFF big endian, IFD0 en el byte 8
    0, 1,                             // 1 entrada
    0x01, 0x12, 0, 3, 0, 0, 0, 1,     // Orientation, tipo SHORT, 1 valor
    0, orientation, 0, 0,             // valor (relleno a 4 bytes)
    0, 0, 0, 0,                       // no hay más IFDs
  ];
  const len = body.length + 2;
  return [0xff, 0xe1, len >> 8, len & 255, ...body];
}

export function stripJpegMetadata(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const out = [];
  const removed = new Set();
  let orientation = 1;
  let pos = 2;
  out.push(bytes.subarray(0, 2)); // SOI

  while (pos < bytes.length) {
    if (bytes[pos] !== 0xff) return null; // estructura inesperada: no tocar
    const marker = bytes[pos + 1];
    if (marker === 0xff) { pos++; continue; } // byte de relleno

    // Inicio de los datos de imagen: lo que sigue se copia tal cual.
    if (marker === 0xda) { out.push(bytes.subarray(pos)); break; }

    // Marcadores sin longitud.
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      out.push(bytes.subarray(pos, pos + 2)); pos += 2; continue;
    }
    if (marker === 0xd9) { out.push(bytes.subarray(pos, pos + 2)); break; }

    const len = (bytes[pos + 2] << 8) | bytes[pos + 3];
    const end = pos + 2 + len;
    if (len < 2 || end > bytes.length) return null;
    const content = bytes.subarray(pos + 4, end);

    let drop = false;
    if (marker === 0xe1) {
      drop = true;
      if (ascii(content, 0, 4) === "Exif") {
        removed.add("EXIF (cámara, GPS, fecha)");
        orientation = readExifOrientation(content);
      } else {
        removed.add("XMP");
      }
    } else if (marker === 0xed) {
      drop = true; removed.add("IPTC / Photoshop");
    } else if (marker === 0xfe) {
      drop = true; removed.add("Comentario");
    } else if (marker === 0xe2 && ascii(content, 0, 11) !== "ICC_PROFILE") {
      drop = true; removed.add("Otros (APP2)");
    } else if (marker >= 0xe3 && marker <= 0xef && marker !== 0xee) {
      // APP3..APP15 salvo APP14 (Adobe, define cómo interpretar los colores)
      drop = true; removed.add(`Otros (APP${marker - 0xe0})`);
    }

    if (!drop) out.push(bytes.subarray(pos, end));
    pos = end;
  }

  // La orientación se reinserta justo después de SOI/JFIF.
  if (orientation !== 1) {
    const insertAt = out.length > 1 && out[1][1] === 0xe0 ? 2 : 1;
    out.splice(insertAt, 0, Uint8Array.from(orientationOnlyApp1(orientation)));
  }
  return { bytes: concat(out), removed: [...removed], orientation };
}

// ---------- PNG ----------

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_METADATA_CHUNKS = {
  tEXt: "Texto", zTXt: "Texto comprimido", iTXt: "Texto internacional / XMP",
  eXIf: "EXIF (cámara, GPS, fecha)", tIME: "Fecha de modificación",
};

export function stripPngMetadata(bytes) {
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  const out = [bytes.subarray(0, 8)];
  const removed = new Set();
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const len = ((bytes[pos] << 24) >>> 0) + (bytes[pos + 1] << 16) + (bytes[pos + 2] << 8) + bytes[pos + 3];
    const type = ascii(bytes, pos + 4, 4);
    const end = pos + 12 + len; // longitud + tipo + datos + CRC
    if (end > bytes.length) return null;
    if (PNG_METADATA_CHUNKS[type]) removed.add(PNG_METADATA_CHUNKS[type]);
    else out.push(bytes.subarray(pos, end));
    pos = end;
    if (type === "IEND") break;
  }
  return { bytes: concat(out), removed: [...removed], orientation: 1 };
}

// ---------- General ----------

// Devuelve { bytes, removed, orientation } o null si el formato no se soporta.
export function stripMetadata(bytes, mime) {
  if (mime === "image/jpeg" || mime === "image/jpg") return stripJpegMetadata(bytes);
  if (mime === "image/png") return stripPngMetadata(bytes);
  return null;
}

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
