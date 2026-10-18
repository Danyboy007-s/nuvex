/**
 * @jest-environment node
 */
import {
  sanitizeMessages, buildRequest, parseResponse, askGemini, createRateLimiter,
  TOOL_IDS, LIMITS, DEFAULT_MODEL, SYSTEM_PROMPT,
} from "../../lib/assistantAi";
import { askAssistant } from "../../lib/assistant";
import handler from "../../pages/api/assistant";

// Respuesta de Gemini con el formato real (candidates → content → parts).
const geminiReply = (obj, extraParts = []) => ({
  candidates: [{ content: { parts: [...extraParts, { text: JSON.stringify(obj) }] } }],
});

describe("sanitizeMessages", () => {
  it("recorta mensajes largos y deja solo los últimos turnos", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ from: i % 2 ? "ai" : "user", text: `m${i}` }));
    many.push({ from: "user", text: "x".repeat(2000) });
    const clean = sanitizeMessages(many);
    expect(clean).toHaveLength(LIMITS.maxMessages);
    expect(clean.at(-1).text).toHaveLength(LIMITS.maxMessageChars);
  });

  it("rechaza pedidos sin mensaje o que no terminan en la persona", () => {
    expect(() => sanitizeMessages([])).toThrow();
    expect(() => sanitizeMessages("hola")).toThrow();
    expect(() => sanitizeMessages([{ from: "ai", text: "hola" }])).toThrow();
    expect(() => sanitizeMessages([{ from: "hacker", text: "x" }])).toThrow();
  });
});

describe("buildRequest", () => {
  it("convierte el historial al formato de Gemini y pide JSON", () => {
    const req = buildRequest([{ from: "user", text: "hola" }, { from: "ai", text: "¿qué tal?" }, { from: "user", text: "unir pdf" }]);
    expect(req.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(req.generationConfig.responseMimeType).toBe("application/json");
    expect(req.generationConfig.responseSchema.properties.toolIds.items.enum).toEqual(TOOL_IDS);
    expect(req.systemInstruction.parts[0].text).toBe(SYSTEM_PROMPT);
  });

  it("el prompt describe todas las herramientas, pero no al propio asistente", () => {
    for (const id of TOOL_IDS) expect(SYSTEM_PROMPT).toContain(`- ${id}:`);
    expect(TOOL_IDS).not.toContain("assistant");
  });
});

describe("parseResponse", () => {
  it("lee el JSON e ignora las partes de pensamiento", () => {
    const data = geminiReply({ text: " Usa el Compresor. ", toolIds: ["file-utils"] }, [{ text: "pensando...", thought: true }]);
    expect(parseResponse(data)).toEqual({ text: "Usa el Compresor.", toolIds: ["file-utils"] });
  });

  it("descarta herramientas inventadas, repetidas o de más", () => {
    const data = geminiReply({ text: "ok", toolIds: ["file-utils", "no-existe", "file-utils", "pdf-converter", "qr-generator"] });
    expect(parseResponse(data).toolIds).toEqual(["file-utils", "pdf-converter"]);
  });

  it("falla con respuestas vacías o que no son JSON", () => {
    expect(() => parseResponse({})).toThrow();
    expect(() => parseResponse({ candidates: [{ content: { parts: [{ text: "no es json" }] } }] })).toThrow();
    expect(() => parseResponse(geminiReply({ text: "  ", toolIds: [] }))).toThrow();
  });
});

describe("askGemini", () => {
  it("llama al modelo con la clave en la cabecera (no en la URL)", async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => geminiReply({ text: "hola", toolIds: [] }) }));
    await askGemini([{ from: "user", text: "hola" }], { apiKey: "SECRETA", fetchImpl });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain(`/models/${DEFAULT_MODEL}:generateContent`);
    expect(url).not.toContain("SECRETA");
    expect(options.headers["x-goog-api-key"]).toBe("SECRETA");
  });

  it("propaga los errores de Google con su código", async () => {
    const fetchImpl = async () => ({ ok: false, status: 429, text: async () => "quota" });
    await expect(askGemini([{ from: "user", text: "hola" }], { apiKey: "k", fetchImpl })).rejects.toMatchObject({ status: 429 });
  });
});

