import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

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
      <Analytics />
      <Component {...pageProps} />
    </>
  );
}