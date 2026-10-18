import Link from "next/link";
import Reveal from "./Reveal";
import { ToolBadge, TOOL_VISUALS } from "./toolVisuals";
import { TOOL_CATEGORIES } from "../lib/tools";

// Cuadrícula de herramientas de la portada. Sale del registro (lib/tools.js):
// una herramienta nueva aparece aquí sola. La IA no va aquí: tiene la portada.
const TOOLS = TOOL_CATEGORIES.flatMap((c) => c.tools.map((t) => ({ ...t, category: c.name }))).filter(
  (t) => t.id !== "assistant"
);

export default function FeaturedTools() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <Reveal className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-semibold text-(--accent) mb-2">Herramientas</p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Todo lo que necesitas, sin instalar nada</h2>
        </div>
        <Link href="/tools" className="text-sm font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors">
          Ver el panel completo →
        </Link>
      </Reveal>

      {/* 4 columnas con la primera herramienta al doble de ancho: las 7 caben en 2 filas. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool, i) => (
          <Reveal key={tool.id} delay={(i % 4) * 80} className={i === 0 ? "sm:col-span-2" : ""}>
            <Link
              href={`/tools?tool=${tool.id}`}
              className="lift group relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-3xl bg-(--surface) border border-(--border) p-6"
            >
              {/* Círculo de color sólido que crece al pasar el mouse */}
              <span
                className="absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-10 transition-transform duration-500 ease-out group-hover:scale-[1.6]"
                style={{ background: TOOL_VISUALS[tool.id]?.color }}
                aria-hidden="true"
              />
              <ToolBadge id={tool.id} size="lg" className="relative" />
              <div className="relative">
                <p className="text-xs font-medium text-(--text-tertiary) mb-1">{tool.category}</p>
                <h3 className="text-xl font-semibold tracking-tight">{tool.name}</h3>
                <p className="text-sm text-(--text-secondary) mt-1">{tool.desc}</p>
                <span className="inline-flex mt-4 text-sm font-semibold transition-transform group-hover:translate-x-1">
                  Abrir →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
