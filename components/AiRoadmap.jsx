import Link from "next/link";
import Reveal from "./Reveal";
import AiOrb from "./AiOrb";

// Bloque violeta de la portada: lo que hace la IA hoy y lo que viene.
// Lo marcado "Próximamente" todavía no existe (se activa al conectar la IA
// en el servidor, ver README → Pendientes); no se presenta como disponible.
const ITEMS = [
  { title: "Te guía a la herramienta correcta", text: "Escribe lo que necesitas con tus palabras.", ready: true },
  { title: "Quitar fondos con IA", text: "Personas, mascotas y productos, no solo fondos de un color.", ready: false },
  { title: "Pregúntale a tus PDFs", text: "Resúmenes y respuestas sobre tus documentos.", ready: false },
  { title: "Textos que suenan humanos", text: "Reescritura natural con IA, en tu idioma.", ready: false },
];

export default function AiRoadmap() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <Reveal>
        <div className="relative overflow-hidden rounded-4xl p-8 sm:p-12 text-white" style={{ background: "var(--ai)", boxShadow: "var(--shadow-ai)" }}>
          {/* Círculos sólidos decorativos */}
          <span className="absolute -right-16 -bottom-24 w-72 h-72 rounded-full bg-white/10" aria-hidden="true" />
          <span className="absolute right-24 -top-10 w-24 h-24 rounded-full bg-white/10" aria-hidden="true" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-full bg-white/15 p-3 inline-block">
                <AiOrb size={56} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Nuvex IA está creciendo</h2>
              <p className="text-white/80">
                Empezamos por lo útil: entender qué necesitas. Lo siguiente es que la IA trabaje directamente con tus archivos.
              </p>
              <Link
                href="/tools?tool=assistant"
                className="lift inline-flex h-12 items-center gap-2 px-6 rounded-2xl text-sm font-semibold bg-white"
                style={{ color: "var(--ai)" }}
              >
                Probar Nuvex IA →
              </Link>
            </div>

            <ul className="lg:col-span-7 grid sm:grid-cols-2 gap-3">
              {ITEMS.map((item, i) => (
                <Reveal as="li" key={item.title} delay={i * 90} className="rounded-2xl bg-white/10 p-5">
                  <span
                    className="pill mb-3"
                    style={item.ready ? { background: "#d4ff3a", color: "#16161a" } : { background: "rgba(255,255,255,0.18)", color: "white" }}
                  >
                    {item.ready ? "Disponible" : "Próximamente"}
                  </span>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-white/70 mt-1">{item.text}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
