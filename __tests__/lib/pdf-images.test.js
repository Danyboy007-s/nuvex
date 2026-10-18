/**
 * @jest-environment node
 */
import { deflateSync } from "node:zlib";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { findRecompressibleImages, recompressImages, looksLikePhoto, IMAGE_LEVELS } from "../../lib/pdf";

// Registra una imagen en el PDF con el diccionario indicado y devuelve su ref.
function addImage(doc, bytes, dict) {
  return doc.context.register(doc.context.stream(bytes, { Type: "XObject", Subtype: "Image", BitsPerComponent: 8, ...dict }));
}

const noise = (n) => Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256));

// Códec falso: jsdom/node no tienen canvas. "Codifica" devolviendo 100 bytes.
const fakeCodec = {
  decodeJpeg: async () => ({}),
  fromPixels: async () => ({}),
  encodeJpeg: async () => new Uint8Array(100),
};

async function buildPdf() {
  const doc = await PDFDocument.create();
  const refs = {};
  const bigJpeg = new Uint8Array(50000).fill(7);
  refs.mask = addImage(doc, deflateSync(noise(4000 * 2000 / 100)), { Width: 400, Height: 500, ColorSpace: "DeviceGray", Filter: "FlateDecode" });
  refs.jpeg = addImage(doc, bigJpeg, { Width: 4000, Height: 2000, ColorSpace: "DeviceRGB", Filter: "DCTDecode" });
  doc.context.lookup(refs.jpeg).dict.set(PDFName.of("SMask"), refs.mask);
  refs.cmyk = addImage(doc, bigJpeg, { Width: 100, Height: 100, ColorSpace: "DeviceCMYK", Filter: "DCTDecode" });
  refs.photo = addImage(doc, deflateSync(noise(300 * 200 * 3)), { Width: 300, Height: 200, ColorSpace: "DeviceRGB", Filter: "FlateDecode" });
  refs.flat = addImage(doc, deflateSync(new Uint8Array(300 * 200 * 3).fill(255)), { Width: 300, Height: 200, ColorSpace: "DeviceRGB", Filter: "FlateDecode" });
  refs.bilevel = addImage(doc, bigJpeg, { Width: 100, Height: 100, ColorSpace: "DeviceGray", Filter: "CCITTFaxDecode", BitsPerComponent: 1 });
  return { doc, refs };
}

describe("looksLikePhoto", () => {
  it("ruido = foto; color plano o pocos tonos = no", () => {
    expect(looksLikePhoto(noise(300 * 200 * 3), 3)).toBe(true);
    expect(looksLikePhoto(new Uint8Array(300 * 200 * 3).fill(200), 3)).toBe(false);
    expect(looksLikePhoto(Uint8Array.from({ length: 30000 }, (_, i) => (i % 4) * 60), 1)).toBe(false);
  });
});

describe("findRecompressibleImages", () => {
  it("toma JPG RGB e imágenes sin pérdida; deja CMYK, 1 bit y máscaras", async () => {
    const { doc, refs } = await buildPdf();
    const found = findRecompressibleImages(doc).map((i) => i.ref.toString());
    expect(found).toEqual(expect.arrayContaining([refs.jpeg.toString(), refs.photo.toString(), refs.flat.toString()]));
    expect(found).not.toContain(refs.cmyk.toString());
    expect(found).not.toContain(refs.bilevel.toString());
    expect(found).not.toContain(refs.mask.toString());
  });
});

describe("recompressImages", () => {
  it("reduce a la resolución elegida, conserva la máscara y no toca lo que no conviene", async () => {
    const { doc, refs } = await buildPdf();
    const level = IMAGE_LEVELS.find((l) => l.id === "screen"); // 1754 px
    const result = await recompressImages(doc, level, { codec: fakeCodec });

    expect(result.replaced).toBe(2); // el JPG grande y la imagen tipo foto
    const jpeg = doc.context.lookup(refs.jpeg);
    expect(jpeg).toBeInstanceOf(PDFRawStream);
    expect(jpeg.dict.lookup(PDFName.of("Width")).asNumber()).toBe(1754);
    expect(jpeg.dict.lookup(PDFName.of("Height")).asNumber()).toBe(877);
    expect(jpeg.dict.lookup(PDFName.of("Filter"))).toBe(PDFName.of("DCTDecode"));
    expect(jpeg.dict.get(PDFName.of("SMask"))).toBe(refs.mask);

    // La imagen de color plano no parece foto: sigue sin pérdida.
    expect(doc.context.lookup(refs.flat).dict.lookup(PDFName.of("Filter"))).toBe(PDFName.of("FlateDecode"));
    // La foto sin pérdida pasó a JPG con su tamaño (300 < 1754, no se agranda).
    const photo = doc.context.lookup(refs.photo);
    expect(photo.dict.lookup(PDFName.of("Filter"))).toBe(PDFName.of("DCTDecode"));
    expect(photo.dict.lookup(PDFName.of("Width")).asNumber()).toBe(300);

    // El PDF se puede guardar y volver a abrir.
    const reopened = await PDFDocument.load(await doc.save());
    expect(reopened).toBeTruthy();
  });

  it("si la versión nueva no es más liviana, deja la original", async () => {
    const { doc, refs } = await buildPdf();
    const before = doc.context.lookup(refs.jpeg);
    const heavyCodec = { ...fakeCodec, encodeJpeg: async () => new Uint8Array(10_000_000) };
    const result = await recompressImages(doc, IMAGE_LEVELS[0], { codec: heavyCodec });
    expect(result.replaced).toBe(0);
    expect(doc.context.lookup(refs.jpeg)).toBe(before);
  });
});
