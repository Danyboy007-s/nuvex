import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6">
      {/* Entrada con animación CSS (hero-in, en globals.css): empieza en cuanto
          se pinta la página, sin esperar a que cargue JavaScript. Antes dependía
          de un useEffect y el título quedaba invisible hasta la hidratación. */}
      <div className="text-center space-y-7 hero-in">
        
        <h1 className="text-7xl md:text-8xl font-semibold tracking-tight bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-transparent">
          Nuvex
        </h1>
        
        <div className="h-px w-12 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent mx-auto" />
        
        <p className="text-[var(--text-secondary)] text-base md:text-lg font-light max-w-md mx-auto">
          herramientas de conversión
        </p>
        
        <Link href="/tools">
          <button className="group mt-4 px-8 py-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface)]/80 transition-all duration-300">
            ver herramientas
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
          </button>
        </Link>
        
      </div>
    </div>
  );
}