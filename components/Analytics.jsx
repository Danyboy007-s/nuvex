import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Analytics() {
  const router = useRouter();

  useEffect(() => {
    // Registrar vista de página inicial
    console.log('[Analytics] Vista de página:', window.location.pathname);

    // Escuchar cambios de ruta
    const handleRouteChange = (url) => {
      console.log('[Analytics] Vista de página:', url);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return null;
}