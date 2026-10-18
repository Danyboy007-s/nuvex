import { useRouter } from "next/router";
import Layout from "../components/Layout";
import ToolSidebar from "../components/ToolSidebar";
import ToolRenderer from "../components/ToolRenderer";
import { findTool } from "../lib/tools";
import { useLocalStorage } from "../lib/useLocalStorage";

// Versiones anteriores guardaban el objeto completo ({ id, name, desc }) y
// ahora se guarda solo el id: se aceptan ambos.
function parseLastToolId(saved) {
  if (!saved || saved === "null") return null;
  try {
    return saved.startsWith("{") ? JSON.parse(saved).id : saved;
  } catch {
    return null;
  }
}

export default function ToolsPage() {
  const router = useRouter();
  const [lastToolValue, setLastToolValue] = useLocalStorage("nuvex-last-tool");

  // La herramienta abierta se calcula (no se guarda aparte), así siempre
  // coincide con la URL. Prioridad: ?tool=<id> (enlaces del inicio, de
  // Nuvex IA o compartidos) y, si no hay, la última que usó esta persona.
  // En export estático, router.query está vacío hasta que el router está listo.
  const selectedTool = router.isReady
    ? findTool(router.query.tool) || findTool(parseLastToolId(lastToolValue))
    : null;

  const handleSelectTool = (tool) => {
    setLastToolValue(tool.id);
    // Refleja la herramienta en la URL (sin recargar) para poder compartir el enlace.
    router.replace({ pathname: "/tools", query: { tool: tool.id } }, undefined, { shallow: true });
  };

  return (
    <Layout
      title={selectedTool ? `${selectedTool.name} | Nuvex` : "Todas las herramientas | Nuvex"}
      description="Todas las herramientas de Nuvex en un solo panel: PDF, compresor de imágenes, metadatos, fondos, DXF, texto y códigos QR. Gratis y en tu navegador."
      path="/tools"
      wide
    >
      <div className="flex flex-col md:flex-row">
        <ToolSidebar selectedToolId={selectedTool?.id} onSelectTool={handleSelectTool} />
        {/* Sin margen izquierdo: en escritorio el menú es sticky y ya ocupa su
            propio ancho dentro de la fila flex (y lo ajusta al colapsarse). */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 md:py-14">
            <ToolRenderer tool={selectedTool} />
          </div>
        </main>
      </div>
    </Layout>
  );
}
