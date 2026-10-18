// Genera public/sitemap.xml y public/robots.txt a partir del registro de
// herramientas (lib/tools.js) y del dominio (lib/site.js).
// Corre solo antes de cada build ("prebuild" en package.json), así una
// herramienta nueva aparece en el sitemap sin tocar nada más.
//
// Uso manual: node scripts/generate-sitemap.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// lib/*.js usa `export` pero el proyecto no es "type": "module" (Next y Jest
// esperan CommonJS en sus configs). Node 22 lo detecta solo, pero versiones
// anteriores (las que puede usar Cloudflare o Vercel para compilar) fallarían.
// Cargarlos como data: URL los fuerza a ES module en cualquier versión.
// Funciona porque estos dos archivos no importan otros módulos.
const loadEsm = (rel) =>
  import("data:text/javascript," + encodeURIComponent(readFileSync(new URL(rel, import.meta.url), "utf8")));

const { SITE_URL, absoluteUrl } = await loadEsm("../lib/site.js");
const { ALL_TOOL_IDS } = await loadEsm("../lib/tools.js");

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));

const paths = ["/", "/tools", ...ALL_TOOL_IDS.map((id) => `/tools/${id}`)];

// Sin <lastmod>/<priority>: Google ignora priority y solo confía en lastmod
// si es exacto. Así el archivo no cambia en cada build.
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${absoluteUrl(p)}</loc></url>`).join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

writeFileSync(PUBLIC + "sitemap.xml", sitemap);
writeFileSync(PUBLIC + "robots.txt", robots);
console.log(`sitemap.xml: ${paths.length} URLs en ${SITE_URL}`);
