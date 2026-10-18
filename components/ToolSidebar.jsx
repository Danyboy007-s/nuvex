import { useState, useEffect } from "react";
import { TOOL_CATEGORIES, prefetchTool } from "../lib/tools";
import { ToolBadge } from "./toolVisuals";

// Menú lateral de /tools. En escritorio queda fijo debajo del encabezado
// (top-16) y se puede contraer a solo íconos; en celular es un panel que se
// abre con el botón de abajo a la derecha. Nuvex IA va primero, en violeta.
export default function ToolSidebar({ selectedToolId, onSelectTool }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("nuvex-sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("nuvex-sidebar-collapsed", String(!c));
      return !c;
    });
  };

  // En celular el menú siempre se muestra completo.
  const compact = collapsed && !mobileOpen;

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "var(--text-primary)", boxShadow: "var(--shadow-lg)" }}
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú de herramientas"}
      >
        <svg className="w-5 h-5" fill="none" stroke="var(--bg)" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
          {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h10" />}
        </svg>
      </button>

      <aside
        className={`
          fixed md:sticky top-0 md:top-16 left-0 z-40 h-screen md:h-[calc(100vh-4rem)] shrink-0
          bg-[var(--bg)] border-r border-[var(--border)] overflow-y-auto
          transition-all duration-300 ease-out
          ${compact ? "md:w-[76px]" : "w-72"}
          ${mobileOpen ? "translate-x-0 shadow-[var(--shadow-lg)]" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className={`py-6 ${compact ? "px-3" : "px-4"} flex flex-col gap-6 min-h-full`}>
          <div className={`flex items-center ${compact ? "justify-center" : "justify-between px-2"}`}>
            {!compact && <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Herramientas</p>}
            <button
              onClick={toggleCollapsed}
              className="hidden md:flex w-8 h-8 rounded-lg items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              title={compact ? "Expandir menú" : "Contraer menú"}
            >
              <svg className={`w-4 h-4 transition-transform duration-300 ${compact ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {TOOL_CATEGORIES.map((category) => (
            <div key={category.name}>
              {!compact && category.name !== "IA" && (
                <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{category.name}</p>
              )}
              <div className="space-y-1">
                {category.tools.map((tool) => {
                  const active = selectedToolId === tool.id;
                  const aiCard = tool.id === "assistant" && !compact; // tarjeta violeta completa
                  return (
                    <button
                      key={tool.id}
                      onClick={() => { onSelectTool(tool); setMobileOpen(false); }}
                      // Precarga el código al pasar el mouse o enfocar con teclado.
                      onMouseEnter={() => prefetchTool(tool.id)}
                      onFocus={() => prefetchTool(tool.id)}
                      title={compact ? tool.name : undefined}
                      className={`w-full flex items-center gap-3 rounded-2xl text-left transition-all duration-200
                        ${compact ? "justify-center p-2" : "p-2 pr-3"}
                        ${aiCard
                          ? `text-white hover:-translate-y-px ${active ? "ring-2 ring-offset-2 ring-offset-[var(--bg)] ring-[var(--ai)]" : ""}`
                          : active
                            ? "bg-[var(--surface)] shadow-[var(--shadow-md)]"
                            : "hover:bg-[var(--surface-hover)]"}`}
                      style={aiCard ? { background: "var(--ai)", boxShadow: "var(--shadow-ai)" } : undefined}
                    >
                      <ToolBadge id={tool.id} size={compact ? "md" : "sm"} background={aiCard ? "rgba(255,255,255,0.2)" : undefined} />
                      {!compact && (
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold truncate">{tool.name}</span>
                          <span className={`block text-xs truncate ${aiCard ? "text-white/75" : "text-[var(--text-tertiary)]"}`}>{tool.desc}</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!compact && (
            <p className="mt-auto px-2 text-[11px] text-[var(--text-tertiary)]">
              Todo se procesa en tu navegador. Tus archivos no se suben.
            </p>
          )}
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
