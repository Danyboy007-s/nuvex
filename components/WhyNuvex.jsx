import { useEffect, useRef, useState } from "react";

export default function WhyNuvex() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="py-16 px-6 max-w-3xl mx-auto">
      <div className={`text-center space-y-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        <div className="w-8 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent mx-auto" />
        <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed max-w-lg mx-auto">
          Sin cuentas. Sin colas. Sin sorpresas.
        </p>
        <p className="text-[11px] text-[var(--text-muted)]">
          Todo ocurre donde estás.
        </p>
      </div>
    </section>
  );
}