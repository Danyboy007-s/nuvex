import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-[var(--border)] py-6 mt-12">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <p className="text-[11px] text-[var(--text-tertiary)]">
          © {currentYear} Nuvex — <span className="font-mono text-[10px] bg-[var(--surface)] px-1.5 py-0.5 rounded-md">beta v1.0</span>
        </p>
        <p className="text-[9px] text-[var(--text-muted)] mt-2 opacity-50">
          La herramienta está en desarrollo activo. Pueden aparecer mejoras o ajustes inesperados.
        </p>
      </div>
    </footer>
  );
}