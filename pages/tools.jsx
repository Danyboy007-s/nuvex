import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import ToolSidebar from "../components/ToolSidebar";
import ToolRenderer from "../components/ToolRenderer";

export default function ToolsPage() {
  const [selectedTool, setSelectedTool] = useState(null);

  useEffect(() => {
    const lastTool = localStorage.getItem('nuvex-last-tool');
    if (lastTool && lastTool !== 'null') {
      try {
        const tool = JSON.parse(lastTool);
        setSelectedTool(tool);
      } catch (e) {}
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
        <main className="flex-1 md:ml-64 min-h-screen">
          <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            <ToolRenderer tool={selectedTool} />
          </div>
        </main>
      </div>
    </Layout>
  );
}