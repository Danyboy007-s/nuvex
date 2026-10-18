/**
 * @jest-environment node
 */
import { answer, normalize, SUGGESTIONS } from "../../lib/assistant";
import { findTool } from "../../lib/tools";

describe("asistente local", () => {
  it("normaliza acentos y mayúsculas", () => {
    expect(normalize("Ubicación GPS, ¿Cómo?")).toBe("ubicacion gps   como ");
  });

  it.each([
    ["Quiero bajarle el peso a unas fotos", "file-utils"],
    ["unir dos PDF", "pdf-converter"],
    ["quitar el fondo de mi logo", "remove-bg"],
    ["borrar la ubicación de una foto", "remove-metadata"],
    ["necesito un archivo para corte láser", "png-to-dxf"],
    ["mi texto de ChatGPT suena robótico", "text-humanizer"],
    ["hacer un código QR para el wifi", "qr-generator"],
  ])("«%s» → %s", (text, toolId) => {
    expect(answer(text).toolIds[0]).toBe(toolId);
  });

  it("sin coincidencias responde con ayuda y sin herramientas", () => {
    const res = answer("hola, ¿cómo estás?");
    expect(res.toolIds).toEqual([]);
    expect(res.text).toMatch(/Todavía no sé/);
  });

  it("cada sugerencia de ejemplo lleva a una herramienta que existe", () => {
    for (const s of SUGGESTIONS) {
      const [id] = answer(s).toolIds;
      expect(findTool(id)).not.toBeNull();
    }
  });
});
