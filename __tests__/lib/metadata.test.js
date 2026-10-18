/**
 * @jest-environment node
 */
import { stripJpegMetadata, stripPngMetadata, stripMetadata } from "../../lib/metadata";

const seg = (marker, content) => {
  const len = content.length + 2;
  return [0xff, marker, len >> 8, len & 255, ...content];
};
const str = (s) => [...s].map((c) => c.charCodeAt(0));

// EXIF (big endian) con Orientation = 6 y otra etiqueta (Make).
const exif = [
  ...str("Exif"), 0, 0,
  ...str("MM"), 0, 0x2a, 0, 0, 0, 8,
  0, 2,
  0x01, 0x0f, 0, 2, 0, 0, 0, 4, ...str("ACME"), // Make
  0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0,     // Orientation = 6
  0, 0, 0, 0,
];
const SCAN = [0xff, 0xda, 0, 4, 1, 2, 0x11, 0x22, 0x33, 0xff, 0xd9];

function buildJpeg({ withExif = true } = {}) {
  return Uint8Array.from([
    0xff, 0xd8,
    ...seg(0xe0, [...str("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]),
    ...(withExif ? seg(0xe1, exif) : []),
    ...seg(0xe1, str("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta/>")),
    ...seg(0xe2, [...str("ICC_PROFILE"), 0, 1, 1, 9, 9]),
    ...seg(0xed, str("Photoshop 3.0")),
    ...seg(0xfe, str("hola")),
    ...seg(0xee, str("Adobe")),
    ...SCAN,
  ]);
}

const has = (bytes, text) => Buffer.from(bytes).includes(Buffer.from(text));

describe("stripJpegMetadata", () => {
  it("quita EXIF, XMP, IPTC y comentarios y conserva JFIF, ICC, Adobe y la imagen", () => {
    const res = stripJpegMetadata(buildJpeg());
    const out = res.bytes;
    expect(has(out, "ACME")).toBe(false);
    expect(has(out, "xmpmeta")).toBe(false);
    expect(has(out, "Photoshop")).toBe(false);
    expect(has(out, "hola")).toBe(false);
    expect(has(out, "JFIF")).toBe(true);
    expect(has(out, "ICC_PROFILE")).toBe(true);
    expect(has(out, "Adobe")).toBe(true);
    // Los datos de imagen quedan idénticos al final del archivo.
    expect([...out.slice(-SCAN.length)]).toEqual(SCAN);
    expect(res.removed).toEqual(expect.arrayContaining(["EXIF (cámara, GPS, fecha)", "XMP", "Comentario"]));
  });

  it("conserva la orientación en un EXIF mínimo, justo después de JFIF", () => {
    const res = stripJpegMetadata(buildJpeg());
    expect(res.orientation).toBe(6);
    const out = res.bytes;
    const jfifEnd = 2 + 2 + 16;
    expect([out[jfifEnd], out[jfifEnd + 1]]).toEqual([0xff, 0xe1]);
    // El valor de orientación está en el EXIF nuevo (y nada más).
    expect(stripJpegMetadata(out).orientation).toBe(6);
    expect(has(out, "ACME")).toBe(false);
  });

  it("sin EXIF no agrega nada de orientación", () => {
    const res = stripJpegMetadata(buildJpeg({ withExif: false }));
    expect(res.orientation).toBe(1);
    expect(has(res.bytes, "Exif")).toBe(false);
  });

  it("devuelve null si no es un JPG", () => {
    expect(stripJpegMetadata(Uint8Array.from([1, 2, 3]))).toBeNull();
  });
});

describe("stripPngMetadata", () => {
  const chunk = (type, data) => [0, 0, 0, data.length, ...str(type), ...data, 0, 0, 0, 0];
  const png = Uint8Array.from([
    137, 80, 78, 71, 13, 10, 26, 10,
    ...chunk("IHDR", [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
    ...chunk("tEXt", str("Author\0Ana")),
    ...chunk("tIME", [7, 230, 1, 1, 0, 0, 0]),
    ...chunk("IDAT", [1, 2, 3]),
    ...chunk("IEND", []),
  ]);

  it("quita texto y fecha, conserva IHDR/IDAT/IEND", () => {
    const res = stripPngMetadata(png);
    expect(has(res.bytes, "Author")).toBe(false);
    expect(has(res.bytes, "tIME")).toBe(false);
    expect(has(res.bytes, "IHDR")).toBe(true);
    expect(has(res.bytes, "IDAT")).toBe(true);
    expect(has(res.bytes, "IEND")).toBe(true);
    expect(res.removed).toEqual(["Texto", "Fecha de modificación"]);
  });

  it("stripMetadata devuelve null para formatos no soportados", () => {
    expect(stripMetadata(png, "image/webp")).toBeNull();
    expect(stripMetadata(png, "image/png")).not.toBeNull();
  });
});
