/**
 * @jest-environment node
 */
import {
  fitWithin, resolveOutputMime, supportsQuality, extensionFor,
  hexToRgb, rgbToHex, guessBackgroundColor, removeBackground,
} from "../../lib/image";

// Crea una imagen RGBA de w×h a partir de una función (x, y) => [r, g, b].
function makeImage(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  return data;
}
const alphaAt = (data, w, x, y) => data[(y * w + x) * 4 + 3];

describe("fitWithin", () => {
  it("conserva el tamaño si ya cabe o si no hay límite", () => {
    expect(fitWithin(800, 600, 1920)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(4000, 3000, null)).toEqual({ width: 4000, height: 3000 });
  });
  it("reduce por el lado mayor manteniendo proporción", () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(1000, 4000, 1000)).toEqual({ width: 250, height: 1000 });
  });
});

describe("formatos", () => {
  it("auto conserva JPG/PNG/WEBP y convierte lo demás a JPG", () => {
    expect(resolveOutputMime("image/png")).toBe("image/png");
    expect(resolveOutputMime("image/jpg")).toBe("image/jpeg");
    expect(resolveOutputMime("image/webp")).toBe("image/webp");
    expect(resolveOutputMime("image/gif")).toBe("image/jpeg");
    expect(resolveOutputMime("image/png", "image/webp")).toBe("image/webp");
  });
  it("solo JPG y WEBP tienen calidad ajustable", () => {
    expect(supportsQuality("image/jpeg")).toBe(true);
    expect(supportsQuality("image/webp")).toBe(true);
    expect(supportsQuality("image/png")).toBe(false);
  });
  it("extensiones", () => {
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/webp")).toBe("webp");
  });
});

describe("colores", () => {
  it("hex ↔ rgb", () => {
    expect(hexToRgb("#ff8000")).toEqual({ r: 255, g: 128, b: 0 });
    expect(rgbToHex(255, 128, 0)).toBe("#ff8000");
  });
  it("adivina el color de fondo por los bordes", () => {
    // Fondo verde con un cuadro rojo que toca la esquina superior izquierda.
    const data = makeImage(20, 20, (x, y) => (x < 3 && y < 3 ? [255, 0, 0] : [0, 200, 0]));
    expect(guessBackgroundColor(data, 20, 20)).toBe("#00c800");
  });
});

describe("removeBackground", () => {
  // 9×9 blanco, con un anillo negro (x/y entre 2 y 6) y su centro blanco.
  const W = 9;
  const ring = (x, y) => {
    const inSquare = x >= 2 && x <= 6 && y >= 2 && y <= 6;
    const inHole = x >= 4 && x <= 4 && y >= 4 && y <= 4;
    return inSquare && !inHole ? [0, 0, 0] : [255, 255, 255];
  };

  it("modo conectado: quita el fondo pero respeta el blanco encerrado", () => {
    const data = makeImage(W, W, ring);
    removeBackground(data, W, W, "#ffffff", 30, "connected");
    expect(alphaAt(data, W, 0, 0)).toBe(0);     // fondo
    expect(alphaAt(data, W, 2, 2)).toBe(255);   // anillo
    expect(alphaAt(data, W, 4, 4)).toBe(255);   // hueco interior: se conserva
  });

  it("modo todo: también quita el blanco encerrado", () => {
    const data = makeImage(W, W, ring);
    removeBackground(data, W, W, "#ffffff", 30, "all");
    expect(alphaAt(data, W, 4, 4)).toBe(0);
    expect(alphaAt(data, W, 2, 2)).toBe(255);
  });

  it("suaviza el borde con transparencia parcial", () => {
    // Fondo blanco, una columna gris claro (casi blanca) y el resto negro.
    const data = makeImage(5, 1, (x) => (x === 0 ? [255, 255, 255] : x === 1 ? [220, 220, 220] : [0, 0, 0]));
    // Distancia del gris al blanco ≈ 60.6. Con tolerancia 50 no se borra,
    // pero cae en la zona suave (hasta 75): queda semitransparente.
    removeBackground(data, 5, 1, "#ffffff", 50, "connected");
    const a = data[1 * 4 + 3];
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
  });

  it("imagen grande sin desbordar la pila", () => {
    const w = 1500, h = 1500;
    const data = makeImage(w, h, () => [255, 255, 255]);
    expect(removeBackground(data, w, h, "#ffffff", 10)).toBe(w * h);
  });
});
