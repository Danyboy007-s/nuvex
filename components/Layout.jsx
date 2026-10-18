import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION, OG_IMAGE, absoluteUrl } from "../lib/site";

// Envoltorio común de todas las páginas. También arma las etiquetas de SEO:
//   title / description → lo que muestra Google en los resultados
//   path                → URL canónica de la página (evita contenido duplicado)
//   appName             → solo en páginas de herramienta: agrega datos
//                         estructurados (JSON-LD) y un enlace de vuelta al inicio
//   noindex             → para páginas que no deben aparecer en Google (404)
export default function Layout({
  children,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  appName = null,
  noindex = false,
}) {
  const url = absoluteUrl(path);
  const image = absoluteUrl(OG_IMAGE);
  const jsonLd = appName && {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${appName} — ${SITE_NAME}`,
    description,
    url,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Cualquiera (navegador web)",
    inLanguage: "es",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const [time, setTime] = useState("");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('nuvex-theme');
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
        {noindex ? (
          <meta name="robots" content="noindex" />
        ) : (
          <link rel="canonical" href={url} />
        )}
        {/* Vista previa al compartir el enlace (WhatsApp, Facebook, X, LinkedIn...) */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="es_ES" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={image} />
        {jsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        )}
      </Head>
      <main className="relative min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
        
        {/* En la página propia de una herramienta (a la que se llega desde
            Google) no hay menú: este enlace permite ir al resto del sitio. */}
        {appName && (
          <Link
            href="/"
            className="fixed top-5 left-5 z-50 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Nuvex
          </Link>
        )}

        <div className="fixed top-5 right-5 z-50 flex items-center gap-3">
          <div className="text-sm font-medium text-[var(--text-secondary)] tracking-wide tabular-nums">
            {time}
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            aria-label="Cambiar tema"
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
        
        {/* Las páginas de herramienta sueltas necesitan margen propio (dentro de
            /tools se lo da el panel) y espacio arriba para el enlace y el reloj. */}
        <div className={`relative z-10 flex-1 ${appName ? "px-4 sm:px-6 pt-20 pb-12" : ""}`}>
          {children}
        </div>
      </main>
    </>
  );
}