import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-(--border) mt-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row gap-6 sm:items-center justify-between">
        <div>
          <p className="font-semibold tracking-tight">Nuvex</p>
          <p className="text-sm text-(--text-secondary) mt-1">Herramientas que trabajan en tu navegador.</p>
        </div>
        <nav className="flex gap-5 text-sm text-(--text-secondary)">
          <Link href="/tools" className="hover:text-(--text-primary) transition-colors">Herramientas</Link>
          <Link href="/tools?tool=assistant" className="hover:text-(--text-primary) transition-colors">Nuvex IA</Link>
        </nav>
        <p className="text-xs text-(--text-tertiary)">
          © {currentYear} Nuvex · <span className="font-mono">beta</span>
        </p>
      </div>
    </footer>
  );
}
