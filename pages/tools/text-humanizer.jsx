import { useState } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";

// ============================================
// FRASES TÍPICAS DE IA A ELIMINAR
// ============================================
const aiPhrasesRemoval = [
  { regex: /\ben el panorama actual\b/gi, replacement: "" },
  { regex: /\ben el mundo actual\b/gi, replacement: "" },
  { regex: /\bes importante (destacar|señalar|mencionar|resaltar)\b/gi, replacement: "" },
  { regex: /\bcabe (destacar|mencionar|señalar|resaltar)\b/gi, replacement: "" },
  { regex: /\bresulta (fundamental|esencial|crucial|imprescindible|importante)\b/gi, replacement: "" },
  { regex: /\ba lo largo de la historia\b/gi, replacement: "" },
  { regex: /\ben este (sentido|contexto|marco)\b/gi, replacement: "" },
  { regex: /\ba modo de (conclusión|resumen)\b/gi, replacement: "" },
  { regex: /\ben (conclusión|resumen|definitiva|síntesis)\b,?\s*/gi, replacement: "" },
  { regex: /\bpor (último|otra parte|otro lado)\b/gi, replacement: "" },
  { regex: /\ben primer lugar\b/gi, replacement: "" },
  { regex: /\ben segundo lugar\b/gi, replacement: "" },
  { regex: /\bno obstante\b/gi, replacement: "pero" },
  { regex: /\basimismo\b/gi, replacement: "también" },
  { regex: /\bpor ende\b/gi, replacement: "por eso" },
  { regex: /\bpor consiguiente\b/gi, replacement: "entonces" },
  { regex: /\ba su vez\b/gi, replacement: "también" },
  { regex: /\ben términos (generales|simples|prácticos)\b/gi, replacement: "básicamente" },
  { regex: /\bhay que (tener en cuenta|considerar|reconocer) que\b/gi, replacement: "hay que decir que" },
  { regex: /\bes por ello que\b/gi, replacement: "por eso" },
  { regex: /\bsin lugar a dudas\b/gi, replacement: "sin duda" },
  { regex: /\ben la actualidad\b/gi, replacement: "ahora" },
  { regex: /\bes evidente que\b/gi, replacement: "está claro que" },
  { regex: /\ba grandes rasgos\b/gi, replacement: "básicamente" },
  { regex: /\bdesde un punto de vista\b/gi, replacement: "desde mi punto de vista" },
];

// ============================================
// CONECTORES HUMANOS Y NATURALES
// ============================================
const humanConnectors = {
  empezar: ["bueno,", "mira,", "la cosa es que", "pues,", "resulta que"],
  continuar: ["y también", "luego", "entonces", "ahora bien,", "eso sí,", "el caso es que"],
  contraste: ["pero", "aunque", "eso sí,", "la verdad es que", "el detalle es que"],
  finalizar: ["en fin,", "total,", "al final,", "para terminar,", "o sea,"],
};

// ============================================
// MULETILLAS NATURALES
// ============================================
const fillerWords = [
  "como que", "digamos", "o sea", "la verdad", "pues nada",
  "a ver", "qué sé yo", "y todo eso", "en plan"
];

