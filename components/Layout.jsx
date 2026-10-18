import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION, OG_IMAGE, absoluteUrl } from "../lib/site";

// Envoltorio común de todas las páginas. También arma las etiquetas de SEO:
//   title / description → lo que muestra Google en los resultados
//   path                → URL canónica de la página (evita contenido duplicado)
//   appName             → solo en páginas de herramienta: agrega datos
//                         estructurados (JSON-LD) y márgenes propios
//   noindex             → para páginas que no deben aparecer en Google (404)
//   wide                → encabezado a todo el ancho (panel /tools)
export default function Layout({
  children,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  appName = null,
  noindex = false,
  wide = false, // encabezado a todo el ancho (panel /tools, alineado con el menú lateral)
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
        {/* Encabezado fijo arriba en todas las páginas. La IA tiene su propio
            botón violeta para que siempre esté a un clic. */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg)] border-b border-[var(--border)]">
          <div className={`h-full flex items-center gap-3 px-4 sm:px-6 ${wide ? "" : "max-w-6xl mx-auto"}`}>
            <Link href="/" className="flex items-center gap-2.5 mr-auto group" aria-label="Nuvex, inicio">
              <svg className="w-8 h-8 transition-transform duration-300 group-hover:-rotate-6" viewBox="0 0 512 512" aria-hidden="true">
                <rect width="512" height="512" rx="112" fill="#007aff" />
                <path d="M152 372V140h40l128 166V140h40v232h-40L192 206v166z" fill="#fff" />
              </svg>
              <span className="text-lg font-semibold tracking-tight">Nuvex</span>
            </Link>

            <Link
              href="/tools"
              className="hidden sm:inline-flex h-9 items-center px-3.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Herramientas
            </Link>
            <Link
              href="/tools?tool=assistant"
              className="lift inline-flex h-9 items-center gap-2 px-3.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--ai)" }}
            >
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-[#d4ff3a] orb-core" />
              </span>
              Nuvex IA
            </Link>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center transition-all hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
              aria-label="Cambiar tema"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Las páginas de herramienta sueltas (a las que se llega desde Google)
            necesitan margen propio; dentro de /tools se lo da el panel. */}
        <div className={`relative flex-1 ${appName ? "px-4 sm:px-6 pt-10 pb-16" : ""}`}>
          {children}
        </div>
      </main>
    </>
  );
}