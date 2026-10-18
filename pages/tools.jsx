import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import ToolSidebar from "../components/ToolSidebar";
import ToolRenderer from "../components/ToolRenderer";
import { findTool } from "../lib/tools";

const LAST_TOOL_KEY = "nuvex-last-tool";

// Lee la última herramienta usada. Versiones anteriores guardaban el objeto
// completo ({ id, name, desc }) y ahora se guarda solo el id: se aceptan ambos.
function readLastToolId() {
  try {
    const saved = localStorage.getItem(LAST_TOOL_KEY);
    if (!saved || saved === "null") return null;
    if (saved.startsWith("{")) return JSON.parse(saved).id;
    return saved;
  } catch {
    return null;
  }
}

export default function ToolsPage() {
  const router = useRouter();
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    // En export estático, router.query está vacío hasta que el router está listo.
    if (!router.isReady) return;

    // Prioridad: ?tool=<id> en la URL (enlaces del inicio o compartidos),
    // y si no, la última herramienta que usó esta persona.
    const tool = findTool(router.query.tool) || findTool(readLastToolId());
    if (tool) setSelectedTool(tool);
    // Se repite si cambia ?tool= (por ejemplo, al abrir una herramienta desde Nuvex IA).
  }, [router.isReady, router.query.tool]);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    localStorage.setItem(LAST_TOOL_KEY, tool.id);
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