// ============================================
// FUNCIÓN PRINCIPAL DE HUMANIZACIÓN
// ============================================
function humanizeText(inputText, intensity) {
  let text = inputText;
  const chance = intensity / 100;
  
  // 1. Eliminar frases típicas de IA
  for (const item of aiPhrasesRemoval) {
    if (Math.random() < chance * 0.8) {
      text = text.replace(item.regex, item.replacement);
    }
  }
  
  // 2. Limpiar comas y espacios dobles que quedan
  text = text.replace(/,\s*,/g, ",");
  text = text.replace(/\s+/g, " ");
  
  // 3. Variar longitud de oraciones (dividir oraciones largas)
  if (Math.random() < chance * 0.6) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const newSentences = [];
    for (const sentence of sentences) {
      if (sentence.length > 100 && sentence.includes(",")) {
        const parts = sentence.split(",");
        if (parts.length >= 2) {
          const mid = Math.floor(parts.length / 2);
          const first = parts.slice(0, mid).join(",");
          const second = parts.slice(mid).join(",");
          newSentences.push(first.trim() + ".");
          newSentences.push(second.trim() + ".");
        } else {
          newSentences.push(sentence);
        }
      } else {
        newSentences.push(sentence);
      }
    }
    text = newSentences.join(" ");
  }
  
  // 4. Agregar conectores humanos al inicio de oraciones
  if (Math.random() < chance * 0.5) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const connectorsList = [...humanConnectors.empezar, ...humanConnectors.continuar];
    const randomConnector = connectorsList[Math.floor(Math.random() * connectorsList.length)];
    if (sentences.length > 1 && sentences[0].length > 20) {
      sentences[1] = randomConnector + " " + sentences[1].charAt(0).toLowerCase() + sentences[1].slice(1);
      text = sentences.join(" ");
    }
  }
  
  // 5. Reemplazar conectores formales por humanos
  text = text.replace(/por lo tanto/gi, () => pick(["así que", "entonces", "por eso"]));
  text = text.replace(/sin embargo/gi, () => pick(["pero", "aunque", "eso sí"]));
  text = text.replace(/además/gi, () => pick(["y también", "también", "claro que"]));
  text = text.replace(/de hecho/gi, () => pick(["la verdad", "en realidad", "eso sí"]));
  
  // 6. Agregar imperfección natural (solo si intensidad alta)
  if (intensity > 70 && Math.random() < 0.4) {
    const randomFiller = pick(fillerWords);
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length > 1) {
      const insertIndex = Math.min(2, sentences.length - 1);
      sentences[insertIndex] = randomFiller + ", " + sentences[insertIndex].charAt(0).toLowerCase() + sentences[insertIndex].slice(1);
      text = sentences.join(" ");
    }
  }
  
  // 7. Variar puntuación (más natural)
  if (Math.random() < chance * 0.5) {
    text = text.replace(/\. /g, () => {
      const variants = [". ", "... ", " — ", ".\n", ". "];
      return pick(variants);
    });
  }
  
  // 8. Limpieza final
  text = text.replace(/\s+/g, " ");
  text = text.replace(/\s*\.\.\.\s*/g, "... ");
  text = text.replace(/\s*—\s*/g, " — ");
  text = text.trim();
  text = text.charAt(0).toUpperCase() + text.slice(1);
  
  return text;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wordCount(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function TextHumanizerPage({ standalone = false }) {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [intensity, setIntensity] = useState(65);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleHumanize = () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const result = humanizeText(inputText, intensity);
      setOutputText(result);
      setIsProcessing(false);
    }, 600);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const downloadTxt = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "texto-humanizado.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const wordDiff = outputText && inputText
    ? Math.round(((wordCount(outputText) - wordCount(inputText)) / Math.max(wordCount(inputText), 1)) * 100)
    : null;

  const content = (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">Humanizador de texto</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Hace que los textos de IA suenen como escritos por una persona</p>
        <div className="w-8 h-px bg-[var(--border)] mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-[var(--text-secondary)] text-sm mb-2">Texto original (de IA)</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pega aquí cualquier texto generado por IA..."
            rows={7}
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition resize-none"
          />
          <p className="text-[var(--text-tertiary)] text-xs mt-1">{wordCount(inputText)} palabras</p>
        </div>

        <div>
          <label className="block text-[var(--text-secondary)] text-sm mb-2">
            Intensidad de humanización: {intensity}%
          </label>
          <input
            type="range"
            min="20"
            max="90"
            step="5"
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
            className="w-full h-2 bg-[var(--surface-hover)] rounded-lg"
          />
          <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
            <span>Sutil</span>
            <span>Natural</span>
            <span>Muy humano</span>
          </div>
        </div>

        <button
          onClick={handleHumanize}
          disabled={!inputText.trim() || isProcessing}
          className={`w-full py-3 rounded-xl font-medium transition-all shadow-sm ${
            !inputText.trim() || isProcessing
              ? "bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]"
              : "bg-[var(--accent)] text-white hover:opacity-85"
          }`}
        >
          {isProcessing ? "Humanizando..." : "Humanizar texto"}
        </button>

        {outputText && (
          <div className="space-y-3">
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Texto humanizado</label>
              <textarea
                value={outputText}
                readOnly
                rows={7}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] font-mono text-sm resize-none"
              />
              <p className="text-[var(--text-tertiary)] text-xs mt-1">
                {wordCount(outputText)} palabras
                {wordDiff !== null && ` · ${wordDiff >= 0 ? `+${wordDiff}%` : `${wordDiff}%`} que el original`}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                </svg>
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                onClick={downloadTxt}
                className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
                </svg>
                Descargar
              </button>
              <button
                onClick={handleHumanize}
                disabled={isProcessing}
                className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-40 flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 1 1-9-9m0 0v9m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[var(--text-tertiary)] text-xs">
            Elimina frases de IA · Conectores humanos · Tono conversacional
          </p>
        </div>
      </div>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("text-humanizer")}>{content}</Layout>;
}