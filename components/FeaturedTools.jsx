import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const tools = [
  {
    id: "pdf-converter",
    name: "PDF Converter",
    description: "Convierte, combina o comprime PDFs.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
        <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
        <path d="M10 9H8"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
      </svg>
    ),
    href: "/tools?tool=pdf-converter",
  },
  {
    id: "file-utils",
    name: "Compresor de imágenes",
    description: "Reduce el peso de tus fotos.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
        <path d="m14 19.5 3-3 3 3"/>
        <path d="M17 22v-5.5"/>
        <circle cx="9" cy="9" r="2"/>
      </svg>
    ),
    href: "/tools?tool=file-utils",
  },
  {
    id: "remove-metadata",
    name: "Limpiar metadatos",
    description: "Borra datos ocultos de tus imágenes.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    href: "/tools?tool=remove-metadata",
  },
  {
    id: "qr-generator",
    name: "Generador QR",
    description: "Crea códigos QR con logo y colores.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <rect width="5" height="5" x="3" y="3" rx="1"/>
        <rect width="5" height="5" x="16" y="3" rx="1"/>
        <rect width="5" height="5" x="3" y="16" rx="1"/>
        <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
        <path d="M21 21v.01"/>
        <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
        <path d="M3 12h.01"/>
        <path d="M12 3h.01"/>
        <path d="M12 16v.01"/>
        <path d="M16 12h1"/>
        <path d="M21 12v.01"/>
        <path d="M12 21v-1"/>
      </svg>
    ),
    href: "/tools?tool=qr-generator",
  },
  {
    id: "png-to-dxf",
    name: "Vectorizar imagen",
    description: "Convierte a DXF para AutoCAD.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="m12.99 6.74 1.93 3.44"/>
        <path d="M19.136 12a10 10 0 0 1-14.271 0"/>
        <path d="m21 21-2.16-3.84"/>
        <path d="m3 21 8.02-14.26"/>
        <circle cx="12" cy="5" r="2"/>
      </svg>
    ),
    href: "/tools?tool=png-to-dxf",
  },
  {
    id: "text-humanizer",
    name: "Humanizar texto",
    description: "Quita lo robótico a la IA.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
      </svg>
    ),
    href: "/tools?tool=text-humanizer",
  },
];

export default function FeaturedTools() {
  // Las tarjetas se ven desde el HTML inicial (Google y conexiones lentas no
  // dependen de JavaScript). Al cargar, solo las que están más abajo de la
  // pantalla se ocultan para aparecer con animación al hacer scroll.
  const [animate, setAnimate] = useState(false);
  const [visibleTools, setVisibleTools] = useState([]);
  const cardsRef = useRef([]);

  useEffect(() => {
    // Quien pidió menos movimiento en su sistema ve las tarjetas sin animación.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const alreadyOnScreen = cardsRef.current
      .map((card, idx) => (card && card.getBoundingClientRect().top < window.innerHeight ? idx : null))
      .filter((idx) => idx !== null);
    setVisibleTools(alreadyOnScreen);
    setAnimate(true);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index);
            setVisibleTools((prev) => [...new Set([...prev, index])]);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -80px 0px" }
    );

    cardsRef.current.forEach((card, idx) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 md:py-24 px-6 max-w-6xl mx-auto">
      <div className="space-y-16 md:space-y-24">
        {tools.map((tool, idx) => (
          <div
            key={tool.id}
            ref={(el) => (cardsRef.current[idx] = el)}
            data-index={idx}
            className={`
              transition-all duration-700 ease-out
              ${!animate || visibleTools.includes(idx)
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 ' + (idx % 2 === 0 ? '-translate-x-8' : 'translate-x-8')
              }
            `}
          >
            <Link href={tool.href} className="block">
              <div className={`
                relative rounded-3xl p-6 md:p-8
                transition-all duration-500 ease-out
                bg-[var(--surface)]/40 backdrop-blur-md
                border border-[var(--border)]
                shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.05)_inset]
                hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.2),0_0_0_1px_rgba(10,132,255,0.1)_inset]
                hover:bg-[var(--surface)]/60
                hover:translate-y-[2px]
                cursor-pointer
                ${idx % 2 === 0 ? 'md:mr-12' : 'md:ml-12'}
              `}>
                
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-[var(--accent)]/8 to-transparent rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 rounded-3xl shadow-[0_-2px_0_0_rgba(255,255,255,0.05)_inset] pointer-events-none" />
                
                <div className={`
                  flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} 
                  gap-8 md:gap-12 items-center relative z-10
                `}>
                  
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="text-[var(--text-primary)] flex justify-center md:justify-start opacity-80 transition-all duration-300 group-hover:scale-105">
                      {tool.icon}
                    </div>
                    <h3 className="text-2xl font-light text-[var(--text-primary)] tracking-tight">
                      {tool.name}
                    </h3>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                      {tool.description}
                    </p>
                    <div className="group/btn inline-flex items-center gap-1 text-sm text-[var(--accent)] transition-all">
                      probar
                      <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="bg-[var(--surface)]/50 rounded-2xl p-6 border border-[var(--border)] transition-all duration-300 hover:bg-[var(--surface)]/70">
                      <div className="h-32 rounded-xl bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent)]/5 flex items-center justify-center transition-all duration-300">
                        <div className="text-[var(--text-primary)] opacity-80">
                          {tool.icon}
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-tertiary)] text-center mt-3 opacity-60">
                        {tool.name}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="text-center mt-16">
        <Link href="/tools">
          <button className="group px-6 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:scale-105 transition-all duration-200 inline-flex items-center gap-2 shadow-sm hover:shadow-md">
            ver todas
            <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </Link>
      </div>
    </section>
  );
}