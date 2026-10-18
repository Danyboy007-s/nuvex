import Link from "next/link";
import AssistantChat from "./AssistantChat";
import { ALL_TOOL_IDS } from "../lib/tools";

// Portada: mensaje a la izquierda y Nuvex IA a la derecha, como lo más
// llamativo de la página. La entrada usa animaciones CSS (.rise-in) que
// empiezan con el primer pintado, sin esperar a JavaScript.
export default function HeroSection() {
  const toolCount = ALL_TOOL_IDS.filter((id) => id !== "assistant").length;

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 md:pt-20 pb-16 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
      <div className="lg:col-span-5 space-y-6">
        <span className="rise-in pill bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ai)" }} />
          Nuevo: Nuvex IA
        </span>

        <h1 className="rise-in rise-in-1 text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.02]">
          {/* "Etiqueta" lima con tinta oscura: se lee igual en modo claro y oscuro */}
          <span className="inline-block -rotate-2 rounded-2xl px-3 pb-1 mb-2 text-[#16161a]" style={{ background: "#d4ff3a", boxShadow: "var(--shadow-md)" }}>
            Pídelo.
          </span>
          <br />
          Nuvex lo resuelve.
        </h1>

        <p className="rise-in rise-in-2 text-lg text-[var(--text-secondary)] max-w-md">
          Herramientas gratis para PDF, fotos, textos y códigos QR. Todo pasa en tu navegador: tus archivos nunca salen de tu equipo.
        </p>

        <div className="rise-in rise-in-3 flex flex-wrap items-center gap-3">
          <Link
            href="/tools"
            className="lift inline-flex h-12 items-center gap-2 px-6 rounded-2xl text-sm font-semibold bg-[var(--text-primary)] text-[var(--bg)]"
          >
            Ver herramientas <span aria-hidden="true">→</span>
          </Link>
          <div className="flex gap-4 text-sm text-[var(--text-secondary)]">
            <span><strong className="text-[var(--text-primary)]">{toolCount}</strong> herramientas</span>
            <span><strong className="text-[var(--text-primary)]">0</strong> registros</span>
          </div>
        </div>
      </div>

      <div className="rise-in rise-in-2 lg:col-span-7">
        <AssistantChat variant="hero" />
      </div>
    </section>
  );
}
