import Head from "next/head";
import { useEffect, useState } from "react";

export default function Layout({ children, title = "Nuvex", description = "Herramientas de conversión. Silencioso, como una estación de tren de noche." }) {

  const [time, setTime] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('nuvex-theme');
    // MODO CLARO POR DEFECTO: solo oscuro si savedTheme === 'dark'
    const darkMode = savedTheme === 'dark';
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      setTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('nuvex-theme', newDark ? 'dark' : 'light');
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <main className="relative min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
        
        {/* Atmósfera */}
        <div className="rain-atmosphere" />
        
        {/* Reloj y botón de tema */}
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3">
          <div className="text-sm font-medium text-[var(--text-secondary)] tracking-wide tabular-nums">
            {time}
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>
              </svg>
            )}
          </button>
        </div>
        
        {/* Contenido principal */}
        <div className="relative z-10 flex-1">
          {children}
        </div>
      </main>
    </>
  );
}