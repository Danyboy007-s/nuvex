import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import AiOrb from "./AiOrb";
import { ToolBadge } from "./toolVisuals";
import { askAssistant, SUGGESTIONS } from "../lib/assistant";
import { findTool } from "../lib/tools";

// Escribe y borra las sugerencias en el campo vacío, como si alguien tecleara.
// Mientras no está activo (campo enfocado o con texto), o si el sistema pide
// menos movimiento, muestra la primera sugerencia completa. El estado solo
// cambia dentro de temporizadores, nunca directamente en el efecto.
function useTypewriter(phrases, active) {
  const [text, setText] = useState(null); // null = todavía no empezó a escribir
  const reduced = useSyncExternalStore(
    noopSubscribe,
    () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    () => true // en el servidor: texto fijo
  );

  useEffect(() => {
    if (!active || reduced) return;
    let phrase = 0, chars = 0, deleting = false, timer;
    const tick = () => {
      const full = phrases[phrase];
      chars += deleting ? -1 : 1;
      setText(full.slice(0, chars));
      let delay = deleting ? 25 : 55;
      if (!deleting && chars === full.length) { deleting = true; delay = 1800; }
      else if (deleting && chars === 0) { deleting = false; phrase = (phrase + 1) % phrases.length; delay = 300; }
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [phrases, active, reduced]);

  return active && !reduced && text !== null ? text : phrases[0];
}

const noopSubscribe = () => () => {};

// Tarjeta de herramienta sugerida dentro del chat.
function ToolSuggestion({ id, dark }) {
  const tool = findTool(id);
  if (!tool) return null;
  return (
    <Link
      href={`/tools?tool=${id}`}
      className={`lift group flex items-center gap-3 rounded-2xl p-3 pr-4 ${
        dark ? "bg-white/10 hover:bg-white/15" : "bg-(--surface) border border-(--border)"
      }`}
    >
      <ToolBadge id={id} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{tool.name}</span>
        <span className={`block text-xs truncate ${dark ? "text-white/60" : "text-(--text-secondary)"}`}>{tool.desc}</span>
      </span>
      <span className="text-sm font-medium transition-transform group-hover:translate-x-1">Abrir →</span>
    </Link>
  );
}

// Asistente de Nuvex. Dos variantes:
//   "hero":  tarjeta oscura grande de la portada (lo más llamativo del sitio)
//   "panel": dentro de /tools, con los colores normales del tema
// La lógica de respuestas está en lib/assistant.js.
export default function AssistantChat({ variant = "panel" }) {
  const dark = variant === "hero";
  const [messages, setMessages] = useState([]); // { from: "user" | "ai", text, toolIds }
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [focused, setFocused] = useState(false);
  const listRef = useRef(null);
  const placeholder = useTypewriter(SUGGESTIONS, !focused && input === "");

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text) => {
    const clean = text.trim();
    if (!clean || thinking) return;
    const history = [...messages, { from: "user", text: clean }];
    setMessages(history);
    setInput("");
    setThinking(true);
    // Gemini (o el asistente local si la IA no está disponible). La pausa
    // mínima evita que una respuesta instantánea se sienta brusca.
    const [reply] = await Promise.all([askAssistant(history), new Promise((r) => setTimeout(r, 400))]);
    setMessages((m) => [...m, { from: "ai", ...reply }]);
    setThinking(false);
  };

  const shell = dark
    ? "bg-(--ai-ink) text-(--ai-ink-text) rounded-4xl p-6 sm:p-8"
    : "bg-(--surface) border border-(--border) rounded-4xl p-5 sm:p-7";

  return (
    <div className={shell} style={{ boxShadow: dark ? "var(--shadow-ai)" : "var(--shadow-md)" }}>
      {/* Cabecera */}
      <div className="flex items-center gap-4">
        <AiOrb size={dark ? 64 : 52} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Nuvex IA</h2>
            <span className="pill" style={{ background: "#d4ff3a", color: "#16161a" }}>Beta</span>
          </div>
          <p className={`text-sm ${dark ? "text-white/60" : "text-(--text-secondary)"}`}>
            Cuéntame qué necesitas y te llevo a la herramienta indicada.
          </p>
        </div>
      </div>

      {/* Conversación */}
      {(messages.length > 0 || thinking) && (
        <div ref={listRef} className="mt-6 space-y-3 max-h-80 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((m, i) =>
            m.from === "user" ? (
              <div key={i} className="message-in flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white" style={{ background: "var(--ai)" }}>
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={i} className="message-in space-y-2 max-w-[92%]">
                <p className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm ${dark ? "bg-white/10" : "bg-(--ai-soft) text-(--text-primary)"}`}>
                  {m.text}
                </p>
                {m.toolIds.map((id) => <ToolSuggestion key={id} id={id} dark={dark} />)}
                {m.notice && <p className={`text-[11px] ${dark ? "text-white/40" : "text-(--text-tertiary)"}`}>{m.notice}</p>}
              </div>
            )
          )}
          {thinking && (
            <div className="message-in inline-flex gap-1 rounded-2xl px-4 py-3" style={{ background: dark ? "rgba(255,255,255,0.1)" : "var(--ai-soft)" }}>
              {[0, 1, 2].map((d) => <span key={d} className="typing-dot w-1.5 h-1.5 rounded-full" style={{ background: "var(--ai)" }} />)}
            </div>
          )}
        </div>
      )}

      {/* Campo de texto */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className={`mt-6 flex items-center gap-2 rounded-2xl p-2 pl-4 transition-shadow ${
          dark ? "bg-white/10 focus-within:bg-white/15" : "bg-(--surface-secondary) border border-(--border)"
        }`}
        style={focused ? { boxShadow: "0 0 0 3px var(--ai)" } : undefined}
      >
        <div className="relative flex-1 min-w-0">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            aria-label="Escribe lo que necesitas"
            className="w-full bg-transparent py-2 text-[15px] outline-hidden placeholder:text-transparent"
            placeholder="Escribe lo que necesitas"
          />
          {/* Sugerencia animada (solo visual: el placeholder real es fijo) */}
          {input === "" && (
            <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-[15px] truncate max-w-full ${dark ? "text-white/40" : "text-(--text-tertiary)"}`}>
              {focused ? "Escribe lo que necesitas…" : placeholder}
              {!focused && <span className="caret ml-px">|</span>}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!input.trim() || thinking}
          className="shrink-0 h-10 px-4 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 hover:-translate-y-px active:translate-y-0"
          style={{ background: "var(--ai)" }}
        >
          Preguntar
        </button>
      </form>

      {/* Sugerencias rápidas */}
      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.slice(0, dark ? 4 : 6).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                dark ? "bg-white/10 hover:bg-white/20 text-white/80" : "bg-(--surface-secondary) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <p className={`mt-5 text-[11px] ${dark ? "text-white/40" : "text-(--text-tertiary)"}`}>
        Beta con Gemini de Google: lo que escribes en este chat se envía a Google para responderte. Tus archivos nunca se suben.
      </p>
    </div>
  );
}
