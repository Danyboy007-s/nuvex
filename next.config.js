// PWA: genera public/sw.js (service worker) en cada build para que la app
// se pueda instalar y funcione sin conexión. Se desactiva en desarrollo para
// que la caché no esconda los cambios mientras programas.
// Usa @ducanh2912/next-pwa, el reemplazo mantenido del antiguo `next-pwa`.
// Este plugin funciona con webpack: por eso `dev` y `build` usan --webpack
// (Next 16 usa Turbopack por defecto).
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    // La versión nueva del service worker toma el control al instante,
    // sin esperar a que el usuario cierre todas las pestañas.
    skipWaiting: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exportación estática: `npm run build` deja HTML/JS plano en out/.
  // No hay servidor; todas las herramientas corren en el navegador.
  output: 'export',
  reactStrictMode: true,
  // (compress, poweredByHeader y generateEtags no aplican: sin servidor de
  // Next, la compresión y las cabeceras las pone Vercel.)
  images: {
    // next/image necesita un servidor para optimizar; en export estático no hay.
    unoptimized: true,
  },
  compiler: {
    // Quita los console.log del build de producción.
    removeConsole: process.env.NODE_ENV === 'production',
  },
  webpack: (config, { isServer }) => {
    // Algunas librerías (pdf-lib, exifr...) mencionan módulos de Node.
    // En el navegador no existen, así que se marcan como vacíos.
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
