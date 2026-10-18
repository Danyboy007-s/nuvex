import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";

// ============================================
// AJUSTES DE LECTURA
// ============================================
// Zona de silencio: margen del color de fondo alrededor del código.
// El estándar pide ~4 módulos; sin él muchos lectores de celular fallan.
// Se expresa como fracción del tamaño total para que escale con el QR.
const QUIET_ZONE_RATIO = 0.08;

// Resolución del PNG descargado (px del lado del QR, sin contar el marco).
// La vista previa es pequeña, pero para imprimir se necesita más detalle.
const EXPORT_SIZE = 1024;

// Contraste mínimo (escala WCAG, 1 a 21) entre puntos y fondo para
// considerar el QR "seguro" de escanear.
const MIN_CONTRAST = 4;

// Presets: todos usan puntos OSCUROS sobre fondo CLARO. Los QR invertidos
// (puntos claros sobre fondo oscuro) no los leen muchas apps de cámara.
const PRESETS = [
  { name: "Noir", qrColor: "#0f0f0f", bgColor: "#ffffff", dotStyle: "rounded-sm", cornerStyle: "extra-rounded", gradient: null },
  { name: "Ocean", qrColor: "#0369a1", bgColor: "#f0f9ff", dotStyle: "rounded-sm", cornerStyle: "rounded-sm", gradient: { type: "linear", from: "#0369a1", to: "#4338ca" } },
  { name: "Sunset", qrColor: "#c2410c", bgColor: "#fff7ed", dotStyle: "classy-rounded", cornerStyle: "rounded-sm", gradient: { type: "linear", from: "#c2410c", to: "#be185d" } },
  { name: "Forest", qrColor: "#15803d", bgColor: "#f0fdf4", dotStyle: "rounded-sm", cornerStyle: "extra-rounded", gradient: { type: "linear", from: "#15803d", to: "#0f766e" } },
  { name: "Galaxy", qrColor: "#7e22ce", bgColor: "#faf5ff", dotStyle: "rounded-sm", cornerStyle: "rounded-sm", gradient: { type: "radial", from: "#7e22ce", to: "#be185d" } },
  { name: "Gold", qrColor: "#854d0e", bgColor: "#fffbeb", dotStyle: "square", cornerStyle: "square", gradient: { type: "linear", from: "#a16207", to: "#713f12" } },
];

// ============================================
// UTILIDADES DE COLOR
// ============================================
const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Los inputs de texto permiten escribir cualquier cosa; si el color no es
// un hex válido usamos un respaldo para que la librería no falle.
const safeColor = (value, fallback) => (HEX_RE.test(value) ? value : fallback);

// Luminancia relativa según WCAG (0 = negro, 1 = blanco).
function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const DOT_STYLES = [
  { value: "dots", label: "Círculos", icon: "●" },
  { value: "rounded-sm", label: "Redondeado", icon: "◉" },
  { value: "classy-rounded", label: "Classy", icon: "◈" },
  { value: "square", label: "Cuadrado", icon: "■" },
  { value: "extra-rounded", label: "Suave", icon: "⬟" },
];

const CORNER_STYLES = [
  { value: "square", label: "Cuadrado" },
  { value: "rounded-sm", label: "Redondo" },
  { value: "extra-rounded", label: "Circular" },
  { value: "dot", label: "Punto" },
];

const FRAME_STYLES = [
  { value: "none", label: "Sin Marco" },
  { value: "simple", label: "Simple" },
  { value: "badge", label: "Badge" },
  { value: "rounded-sm", label: "Tarjeta" },
];

const LOGO_SIZES = [
  { value: 0.1, label: "S" },
  { value: 0.15, label: "M" },
  { value: 0.2, label: "L" },
  { value: 0.25, label: "XL" },
];

