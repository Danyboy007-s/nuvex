import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <meta charSet="utf-8" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Nuvex" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007aff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="canonical" href="https://nuvex.app" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Nuvex - Herramientas de conversión sin complicaciones" />
        <meta property="og:description" content="Convierte, limpia y optimiza archivos directamente en tu navegador. Sin colas, sin cuentas, sin publicidad." />
        <meta property="og:url" content="https://nuvex.app" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Nuvex - Herramientas de conversión" />
        <meta name="twitter:description" content="Herramientas rápidas y directas. Sin servidores, sin complicaciones." />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}