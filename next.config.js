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
  // Ya no es exportación estática: Nuvex IA necesita una ruta de servidor
  // (pages/api/assistant.js) para guardar la clave de Gemini lejos del navegador.
  // Las páginas siguen generándose como HTML estático en el build, y todas las
  // herramientas siguen corriendo en el navegador.
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // No se usa next/image: las imágenes son las que sube cada persona.
    unoptimized: true,
  },
  compiler: {
    // Quita los console.log del build de producción, pero conserva los
    // errores y avisos: son los que aparecen en Vercel → Logs.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
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