export default function QRGeneratorPage({ standalone = false }) {
  const [text, setText] = useState("");
  const [customName, setCustomName] = useState("qr-code");
  const [qrSize, setQrSize] = useState(280);
  const [qrColor, setQrColor] = useState("#0f0f0f");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState("rounded-sm");
  const [cornerStyle, setCornerStyle] = useState("extra-rounded");
  const [frameStyle, setFrameStyle] = useState("none");
  const [frameLabel, setFrameLabel] = useState("ESCANÉAME");
  const [useGradient, setUseGradient] = useState(false);
  const [gradientFrom, setGradientFrom] = useState("#6366f1");
  const [gradientTo, setGradientTo] = useState("#ec4899");
  const [gradientType, setGradientType] = useState("linear");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoSize, setLogoSize] = useState(0.15);
  const [logoRounded, setLogoRounded] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeTab, setActiveTab] = useState("diseno");
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);
  const wrapperRef = useRef(null);

  const applyPreset = (preset, idx) => {
    setActivePreset(idx);
    setQrColor(preset.qrColor);
    setBgColor(preset.bgColor);
    setDotStyle(preset.dotStyle);
    setCornerStyle(preset.cornerStyle);
    if (preset.gradient) {
      setUseGradient(true);
      setGradientFrom(preset.gradient.from);
      setGradientTo(preset.gradient.to);
      setGradientType(preset.gradient.type);
    } else {
      setUseGradient(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      const reader = new FileReader();
      reader.onload = (ev) => { setLogoPreview(ev.target.result); setLogo(ev.target.result); };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => { setLogo(null); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = ""; };

  // Colores ya validados: lo que se usa para dibujar y para medir contraste.
  const dotColor = safeColor(qrColor, "#000000");
  const backColor = safeColor(bgColor, "#ffffff");
  const gradFrom = safeColor(gradientFrom, dotColor);
  const gradTo = safeColor(gradientTo, dotColor);
  // Color del texto y borde del marco.
  const accentColor = useGradient ? gradFrom : dotColor;

  // Contraste del color MÁS débil de los puntos contra el fondo.
  // Con gradiente, ambos extremos deben contrastar bien.
  const dotColors = useGradient ? [gradFrom, gradTo] : [dotColor];
  const minContrast = Math.min(...dotColors.map((c) => contrastRatio(c, backColor)));
  // QR invertido = puntos más claros que el fondo.
  const isInverted = dotColors.some((c) => luminance(c) > luminance(backColor));
  const scanWarning = isInverted
    ? "Los puntos son más claros que el fondo (QR invertido). Muchas cámaras no lo leerán."
    : minContrast < MIN_CONTRAST
      ? "Poco contraste entre los puntos y el fondo. Puede costar escanearlo."
      : null;

  // Configuración para qr-code-styling. `size` permite reutilizarla tanto
  // para la vista previa (qrSize) como para la descarga (EXPORT_SIZE).
  const buildQRConfig = (size) => ({
    width: size,
    height: size,
    // Zona de silencio (ver QUIET_ZONE_RATIO). Se pinta con el color de fondo.
    margin: Math.round(size * QUIET_ZONE_RATIO),
    data: text,
    image: logo || undefined,
    qrOptions: {
      // Corrección de errores: con logo usamos "H" (tolera ~30% del código
      // tapado); sin logo basta "M" (~15%), que genera un QR menos denso.
      errorCorrectionLevel: logo ? "H" : "M",
    },
    dotsOptions: {
      color: dotColor,
      type: dotStyle,
      ...(useGradient && {
        gradient: {
          type: gradientType,
          rotation: Math.PI / 4, // la librería usa radianes (45°)
          colorStops: [
            { offset: 0, color: gradFrom },
            { offset: 1, color: gradTo },
          ],
        },
      }),
    },
    backgroundOptions: { color: backColor },
    // Los valores de CORNER_STYLES coinciden con los de la librería.
    cornersSquareOptions: {
      color: useGradient ? gradFrom : dotColor,
      type: cornerStyle,
    },
    cornersDotOptions: {
      color: useGradient ? gradTo : dotColor,
      type: cornerStyle === "dot" ? "dot" : undefined,
    },
    imageOptions: {
      crossOrigin: "anonymous",
      // Quita los puntos detrás del logo para que no se mezclen con él.
      hideBackgroundDots: true,
      // El margen del logo se escala con el tamaño del QR.
      margin: Math.round(size * (logoRounded ? 0.02 : 0.015)),
      imageSize: logoSize,
    },
  });

  const downloadQR = async () => {
    if (!text.trim()) return;
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      // Generamos el QR directamente a alta resolución. getRawData() espera a
      // que el logo termine de cargar, así que no hace falta ningún setTimeout.
      const qr = new QRCodeStyling(buildQRConfig(EXPORT_SIZE));
      const blob = await qr.getRawData("png");
      const qrImage = await createImageBitmap(blob);

      // Las medidas del marco están pensadas para la vista previa (~280px);
      // `scale` las ajusta a la resolución de exportación.
      const scale = EXPORT_SIZE / 280;
      const hasFrame = frameStyle !== "none";
      const padding = hasFrame ? Math.round(24 * scale) : 0;
      const labelHeight = hasFrame && frameLabel ? Math.round(36 * scale) : 0;
      const totalW = EXPORT_SIZE + padding * 2;
      const totalH = EXPORT_SIZE + padding * 2 + labelHeight;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = totalW;
      offCanvas.height = totalH;
      const ctx = offCanvas.getContext("2d");

      if (hasFrame) {
        const radius = (frameStyle === "rounded-sm" ? 24 : frameStyle === "badge" ? 12 : 4) * scale;
        ctx.fillStyle = backColor;
        roundRect(ctx, 0, 0, totalW, totalH, radius);
        ctx.fill();
        // Todos los marcos llevan borde, igual que en la vista previa.
        const lineWidth = 3 * scale;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = lineWidth;
        roundRect(ctx, lineWidth / 2, lineWidth / 2, totalW - lineWidth, totalH - lineWidth, radius);
        ctx.stroke();
      }

      ctx.drawImage(qrImage, padding, padding, EXPORT_SIZE, EXPORT_SIZE);

      if (hasFrame && frameLabel) {
        ctx.fillStyle = accentColor;
        ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.letterSpacing = `${Math.round(2 * scale)}px`;
        ctx.fillText(frameLabel.toUpperCase(), totalW / 2, padding + EXPORT_SIZE + labelHeight / 2);
      }

      const link = document.createElement("a");
      link.download = `${customName || "qr-code"}.png`;
      link.href = offCanvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Error descargando QR:", err);
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // Vista previa: se regenera (con una pausa corta) cuando cambia cualquier
  // opción. La configuración entera se pasa como texto JSON y es la única
  // dependencia del efecto, así nunca se queda una opción sin aplicar.
  const previewConfig = text.trim() ? JSON.stringify(buildQRConfig(qrSize)) : null;

  useEffect(() => {
    if (!previewConfig) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setIsGenerating(true);
      try {
        // Import dinámico: la librería usa `window`, así que solo se carga en el navegador.
        const QRCodeStyling = (await import("qr-code-styling")).default;
        if (cancelled || !canvasRef.current) return;
        const qr = new QRCodeStyling(JSON.parse(previewConfig));
        canvasRef.current.innerHTML = "";
        qr.append(canvasRef.current);
      } catch (err) {
        console.error("Error generando QR:", err);
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [previewConfig]);

  const frameWrapperStyle = () => {
    const base = { display: "inline-block", padding: "0" };
    if (frameStyle === "none") return base;
    const border = `2px solid ${accentColor}`;
    if (frameStyle === "simple") return { ...base, border, padding: "16px 16px 0 16px", background: backColor };
    if (frameStyle === "badge") return { ...base, border, borderRadius: "12px", padding: "16px 16px 0 16px", background: backColor };
    if (frameStyle === "rounded-sm") return { ...base, border, borderRadius: "24px", padding: "20px 20px 0 20px", background: backColor };
    return base;
  };

  const tabs = ["diseno", "puntos", "marco", "logo"];
  const tabLabels = { diseno: "Diseño", puntos: "Puntos", marco: "Marco", logo: "Logo" };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header - responsive */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-(--surface) border border-(--border) mb-3 sm:mb-4">
          <span className="text-[10px] sm:text-xs text-(--text-tertiary) tracking-widest uppercase">NUVEX</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-(--text-primary)">Generador QR</h1>
        <p className="text-(--text-secondary) text-xs sm:text-sm mt-1 sm:mt-2 px-4">Códigos QR con gradientes, marcos y estilos personalizados</p>
      </div>

      {/* Grid responsive: columna en móvil, dos columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* Controles - arriba en móvil, izquierda en desktop */}
        <div className="flex-1 space-y-5 order-2 lg:order-1">
          {/* URL input */}
          <div>
            <label className="block text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 sm:mb-2">Texto o URL</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://ejemplo.com"
              className="w-full bg-(--surface) border border-(--border) rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-(--text-primary) text-sm placeholder:text-(--text-tertiary) focus:outline-hidden focus:border-(--accent) transition"
            />
          </div>

          {/* Presets - grid 2 columnas en móvil, 3 en desktop */}
          <div>
            <label className="block text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p, i)}
                  className={`relative py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-semibold tracking-wide transition-all border ${activePreset === i ? "border-(--accent) ring-1 ring-(--accent)" : "border-(--border) hover:border-(--text-tertiary)"}`}
                  style={{ background: p.bgColor, color: p.qrColor }}
                >
                  {p.gradient ? (
                    <span style={{ background: `linear-gradient(135deg, ${p.gradient.from}, ${p.gradient.to})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {p.name}
                    </span>
                  ) : p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs - responsive wrapping */}
          <div>
            <div className="flex flex-wrap gap-1 bg-(--surface) border border-(--border) rounded-xl p-1 mb-4">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${activeTab === t ? "bg-(--accent) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"}`}
                >
                  {tabLabels[t]}
                </button>
              ))}
            </div>

            {/* Resto del contenido de tabs (sin cambios, ya es responsive por sí mismo) */}
            {/* Tab: Diseño */}
            {activeTab === "diseno" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Color QR</label>
                    <div className="flex gap-2">
                      <input type="color" value={qrColor} onChange={(e) => { setQrColor(e.target.value); setActivePreset(null); }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-(--border) cursor-pointer bg-(--surface) shrink-0" />
                      <input type="text" value={qrColor} onChange={(e) => { setQrColor(e.target.value); setActivePreset(null); }} className="flex-1 bg-(--surface) border border-(--border) rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-(--text-primary) text-[10px] sm:text-xs font-mono min-w-0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Color fondo</label>
                    <div className="flex gap-2">
                      <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActivePreset(null); }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-(--border) cursor-pointer bg-(--surface) shrink-0" />
                      <input type="text" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActivePreset(null); }} className="flex-1 bg-(--surface) border border-(--border) rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-(--text-primary) text-[10px] sm:text-xs font-mono min-w-0" />
                    </div>
                  </div>
                </div>

                <div className="bg-(--surface) border border-(--border) rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-(--text-primary) text-xs sm:text-sm font-medium">Gradiente</span>
                    <button
                      onClick={() => setUseGradient(v => !v)}
                      className={`relative w-9 sm:w-10 h-4 sm:h-5 rounded-full transition-colors ${useGradient ? "bg-(--accent)" : "bg-(--border)"}`}
                    >
                      <span className={`absolute top-0.5 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white shadow-sm transition-all ${useGradient ? "left-4 sm:left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  {useGradient && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-(--text-tertiary) text-[10px] mb-1">Desde</label>
                          <div className="flex gap-2">
                            <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-(--border) cursor-pointer shrink-0" />
                            <input type="text" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1 bg-(--surface-hover) border border-(--border) rounded-lg px-1.5 sm:px-2 py-1 text-(--text-primary) text-[10px] font-mono min-w-0" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-(--text-tertiary) text-[10px] mb-1">Hasta</label>
                          <div className="flex gap-2">
                            <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-(--border) cursor-pointer shrink-0" />
                            <input type="text" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1 bg-(--surface-hover) border border-(--border) rounded-lg px-1.5 sm:px-2 py-1 text-(--text-primary) text-[10px] font-mono min-w-0" />
                          </div>
                        </div>
                      </div>
                      <div className="h-5 sm:h-6 rounded-lg" style={{ background: gradientType === "radial" ? `radial-gradient(${gradientFrom}, ${gradientTo})` : `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }} />
                      <div className="flex gap-2">
                        {["linear", "radial"].map(t => (
                          <button key={t} onClick={() => setGradientType(t)} className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all ${gradientType === t ? "bg-(--accent) text-white border-(--accent)" : "border-(--border) text-(--text-secondary)"}`}>
                            {t === "linear" ? "Lineal" : "Radial"}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Tamaño: {qrSize}px</label>
                  <input type="range" min="180" max="400" step="10" value={qrSize} onChange={(e) => setQrSize(parseInt(e.target.value))} className="w-full h-1.5 bg-(--border) rounded-full accent-(--accent)" />
                </div>
              </div>
            )}

            {/* Tab: Puntos */}
            {activeTab === "puntos" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Estilo de puntos</label>
                  <div className="grid grid-cols-1 gap-2">
                    {DOT_STYLES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setDotStyle(s.value)}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${dotStyle === s.value ? "bg-(--accent) text-white border-(--accent)" : "bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)"}`}
                      >
                        <span className="text-base sm:text-lg w-5 sm:w-6 text-center">{s.icon}</span>
                        <span className="text-[11px] sm:text-sm">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Esquinas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CORNER_STYLES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setCornerStyle(s.value)}
                        className={`py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-medium transition-all ${cornerStyle === s.value ? "bg-(--accent) text-white border-(--accent)" : "bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)"}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Marco */}
            {activeTab === "marco" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Estilo de marco</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRAME_STYLES.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFrameStyle(f.value)}
                        className={`py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-medium transition-all ${frameStyle === f.value ? "bg-(--accent) text-white border-(--accent)" : "bg-(--surface) border-(--border) text-(--text-secondary) hover:text-(--text-primary)"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {frameStyle !== "none" && (
                  <div>
                    <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Texto del marco</label>
                    <input
                      type="text"
                      value={frameLabel}
                      onChange={(e) => setFrameLabel(e.target.value)}
                      maxLength={20}
                      className="w-full bg-(--surface) border border-(--border) rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-(--text-primary) text-xs sm:text-sm focus:outline-hidden focus:border-(--accent) transition"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Nombre del archivo</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-(--surface) border border-(--border) rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-(--text-primary) text-xs sm:text-sm focus:outline-hidden focus:border-(--accent) transition"
                  />
                </div>
              </div>
            )}

            {/* Tab: Logo */}
            {activeTab === "logo" && (
              <div className="space-y-4">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-6 sm:py-8 rounded-xl bg-(--surface) border-2 border-dashed border-(--border) text-(--text-tertiary) text-xs sm:text-sm font-medium hover:border-(--accent) hover:text-(--accent) transition-colors flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Subir logo PNG o JPG
                </button>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />

                {logoPreview && (
                  <>
                    <div className="flex items-center gap-3 bg-(--surface) border border-(--border) rounded-xl p-2 sm:p-3">
                      <img src={logoPreview} alt="Logo" className={`w-10 h-10 sm:w-12 sm:h-12 object-cover border border-(--border) ${logoRounded ? "rounded-xl" : "rounded-xs"}`} />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-(--text-primary) font-medium">Logo cargado</p>
                        <p className="text-[10px] sm:text-xs text-(--text-tertiary)">Se centrará en el QR</p>
                      </div>
                      <button onClick={removeLogo} className="text-red-400 hover:text-red-500 text-[10px] sm:text-xs font-medium">Quitar</button>
                    </div>

                    <div>
                      <label className="block text-(--text-secondary) text-[10px] sm:text-xs mb-1.5 sm:mb-2">Tamaño del logo</label>
                      <div className="flex gap-2">
                        {LOGO_SIZES.map(o => (
                          <button key={o.value} onClick={() => setLogoSize(o.value)} className={`flex-1 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${logoSize === o.value ? "bg-(--accent) text-white border-(--accent)" : "bg-(--surface) border-(--border) text-(--text-secondary)"}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-(--surface) border border-(--border) rounded-xl p-2 sm:p-3">
                      <span className="text-xs sm:text-sm text-(--text-primary)">Bordes redondeados</span>
                      <button
                        onClick={() => setLogoRounded(v => !v)}
                        className={`relative w-9 sm:w-10 h-4 sm:h-5 rounded-full transition-colors ${logoRounded ? "bg-(--accent)" : "bg-(--border)"}`}
                      >
                        <span className={`absolute top-0.5 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white shadow-sm transition-all ${logoRounded ? "left-4 sm:left-5" : "left-0.5"}`} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Download */}
          {text.trim() && (
            <button
              onClick={downloadQR}
              className="w-full py-2.5 sm:py-3 rounded-xl bg-(--surface) border border-(--border) text-(--text-primary) text-xs sm:text-sm font-medium hover:bg-(--surface-hover) transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar {customName}.png
            </button>
          )}
        </div>

        {/* Vista previa - abajo en móvil, derecha en desktop */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 order-1 lg:order-2">
          <label className="text-(--text-secondary) text-[10px] sm:text-xs uppercase tracking-widest">Vista previa</label>

          <div
            className="transition-all duration-500 flex justify-center"
            style={{
              ...frameWrapperStyle(),
              boxShadow: frameStyle !== "none" ? `0 8px 32px ${accentColor}22` : "none",
            }}
          >
            <div
              ref={canvasRef}
              className="transition-all duration-300 flex justify-center"
              style={{ display: "block", lineHeight: 0 }}
            />
            {frameStyle !== "none" && frameLabel && (
              <div
                className="text-center py-2 tracking-[0.15em] sm:tracking-[0.2em] text-[10px] sm:text-xs font-bold"
                style={{ color: accentColor }}
              >
                {frameLabel.toUpperCase()}
              </div>
            )}
          </div>

          {!text.trim() && (
            <div
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-(--border)"
              style={{ width: qrSize, height: qrSize }}
            >
              <p className="text-(--text-tertiary) text-[10px] sm:text-xs text-center px-6">Escribe una URL<br />para generar tu QR</p>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 text-(--text-tertiary) text-[10px] sm:text-xs">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
              </svg>
              Generando...
            </div>
          )}

          {/* Aviso si los colores elegidos pueden impedir que se escanee */}
          {text.trim() && scanWarning && (
            <p className="max-w-[280px] text-center text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
              ⚠ {scanWarning}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("qr-generator")}>{content}</Layout>;
}