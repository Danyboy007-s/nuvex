// ============================================
// NUVEX IA CON GEMINI (solo servidor)
// ============================================
// Lo usa pages/api/assistant.js. Arma el pedido a Gemini con las herramientas
// de Nuvex y valida la respuesta. Las funciones son puras (salvo askGemini)
// para poder probarlas sin llamar a Google.
//
// Variables de entorno (en Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  (obligatoria) clave de Google AI Studio. Nunca va al navegador.
//   GEMINI_MODEL    (opcional) modelo; por defecto DEFAULT_MODEL.

import { TOOL_CATEGORIES } from "./tools";

export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Límites para que nadie pueda gastar la cuota con mensajes enormes.
export const LIMITS = {
  maxMessages: 10,        // últimos turnos de la conversación que se envían
  maxMessageChars: 500,   // largo máximo de cada mensaje
  maxOutputTokens: 1024,  // largo máximo de la respuesta (incluye "pensamiento")
  maxSuggestedTools: 2,
};

// Herramientas que la IA puede sugerir (todas menos el propio asistente).
const TOOLS = TOOL_CATEGORIES.flatMap((c) => c.tools).filter((t) => t.id !== "assistant");
export const TOOL_IDS = TOOLS.map((t) => t.id);

export const SYSTEM_PROMPT = `Eres Nuvex IA, el asistente de Nuvex (un sitio de herramientas gratuitas que funcionan dentro del navegador; los archivos nunca se suben a ningún servidor).

Tu trabajo: entender qué quiere hacer la persona y recomendarle la herramienta de Nuvex adecuada, explicando en una o dos frases cómo usarla.

Herramientas disponibles (id: descripción):
${TOOLS.map((t) => `- ${t.id}: ${t.name}. ${t.seoDescription}`).join("\n")}

Reglas:
- Responde siempre en español, con un tono cercano y breve (máximo 3 frases).
- En "toolIds" pon solo ids de la lista, del más al menos útil (máximo ${LIMITS.maxSuggestedTools}). Si ninguna sirve, deja la lista vacía.
- Si te piden algo que Nuvex no hace, dilo con honestidad y, si existe, sugiere la herramienta más cercana.
- Todavía no puedes abrir ni modificar archivos tú mismo: la persona usa la herramienta. No inventes funciones que las herramientas no tienen.
- Si la conversación se aleja de los archivos y las herramientas, responde con amabilidad en una frase y vuelve al tema.`;

// Formato de respuesta que se le exige a Gemini (salida JSON estructurada).
export const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING", description: "Respuesta para la persona, en español." },
    toolIds: { type: "ARRAY", items: { type: "STRING", enum: TOOL_IDS } },
  },
  required: ["text", "toolIds"],
};

// Valida y recorta el historial que manda el navegador.
// Devuelve el historial limpio o lanza un Error con un mensaje claro.
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("Falta el mensaje.");
  const clean = messages
    .slice(-LIMITS.maxMessages)
    .filter((m) => m && (m.from === "user" || m.from === "ai") && typeof m.text === "string")
    .map((m) => ({ from: m.from, text: m.text.trim().slice(0, LIMITS.maxMessageChars) }))
    .filter((m) => m.text);
  if (clean.length === 0 || clean[clean.length - 1].from !== "user") {
    throw new Error("El último mensaje debe ser de la persona.");
  }
  return clean;
}

// Cuerpo del pedido a generateContent.
export function buildRequest(messages) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: messages.map((m) => ({
      role: m.from === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: LIMITS.maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

// Extrae { text, toolIds } de la respuesta de Gemini y la valida.
// Lanza un Error si no hay una respuesta usable.
export function parseResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  // Los modelos con "pensamiento" pueden incluir partes marcadas como thought.
  const raw = parts.filter((p) => !p.thought && typeof p.text === "string").map((p) => p.text).join("");
  if (!raw) throw new Error("Gemini no devolvió texto.");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini devolvió un formato inesperado.");
  }
  const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  if (!text) throw new Error("Gemini devolvió una respuesta vacía.");

  const toolIds = [...new Set(Array.isArray(parsed.toolIds) ? parsed.toolIds : [])]
    .filter((id) => TOOL_IDS.includes(id))
    .slice(0, LIMITS.maxSuggestedTools);
  return { text, toolIds };
}

// Llama a Gemini. `fetchImpl` permite reemplazar fetch en los tests.
export async function askGemini(messages, { apiKey, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 15000 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(buildRequest(messages)),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const err = new Error(`Gemini respondió ${res.status}`);
    err.status = res.status;
    err.detail = detail.slice(0, 500);
    throw err;
  }
  return parseResponse(await res.json());
}

// ---------- Límite de pedidos por visitante ----------
// Ventana deslizante en memoria. Es "de buena fe": cada instancia del servidor
// lleva su propia cuenta y se reinicia al arrancar, pero frena el abuso simple.
// El tope real de gasto se configura en Google AI Studio.
export function createRateLimiter({ perMinute = 8, perDay = 100 } = {}) {
  const hits = new Map(); // ip → [timestamps]
  return function check(ip, now = Date.now()) {
    const day = 24 * 60 * 60 * 1000;
    const list = (hits.get(ip) || []).filter((t) => now - t < day);
    const lastMinute = list.filter((t) => now - t < 60 * 1000).length;
    if (lastMinute >= perMinute || list.length >= perDay) {
      hits.set(ip, list);
      return false;
    }
    list.push(now);
    hits.set(ip, list);
    // Limpieza ocasional para que el mapa no crezca sin fin.
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < day)) hits.delete(k);
    return true;
  };
}
