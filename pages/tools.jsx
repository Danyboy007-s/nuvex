import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import ToolSidebar from "../components/ToolSidebar";
import ToolRenderer from "../components/ToolRenderer";

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const lastTool = localStorage.getItem('nuvex-last-tool');
    if (lastTool && lastTool !== 'null') {
      try {
        const tool = JSON.parse(lastTool);
        setSelectedTool(tool);
      } catch (e) {}
    }
    
    // Leer estado del sidebar
    const saved = localStorage.getItem('nuvex-sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    localStorage.setItem('nuvex-last-tool', JSON.stringify(tool));
  };

  return (
    <Layout title="Nuvex Tools — herramientas de conversión">
      <div className="flex flex-col md:flex-row min-h-screen">
        <ToolSidebar selectedToolId={selectedTool?.id} onSelectTool={handleSelectTool} />
        <main className={`flex-1 min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'md:ml-0' : 'md:ml-64'}`}>
          <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            <ToolRenderer tool={selectedTool} />
          </div>
        </main>
      </div>
    </Layout>
  );
}