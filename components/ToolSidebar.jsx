import { useState, useEffect } from "react";
import Link from "next/link";

const toolCategories = [
  {
    name: "Conversión",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect width="7" height="7" x="3" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/>
        <rect width="7" height="7" x="3" y="14" rx="1"/>
      </svg>
    ),
    tools: [
      { id: "pdf-converter", name: "PDF Converter", desc: "Combina, extrae u optimiza PDFs" },
    ]
  },
  {
    name: "Imagen",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      </svg>
    ),
    tools: [
      { id: "file-utils", name: "Compresor", desc: "Reduce el peso de tus fotos" },
      { id: "remove-metadata", name: "Limpiar metadatos", desc: "Borra datos ocultos (GPS, cámara)" },
      { id: "remove-bg", name: "Eliminar fondo", desc: "Quita fondos de imágenes con IA" },
      { id: "png-to-dxf", name: "PNG/JPG a DXF", desc: "Convierte a DXF para AutoCAD" },
    ]
  },
  {
    name: "Texto y códigos",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M17 22h-1a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4h1"/>
        <path d="M7 22h1a4 4 0 0 0 4-4"/>
        <path d="M7 2h1a4 4 0 0 1 4 4"/>
      </svg>
    ),
    tools: [
      { id: "text-humanizer", name: "Humanizar", desc: "Quita lo robótico a la IA" },
      { id: "qr-generator", name: "Generador QR", desc: "Crea códigos con logo y color" },
    ]
  }
];

export default function ToolSidebar({ selectedToolId, onSelectTool }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('nuvex-sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('nuvex-sidebar-collapsed', newState);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
      if (window.innerWidth < 1024 && !sidebarCollapsed) {
        setSidebarCollapsed(true);
        localStorage.setItem('nuvex-sidebar-collapsed', 'true');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarCollapsed]);

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center"
      >
        {mobileOpen ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 5h16M4 12h16M4 19h16"/>
          </svg>
        )}
      </button>

      <aside className={`
        fixed md:sticky top-0 left-0 z-40
        transition-all duration-300 ease-out
        bg-[var(--surface)]/95
        backdrop-blur-sm
        border-r border-[var(--border)]
        overflow-y-auto
        flex flex-col
        ${sidebarCollapsed ? 'w-12' : 'w-64'}
        ${mobileOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full md:translate-x-0'}
      `}>
        {sidebarCollapsed ? (
          <div className="py-4 flex flex-col items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
              title="Expandir menú"
            >
              <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
            <div className="w-6 h-px bg-[var(--border)]" />
            {toolCategories.map((category) => (
              <div key={category.name} className="group relative">
                <div className="p-2">
                  {category.icon}
                </div>
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {category.name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 px-4 flex-1 flex flex-col">
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] tracking-wider text-[var(--text-tertiary)] uppercase mb-1">
                    Herramientas
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    NUVEX
                  </p>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                  title="Ocultar menú"
                >
                  <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-6 flex-1">
              {toolCategories.map((category) => (
                <div key={category.name}>
                  <div className="flex items-center gap-1.5 mb-2 px-2">
                    {category.icon}
                    <h3 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      {category.name}
                    </h3>
                  </div>
                  <div className="space-y-0.5">
                    {category.tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => { onSelectTool(tool); setMobileOpen(false); }}
                        className={`
                          group w-full text-left px-3 py-2 rounded-xl text-sm
                          transition-all duration-150
                          ${selectedToolId === tool.id 
                            ? 'bg-[var(--bg)] text-[var(--text-primary)] font-medium' 
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg)] hover:text-[var(--text-primary)]'
                          }
                        `}
                      >
                        <div className="flex flex-col">
                          <span>{tool.name}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">
                            {tool.desc}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-[var(--border)]">
              <Link href="/">
                <button className="w-full text-center py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:opacity-85 transition-all shadow-sm">
                  Volver al inicio
                </button>
              </Link>
              <p className="text-[9px] text-center text-[var(--text-tertiary)] mt-3 opacity-50">
                conversiones directas
              </p>
            </div>
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}