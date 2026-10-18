import { TOOL_CATEGORIES, TOOL_LOADERS, findTool } from "../../lib/tools";

const menuIds = TOOL_CATEGORIES.flatMap((c) => c.tools.map((t) => t.id));

describe("registro de herramientas (lib/tools.js)", () => {
  it("cada herramienta del menú tiene su loader, y no sobran loaders", () => {
    expect([...menuIds].sort()).toEqual(Object.keys(TOOL_LOADERS).sort());
  });

  it("no hay ids repetidos", () => {
    expect(new Set(menuIds).size).toBe(menuIds.length);
  });

  it("findTool encuentra por id y devuelve null si no existe", () => {
    expect(findTool("qr-generator").name).toBe("Generador QR");
    expect(findTool("no-existe")).toBeNull();
    expect(findTool(undefined)).toBeNull();
  });
});