describe("createRateLimiter", () => {
  it("frena a quien pregunta demasiado seguido y libera tras un minuto", () => {
    const allow = createRateLimiter({ perMinute: 3, perDay: 100 });
    const t = 1_000_000;
    expect([allow("ip", t), allow("ip", t + 1), allow("ip", t + 2), allow("ip", t + 3)]).toEqual([true, true, true, false]);
    expect(allow("otra-ip", t + 3)).toBe(true);
    expect(allow("ip", t + 61_000)).toBe(true);
  });

  it("también aplica el límite diario", () => {
    const allow = createRateLimiter({ perMinute: 100, perDay: 2 });
    expect([allow("ip", 0), allow("ip", 70_000), allow("ip", 140_000)]).toEqual([true, true, false]);
  });
});

// ---------- Ruta /api/assistant ----------

function mockRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  return res;
}
const post = (body, ip = "1.1.1.1") => ({ method: "POST", body, headers: { "x-forwarded-for": ip } });

describe("POST /api/assistant", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.GEMINI_API_KEY;
  });

  it("405 si no es POST", async () => {
    const res = mockRes();
    await handler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(405);
  });

  it("503 si falta la clave de Gemini", async () => {
    const res = mockRes();
    await handler(post({ messages: [{ from: "user", text: "hola" }] }), res);
    expect(res.statusCode).toBe(503);
  });

  it("400 si el pedido es inválido", async () => {
    process.env.GEMINI_API_KEY = "k";
    const res = mockRes();
    await handler(post({ messages: [] }, "2.2.2.2"), res);
    expect(res.statusCode).toBe(400);
  });

  it("200 con la respuesta de Gemini", async () => {
    process.env.GEMINI_API_KEY = "k";
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => geminiReply({ text: "Usa el Convertidor PDF.", toolIds: ["pdf-converter"] }) }));
    const res = mockRes();
    await handler(post({ messages: [{ from: "user", text: "unir pdf" }] }, "3.3.3.3"), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ text: "Usa el Convertidor PDF.", toolIds: ["pdf-converter"], source: "gemini" });
  });

  it("502 (sin detalles internos) si Gemini falla", async () => {
    process.env.GEMINI_API_KEY = "k";
    global.fetch = async () => ({ ok: false, status: 500, text: async () => "detalle interno" });
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    await handler(post({ messages: [{ from: "user", text: "hola" }] }, "4.4.4.4"), res);
    expect(res.statusCode).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain("detalle interno");
    spy.mockRestore();
  });
});

// ---------- Navegador: askAssistant ----------

describe("askAssistant", () => {
  const history = [{ from: "user", text: "quiero unir dos pdf" }];

  it("usa la respuesta de Gemini cuando la API responde", async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ text: "¡Claro!", toolIds: ["pdf-converter"] }) });
    expect(await askAssistant(history, { fetchImpl })).toEqual({ text: "¡Claro!", toolIds: ["pdf-converter"], source: "gemini" });
  });

  it("vuelve al asistente local si la IA no está configurada o no hay internet", async () => {
    const notConfigured = async () => ({ ok: false, status: 503 });
    const offline = async () => { throw new TypeError("Failed to fetch"); };
    for (const fetchImpl of [notConfigured, offline]) {
      const reply = await askAssistant(history, { fetchImpl });
      expect(reply.source).toBe("local");
      expect(reply.toolIds[0]).toBe("pdf-converter");
    }
  });

  it("avisa cuando se alcanzó el límite de preguntas", async () => {
    const reply = await askAssistant(history, { fetchImpl: async () => ({ ok: false, status: 429 }) });
    expect(reply.notice).toMatch(/modo básico/);
  });
});
