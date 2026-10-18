// POST /api/assistant — Nuvex IA con Gemini.
// Recibe { messages: [{ from: "user" | "ai", text }] } y devuelve
// { text, toolIds, source: "gemini" }. La lógica está en lib/assistantAi.js.
//
// Códigos de error (el navegador vuelve al asistente local en todos):
//   400 pedido inválido · 405 método no permitido · 429 demasiados pedidos
//   503 IA no configurada (falta GEMINI_API_KEY) · 502 falló Gemini
import { askGemini, sanitizeMessages, createRateLimiter, DEFAULT_MODEL } from "../../lib/assistantAi";

const allow = createRateLimiter();

export const config = {
  api: { bodyParser: { sizeLimit: "16kb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Usa POST." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "La IA no está configurada." });

  // IP del visitante (Vercel la pone en x-forwarded-for).
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "desconocida").split(",")[0].trim();
  if (!allow(ip)) {
    return res.status(429).json({ error: "Demasiadas preguntas seguidas. Espera un momento." });
  }

  let messages;
  try {
    messages = sanitizeMessages(req.body?.messages);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const answer = await askGemini(messages, { apiKey, model: process.env.GEMINI_MODEL || DEFAULT_MODEL });
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ ...answer, source: "gemini" });
  } catch (err) {
    // El detalle va al registro del servidor (Vercel → Logs), no al visitante.
    console.error("Nuvex IA:", err.message, err.detail || "");
    return res.status(502).json({ error: "La IA no respondió." });
  }
}
