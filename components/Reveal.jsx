import { useEffect, useRef, useState } from "react";

// Aparición suave al hacer scroll (clases .reveal / .is-hidden de globals.css).
// El contenido es visible en el HTML inicial (Google y conexiones lentas no
// dependen de JavaScript): solo se oculta, para animarse, lo que al cargar
// está más abajo de la pantalla.
export default function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // ya está a la vista

    setHidden(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${hidden ? "is-hidden" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
