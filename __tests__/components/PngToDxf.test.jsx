import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PngToDxfPage from "../../pages/tools/png-to-dxf";

// jsdom no tiene canvas ni createImageBitmap: se simula la lectura de la imagen
// con un cuadrado negro de 20×20 sobre fondo blanco (40×40).
jest.mock("../../lib/image", () => ({
  decodeImage: async () => {
    const w = 40, h = 40;
    const data = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 10; y < 30; y++)
      for (let x = 10; x < 30; x++) data.set([0, 0, 0, 255], (y * w + x) * 4);
    return {
      ctx: { drawImage: () => {}, getImageData: () => ({ data }) },
      bitmap: { close: () => {} },
      width: w,
      height: h,
    };
  },
}));

beforeAll(() => {
  global.URL.createObjectURL = () => "blob:preview";
  global.URL.revokeObjectURL = () => {};
});

describe("PNG/JPG a DXF", () => {
  it("al subir una imagen muestra los contornos, las opciones y la descarga", async () => {
    const { container } = render(<PngToDxfPage standalone />);
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [new File(["x"], "logo.png", { type: "image/png" })] } });

    await waitFor(() => expect(screen.getByText(/1 contornos cerrados · 4 puntos/)).toBeInTheDocument());
    expect(screen.getByText("Descargar logo.dxf")).toBeInTheDocument();
    // Vista previa: un path SVG con el cuadrado.
    expect(container.querySelector("svg path[fill-rule='evenodd']").getAttribute("d")).toMatch(/^M\d+ \d+(L\d+ \d+){3}Z$/);

    // Cambiar el ancho a 80 mm → 2 mm por píxel → alto 80 mm.
    fireEvent.change(screen.getByDisplayValue("40"), { target: { value: "80" } });
    expect(screen.getByText(/Alto resultante: 80\.0 mm/)).toBeInTheDocument();

    // "Lo claro" toma el fondo blanco como forma: el contorno pasa a ser el marco.
    fireEvent.click(screen.getByText("Lo claro"));
    await waitFor(() => expect(screen.getByText(/2 contornos cerrados/)).toBeInTheDocument());
  });
});
