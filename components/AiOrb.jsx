// Símbolo visual de la IA de Nuvex: círculos de color sólido (sin degradados)
// que respiran y flotan con sombras suaves. Las animaciones están en
// styles/globals.css (.orb-core, .orb-float, .orb-float-slow).
export default function AiOrb({ size = 96 }) {
  const s = (f) => Math.round(size * f);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      {/* Núcleo violeta */}
      <span
        className="orb-core absolute rounded-full"
        style={{ inset: s(0.12), background: "var(--ai)", boxShadow: "var(--shadow-ai)" }}
      />
      {/* Brillo interior (círculo blanco translúcido, sólido) */}
      <span
        className="absolute rounded-full bg-white/25"
        style={{ width: s(0.3), height: s(0.3), top: s(0.24), left: s(0.26) }}
      />
      {/* Satélites */}
      <span
        className="orb-float absolute rounded-full"
        style={{ width: s(0.22), height: s(0.22), top: 0, right: s(0.02), background: "#d4ff3a", boxShadow: "0 6px 14px -4px rgba(22,22,26,0.3)" }}
      />
      <span
        className="orb-float-slow absolute rounded-full"
        style={{ width: s(0.14), height: s(0.14), bottom: s(0.04), left: s(0.04), background: "#ff5a3c", boxShadow: "0 6px 14px -4px rgba(22,22,26,0.3)" }}
      />
    </div>
  );
}
