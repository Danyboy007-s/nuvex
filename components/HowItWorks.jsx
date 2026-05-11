import { useEffect, useRef, useState } from "react";

const steps = [
  {
    icon: "📂",
    title: "Sube tu archivo",
    description: "Arrastra o selecciona el archivo que necesitas convertir. Sin límites, sin trucos.",
  },
  {
    icon: "⚙️",
    title: "Elige qué hacer",
    description: "Selecciona la herramienta y ajusta lo necesario. El proceso empieza al instante.",
  },
  {
    icon: "📥",
    title: "Obtén el resultado",
    description: "Descarga tu archivo convertido. Sin esperas, sin suscripciones.",
  },
];

export default function HowItWorks() {
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
          cómo funciona
        </h2>
        <div className="w-12 h-px bg-[var(--accent)]/40 mx-auto mt-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className={`text-center transition-all duration-500 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${idx * 150}ms` }}
          >
            <div className="text-5xl mb-5 opacity-80">{step.icon}</div>
            <div className="text-2xl font-light text-[var(--text-primary)] mb-3">
              {idx + 1}
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-3">
              {step.title}
            </h3>
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed px-4">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}