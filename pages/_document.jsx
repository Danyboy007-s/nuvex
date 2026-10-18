import { Html, Head, Main, NextScript } from 'next/document'

// Aplica el tema oscuro ANTES de que se pinte la página. Sin esto, quien usa
// modo oscuro ve un destello blanco: React solo lee la preferencia después de
// cargar (ver components/Layout.jsx, que sigue manejando el botón de tema).
// Es un script mínimo en línea a propósito: tiene que correr antes que todo.
const themeScript = `try{if(localStorage.getItem('nuvex-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="author" content="Nuvex" />
        {/* Verificación de propiedad en Google Search Console (código público, no secreto).
            Si se borra, Search Console deja de considerar verificado el sitio. */}
        <meta name="google-site-verification" content="6kEtXONGfIQgcGSY2aOld1jcJWysSAArGvV-U-2VSHE" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007aff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* Íconos: el SVG para navegadores modernos y el .ico como respaldo.
            Se generan a partir de public/favicon.svg (ver README). */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Título, descripción, canonical y vista previa para redes van en
            components/Layout.jsx, porque cambian en cada página. */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}