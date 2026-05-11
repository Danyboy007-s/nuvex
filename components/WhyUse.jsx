import { useEffect, useRef, useState } from "react";

const reasons = [
  {
    title: "Sin cuentas",
    description: "Llegas, usas, te vas. No hay registro ni perfil que mantener. Nada que recordar.",
  },
  {
    title: "Sin colas",
    description: "El proceso empieza cuando tú quieres, no cuando el servidor tiene tiempo disponible.",
  },
  {
    title: "Sin sorpresas",
    description: "Lo que ves es lo que obtienes. No hay versiones de pago ni límites escondidos.",
  },
];

export default function WhyUse() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-24 md:py-32 px-6 max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-light text-[var(--text-primary)] tracking-tight">
          por qué no buscas otra opción
        </h2>
        <div className="w-12 h-px bg-[var(--accent)]/40 mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {reasons.map((reason, idx) => (
          <div
            key={idx}
            className={`text-center transition-all duration-500 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className="text-4xl mb-4 opacity-50">
              {idx === 0 ? "🔓" : idx === 1 ? "⚡" : "✨"}
            </div>
            <h3 className="text-xl font-medium text-[var(--text-primary)] mb-3">
              {reason.title}
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed px-4">
              {reason.description}
            </p>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-16">
        <div className="inline-block px-6 py-3 bg-[var(--surface)]/30 rounded-full border border-[var(--border)]">
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Todo ocurre donde estás.
          </p>
        </div>
      </div>
    </section>
  );
}