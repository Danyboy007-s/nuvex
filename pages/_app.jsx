import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Inter } from 'next/font/google';

// Inter autoalojada: next/font la descarga al compilar y la sirve junto al
// sitio (sin pedirla a Google en cada visita). Se expone como la variable --font-inter,
// que usan styles/globals.css y tailwind.config.js.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// Analytics simple - sin bloqueo
const Analytics = () => {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url) => {
      // Solo para desarrollo, puedes eliminar en producción
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics] Vista: ${url}`);
      }
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return null;
};

export default function App({ Component, pageProps }) {
  return (
    <>
      {/* Define --font-inter en <html> para que también la herede <body>.
          Va en el HTML generado, así la fuente correcta se ve desde el primer pintado. */}
      <style jsx global>{`
        :root {
          --font-inter: ${inter.style.fontFamily};
        }
      `}</style>
      <Analytics />
      <Component {...pageProps} />
    </>
  );
}