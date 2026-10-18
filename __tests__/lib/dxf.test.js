/**
 * @jest-environment node
 */
import {
  toBinary, traceContours, polygonArea, simplifyClosed, smoothStaircase, vectorize, toDxf, toSvgPath,
} from "../../lib/dxf";

// Imagen RGBA a partir de una función (x, y) → [r, g, b, a].
function makeImage(w, h, fn) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  return data;
}
const BLACK = [0, 0, 0, 255], WHITE = [255, 255, 255, 255], CLEAR = [0, 0, 0, 0];
const points = (c) => Array.from({ length: c.length / 2 }, (_, i) => [c[2 * i], c[2 * i + 1]]);

describe("toBinary", () => {
  it("lo oscuro es forma por defecto", () => {
    const data = makeImage(4, 1, (x) => (x < 2 ? BLACK : WHITE));
    expect([...toBinary(data, 4, 1)]).toEqual([1, 1, 0, 0]);
    expect([...toBinary(data, 4, 1, { shape: "light" })]).toEqual([0, 0, 1, 1]);
  });

  it("PNG con fondo transparente: la forma es lo visible, aunque sea negro sobre transparente", () => {
    // Antes, lo transparente (RGB 0,0,0) se tomaba como negro y todo salía relleno.
    const data = makeImage(10, 10, (x, y) => (x >= 3 && x < 7 && y >= 3 && y < 7 ? [30, 30, 30, 255] : CLEAR));
    const bin = toBinary(data, 10, 10);
    expect(bin.reduce((a, b) => a + b, 0)).toBe(16);
    expect(bin[0]).toBe(0);
  });
});

describe("traceContours", () => {
  it("un cuadrado da un solo contorno cerrado de 4 esquinas, en sentido horario", () => {
    const bin = toBinary(makeImage(6, 6, (x, y) => (x >= 1 && x < 4 && y >= 1 && y < 4 ? BLACK : WHITE)), 6, 6);
    const contours = traceContours(bin, 6, 6);
    expect(contours).toHaveLength(1);
    expect(points(contours[0]).sort()).toEqual([[1, 1], [1, 4], [4, 1], [4, 4]].sort());
    expect(polygonArea(contours[0])).toBe(9);
  });

  it("un anillo da contorno exterior y agujero, con orientaciones opuestas", () => {
    const ring = (x, y) => {
      const outer = x >= 1 && x < 8 && y >= 1 && y < 8;
      const hole = x >= 3 && x < 6 && y >= 3 && y < 6;
      return outer && !hole ? BLACK : WHITE;
    };
    const contours = traceContours(toBinary(makeImage(9, 9, ring), 9, 9), 9, 9);
    expect(contours).toHaveLength(2);
    const areas = contours.map(polygonArea).sort((a, b) => a - b);
    expect(areas).toEqual([-9, 49]);
  });

  it("dos píxeles que solo se tocan en diagonal quedan separados", () => {
    const bin = Uint8Array.from([1, 0, 0, 1]);
    expect(traceContours(bin, 2, 2)).toHaveLength(2);
  });

  it("forma que toca el borde de la imagen también se cierra", () => {
    const bin = new Uint8Array(9).fill(1);
    const [c] = traceContours(bin, 3, 3);
    expect(polygonArea(c)).toBe(9);
  });

  it("figuras aleatorias: el área total coincide con los píxeles", () => {
    for (let k = 0; k < 200; k++) {
      const w = 12, h = 10;
      const bin = Uint8Array.from({ length: w * h }, () => (Math.random() < 0.5 ? 1 : 0));
      const total = traceContours(bin, w, h).reduce((s, c) => s + polygonArea(c), 0);
      expect(total).toBe(bin.reduce((a, b) => a + b, 0));
    }
  });
});

describe("simplifyClosed", () => {
  it("los escalones de una diagonal se vuelven una línea recta", () => {
    // Triángulo rectángulo en escalera de 40 px.
    const n = 40;
    const bin = toBinary(makeImage(n + 2, n + 2, (x, y) => (x >= 1 && y >= 1 && x <= n && y <= n && x <= y ? BLACK : WHITE)), n + 2, n + 2);
    const [c] = traceContours(bin, n + 2, n + 2);
    expect(c.length / 2).toBeGreaterThan(70); // ~2 vértices por escalón
    const simple = simplifyClosed(c, 1);
    expect(simple.length / 2).toBeLessThanOrEqual(4);
  });

  it("con tolerancia 0 no cambia nada", () => {
    const c = [0, 0, 5, 0, 5, 5, 0, 5, 0, 3];
    expect(simplifyClosed(c, 0)).toEqual(c);
  });
});

describe("smoothStaircase", () => {
  it("conserva las esquinas de un cuadrado", () => {
    const sq = [0, 0, 10, 0, 10, 10, 0, 10];
    expect(smoothStaircase(sq)).toEqual(sq);
  });
  it("en una escalera usa el medio de cada escalón (puntos sobre la línea real)", () => {
    // Escalera 3 a la derecha / 1 abajo, cerrada por abajo con tramos largos.
    const stairs = [0, 0, 3, 0, 3, 1, 6, 1, 6, 2, 9, 2, 9, 9, 0, 9];
    const out = smoothStaircase(stairs);
    expect(out).toEqual(expect.arrayContaining([3, 0.5, 6, 1.5]));
    // Las esquinas de los escalones ya no están.
    const pts = Array.from({ length: out.length / 2 }, (_, i) => `${out[2 * i]},${out[2 * i + 1]}`);
    expect(pts).not.toContain("3,1");
    expect(pts).not.toContain("6,1");
  });
});

describe("vectorize + toDxf", () => {
  const img = makeImage(20, 10, (x, y) => (x >= 2 && x < 8 && y >= 2 && y < 8 ? BLACK : x === 15 && y === 5 ? BLACK : WHITE));

  it("descarta manchas más chicas que minArea", () => {
    expect(vectorize(img, 20, 10, { minArea: 4 })).toHaveLength(1);
    expect(vectorize(img, 20, 10, { minArea: 1 })).toHaveLength(2);
  });

  it("escribe polilíneas cerradas R12, con Y invertida y escala", () => {
    const contours = vectorize(img, 20, 10);
    const dxf = toDxf(contours, 10, 0.5);
    const lines = dxf.trim().split("\n");
    expect(lines.slice(0, 2)).toEqual(["0", "SECTION"]);
    expect(dxf).toContain("$ACADVER\n1\nAC1009");
    expect(lines.slice(-2)).toEqual(["0", "EOF"]);
    expect(dxf.match(/^POLYLINE$/gm)).toHaveLength(1);
    expect(dxf.match(/^VERTEX$/gm)).toHaveLength(4);
    expect(dxf).toContain("70\n1\n");          // cerrada
    expect(dxf).not.toMatch(/^70\n32$/m);     // ya no marca vértices 3D
    // La esquina (2,2) de la imagen → (1, 4) en CAD: x·0.5, (10−2)·0.5.
    expect(dxf).toMatch(/10\n1\n20\n4\n/);
    // Todo par código/valor: número de líneas par.
    expect(lines.length % 2).toBe(0);
  });

  it("toSvgPath dibuja cada contorno cerrado", () => {
    expect(toSvgPath([[0, 0, 2, 0, 2, 2]])).toBe("M0 0L2 0L2 2Z");
  });
});
