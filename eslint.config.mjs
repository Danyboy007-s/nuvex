// Configuración de ESLint (revisa el código en busca de errores comunes).
// Uso: npm run lint
// Reglas base: las recomendadas por Next.js, incluidas las de rendimiento
// ("core-web-vitals") y las de React Hooks.
import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    rules: {
      // Las <img> de Nuvex muestran imágenes que sube el usuario (vistas
      // previas locales, blob: o data:). next/image no aporta nada ahí y en
      // un sitio estático no puede optimizarlas.
      "@next/next/no-img-element": "off",
    },
  },
  {
    // Archivos generados o de terceros: no se revisan.
    ignores: [".next/**", "out/**", "public/sw.js", "public/workbox-*.js", "node_modules/**"],
  },
];

export default config;
