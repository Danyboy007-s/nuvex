import Reveal from "./Reveal";

// Por qué Nuvex: tres bloques de color sólido con las promesas del sitio.
const POINTS = [
  {
    title: "Tus archivos no se suben",
    text: "Todo se procesa en tu navegador. Nada pasa por un servidor.",
    bg: "var(--text-primary)", fg: "var(--bg)",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4" />,
  },
  {
    title: "Gratis y sin cuenta",
    text: "Sin registro, sin límites escondidos, sin marcas de agua.",
    bg: "#d4ff3a", fg: "#16161a",
    icon: <path d="M20 12v8H4v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z" />,
  },
  {
    title: "Funciona sin conexión",
    text: "Instálala como app y úsala aunque no tengas internet.",
    bg: "var(--accent)", fg: "#ffffff",
    icon: <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a15 15 0 0 1 20 0" />,
  },
];

export default function WhyNuvex() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <Reveal className="mb-8">
        <p className="text-sm font-semibold text-[var(--accent)] mb-2">Por qué Nuvex</p>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Sin cuentas. Sin colas. Sin sorpresas.</h2>
      </Reveal>
      <div className="grid md:grid-cols-3 gap-4">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={i * 90}>
            <div className="lift h-full rounded-3xl p-7" style={{ background: p.bg, color: p.fg }}>
              <svg className="w-8 h-8 mb-10" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                {p.icon}
              </svg>
              <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
              <p className="text-sm mt-2 opacity-75">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
