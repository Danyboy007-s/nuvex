import { useEffect, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6">
      <div className={`text-center space-y-7 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
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