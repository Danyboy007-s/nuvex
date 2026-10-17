/**
 * @jest-environment node
 */
// Entorno "node" (no jsdom) porque necesitamos File/Blob con .arrayBuffer() y .text().
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  A4,
  parsePageRanges,
  wrapText,
  sanitizeForFont,
  sniffImageType,
  addTextPages,
  addImagePage,
  embedImage,
  loadPdf,
  formatSize,
} from "../../lib/pdf";

// PNG de 1x1 píxel (el más pequeño válido), para probar imágenes sin archivos externos.
const PNG_1PX = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
));


describe("parsePageRanges", () => {
  it("interpreta páginas sueltas y rangos (numeración desde 1)", () => {
    expect(parsePageRanges("1,3,5-7", 10)).toEqual([0, 2, 4, 5, 6]);
  });

  it("acepta rangos al revés y quita duplicados", () => {
    expect(parsePageRanges("3-1, 2", 5)).toEqual([2, 1, 0]);
  });

  it("rechaza páginas fuera del documento", () => {
    expect(() => parsePageRanges("1,9", 5)).toThrow("no existe la página 9");
  });

  it("rechaza texto que no es un número", () => {
    expect(() => parsePageRanges("1,abc", 5)).toThrow('"abc"');
  });

  it("rechaza una entrada vacía", () => {
    expect(() => parsePageRanges("  ", 5)).toThrow();
  });
});

describe("texto", () => {
  let font;
  beforeAll(async () => {
    font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
  });

  it("conserva acentos y ñ, pero reemplaza emojis por ?", () => {
    expect(sanitizeForFont("Año ¿qué? 🚀", font)).toBe("Año ¿qué? ?");
  });

  it("ninguna línea supera el ancho máximo, ni siquiera con palabras larguísimas", () => {
    const text = "hola ".repeat(200) + "x".repeat(500);
    const lines = wrapText(text, font, 11, 200);
    expect(lines.length).toBeGreaterThan(10);
    lines.forEach((l) => expect(font.widthOfTextAtSize(l, 11)).toBeLessThanOrEqual(200));
  });

  it("respeta los saltos de línea originales", () => {
    expect(wrapText("uno\ndos\n\ntres", font, 11, 500)).toEqual(["uno", "dos", "", "tres"]);
  });

  it("un TXT largo genera varias páginas sin perder texto", async () => {
    const doc = await PDFDocument.create();
    const lines = Array.from({ length: 300 }, (_, i) => `Línea número ${i + 1} 😀`);
    await addTextPages(doc, new File([lines.join("\n")], "largo.txt", { type: "text/plain" }));
    // ~51 líneas por página A4 → 300 líneas necesitan 6 páginas.
    expect(doc.getPageCount()).toBe(6);
  });
});

describe("imágenes", () => {
  it("detecta el formato real por los bytes, no por la extensión", () => {
    expect(sniffImageType(PNG_1PX.buffer)).toBe("png");
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer)).toBe("jpg");
    expect(sniffImageType(new TextEncoder().encode("RIFF....WEBP").buffer)).toBe("other");
  });

  it("un PNG con extensión .jpg igual se incrusta bien en una página A4", async () => {
    const doc = await PDFDocument.create();
    const image = await embedImage(doc, new File([PNG_1PX], "foto.jpg", { type: "image/jpeg" }));
    addImagePage(doc, image);
    const { width, height } = doc.getPage(0).getSize();
    expect([width, height]).toEqual([A4.width, A4.height]);
  });
});

describe("loadPdf", () => {
  it("da un mensaje claro si el archivo no es un PDF", async () => {
    const fake = new File(["esto no es un pdf"], "roto.pdf", { type: "application/pdf" });
    await expect(loadPdf(fake)).rejects.toThrow('"roto.pdf" no es un PDF válido');
  });

  it("abre un PDF válido", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.addPage();
    const file = new File([await doc.save()], "ok.pdf", { type: "application/pdf" });
    expect((await loadPdf(file)).getPageCount()).toBe(2);
  });
});

it("formatSize muestra KB o MB según el tamaño", () => {
  expect(formatSize(2048)).toBe("2.0 KB");
  expect(formatSize(3 * 1024 * 1024)).toBe("3.00 MB");
});
