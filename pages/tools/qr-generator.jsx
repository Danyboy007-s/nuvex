import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";

const PRESETS = [
  { name: "Noir", qrColor: "#0f0f0f", bgColor: "#ffffff", dotStyle: "rounded", cornerStyle: "extra-rounded", gradient: null },
  { name: "Ocean", qrColor: "#0ea5e9", bgColor: "#0f172a", dotStyle: "rounded", cornerStyle: "rounded", gradient: { type: "linear", from: "#0ea5e9", to: "#6366f1" } },
  { name: "Sunset", qrColor: "#f97316", bgColor: "#fff7ed", dotStyle: "classy-rounded", cornerStyle: "rounded", gradient: { type: "linear", from: "#f97316", to: "#ec4899" } },
  { name: "Forest", qrColor: "#16a34a", bgColor: "#f0fdf4", dotStyle: "rounded", cornerStyle: "extra-rounded", gradient: { type: "linear", from: "#16a34a", to: "#0d9488" } },
  { name: "Galaxy", qrColor: "#a855f7", bgColor: "#0a0a1a", dotStyle: "rounded", cornerStyle: "rounded", gradient: { type: "radial", from: "#a855f7", to: "#ec4899" } },
  { name: "Gold", qrColor: "#ca8a04", bgColor: "#1c1008", dotStyle: "square", cornerStyle: "square", gradient: { type: "linear", from: "#fbbf24", to: "#ca8a04" } },
];

const DOT_STYLES = [
  { value: "dots", label: "Círculos", icon: "●" },
  { value: "rounded", label: "Redondeado", icon: "◉" },
  { value: "classy-rounded", label: "Classy", icon: "◈" },
  { value: "square", label: "Cuadrado", icon: "■" },
  { value: "extra-rounded", label: "Suave", icon: "⬟" },
];

const CORNER_STYLES = [
  { value: "square", label: "Cuadrado" },
  { value: "rounded", label: "Redondo" },
  { value: "extra-rounded", label: "Circular" },
  { value: "dot", label: "Punto" },
];

const FRAME_STYLES = [
  { value: "none", label: "Sin Marco" },
  { value: "simple", label: "Simple" },
  { value: "badge", label: "Badge" },
  { value: "rounded", label: "Tarjeta" },
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
  const [dotStyle, setDotStyle] = useState("rounded");
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
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState(null);
  const [activeTab, setActiveTab] = useState("diseno");
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => { setIsClient(true); }, []);

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

  const buildQRConfig = () => ({
    width: qrSize,
    height: qrSize,
    data: text,
    image: logo || null,
    dotsOptions: {
      color: qrColor,
      type: dotStyle,
      ...(useGradient && {
        gradient: {
          type: gradientType,
          rotation: 45,
          colorStops: [
            { offset: 0, color: gradientFrom },
            { offset: 1, color: gradientTo },
          ],
        },
      }),
    },
    backgroundOptions: { color: bgColor },
    cornersSquareOptions: {
      color: useGradient ? gradientFrom : qrColor,
      type: cornerStyle === "dot" ? "dot" : cornerStyle === "extra-rounded" ? "extra-rounded" : cornerStyle === "rounded" ? "rounded" : "square",
    },
    cornersDotOptions: {
      color: useGradient ? gradientTo : qrColor,
      type: cornerStyle === "dot" ? "dot" : undefined,
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: logoRounded ? 6 : 4,
      imageSize: logoSize,
    },
  });

  const generateQR = async () => {
    if (!text.trim() || !isClient) return;
    setIsGenerating(true);
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      const qr = new QRCodeStyling(buildQRConfig());
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        qr.append(canvasRef.current);
        if (logo && logoRounded) {
          setTimeout(() => {
            const img = canvasRef.current?.querySelector('canvas');
          }, 100);
        }
      }
    } catch (err) {
      console.error("QR generation error:", err);
    }
    setIsGenerating(false);
  };

  const downloadQR = async () => {
    if (!text.trim() || !isClient) return;
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;

      const padding = frameStyle !== "none" ? 40 : 0;
      const labelHeight = frameStyle !== "none" ? 36 : 0;
      const totalH = qrSize + padding * 2 + labelHeight;
      const totalW = qrSize + padding * 2;

      const offCanvas = document.createElement("canvas");
      offCanvas.width = totalW;
      offCanvas.height = totalH;
      const ctx = offCanvas.getContext("2d");

      if (frameStyle !== "none") {
        const radius = frameStyle === "rounded" ? 24 : frameStyle === "badge" ? 12 : 4;
        ctx.fillStyle = bgColor;
        roundRect(ctx, 0, 0, totalW, totalH, radius);
        ctx.fill();
        if (frameStyle === "badge" || frameStyle === "rounded") {
          ctx.strokeStyle = useGradient ? gradientFrom : qrColor;
          ctx.lineWidth = 3;
          roundRect(ctx, 2, 2, totalW - 4, totalH - 4, radius);
          ctx.stroke();
        }
      }

      const tmp = document.createElement("div");
      document.body.appendChild(tmp);
      const qr = new QRCodeStyling(buildQRConfig());
      qr.append(tmp);
      await new Promise(r => setTimeout(r, 500));
      const srcCanvas = tmp.querySelector("canvas");
      if (srcCanvas) ctx.drawImage(srcCanvas, padding, padding, qrSize, qrSize);
      document.body.removeChild(tmp);

      if (frameStyle !== "none" && frameLabel) {
        ctx.fillStyle = useGradient ? gradientFrom : qrColor;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.letterSpacing = "2px";
        ctx.fillText(frameLabel.toUpperCase(), totalW / 2, padding + qrSize + labelHeight / 1.5);
      }

      const link = document.createElement("a");
      link.download = `${customName}.png`;
      link.href = offCanvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
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

  useEffect(() => {
    if (text.trim() && isClient) {
      const t = setTimeout(generateQR, 350);
      return () => clearTimeout(t);
    }
  }, [text, qrColor, bgColor, dotStyle, cornerStyle, logo, logoSize, logoRounded, qrSize, isClient, useGradient, gradientFrom, gradientTo, gradientType]);

  const frameWrapperStyle = () => {
    const base = { display: "inline-block", padding: "0" };
    if (frameStyle === "none") return base;
    const border = `2px solid ${useGradient ? gradientFrom : qrColor}`;
    if (frameStyle === "simple") return { ...base, border, padding: "16px" };
    if (frameStyle === "badge") return { ...base, border, borderRadius: "12px", padding: "16px 16px 0 16px", background: bgColor };
    if (frameStyle === "rounded") return { ...base, border, borderRadius: "24px", padding: "20px 20px 0 20px", background: bgColor };
    return base;
  };

  const tabs = ["diseno", "puntos", "marco", "logo"];
  const tabLabels = { diseno: "Diseño", puntos: "Puntos", marco: "Marco", logo: "Logo" };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header - responsive */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] mb-3 sm:mb-4">
          <span className="text-[10px] sm:text-xs text-[var(--text-tertiary)] tracking-widest uppercase">NUVEX</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[var(--text-primary)]">Generador QR</h1>
        <p className="text-[var(--text-secondary)] text-xs sm:text-sm mt-1 sm:mt-2 px-4">Códigos QR con gradientes, marcos y estilos personalizados</p>
      </div>

      {/* Grid responsive: columna en móvil, dos columnas en desktop */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* Controles - arriba en móvil, izquierda en desktop */}
        <div className="flex-1 space-y-5 order-2 lg:order-1">
          {/* URL input */}
          <div>
            <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest mb-1.5 sm:mb-2">Texto o URL</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://ejemplo.com"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
            />
          </div>

          {/* Presets - grid 2 columnas en móvil, 3 en desktop */}
          <div>
            <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p, i)}
                  className={`relative py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-semibold tracking-wide transition-all border ${activePreset === i ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--text-tertiary)]"}`}
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
            <div className="flex flex-wrap gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 mb-4">
              {tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${activeTab === t ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
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
                    <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Color QR</label>
                    <div className="flex gap-2">
                      <input type="color" value={qrColor} onChange={(e) => { setQrColor(e.target.value); setActivePreset(null); }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-[var(--surface)] flex-shrink-0" />
                      <input type="text" value={qrColor} onChange={(e) => { setQrColor(e.target.value); setActivePreset(null); }} className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[var(--text-primary)] text-[10px] sm:text-xs font-mono min-w-0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Color fondo</label>
                    <div className="flex gap-2">
                      <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActivePreset(null); }} className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-[var(--surface)] flex-shrink-0" />
                      <input type="text" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActivePreset(null); }} className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[var(--text-primary)] text-[10px] sm:text-xs font-mono min-w-0" />
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-primary)] text-xs sm:text-sm font-medium">Gradiente</span>
                    <button
                      onClick={() => setUseGradient(v => !v)}
                      className={`relative w-9 sm:w-10 h-4 sm:h-5 rounded-full transition-colors ${useGradient ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                    >
                      <span className={`absolute top-0.5 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white shadow transition-all ${useGradient ? "left-4 sm:left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                  {useGradient && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[var(--text-tertiary)] text-[10px] mb-1">Desde</label>
                          <div className="flex gap-2">
                            <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[var(--border)] cursor-pointer flex-shrink-0" />
                            <input type="text" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-1.5 sm:px-2 py-1 text-[var(--text-primary)] text-[10px] font-mono min-w-0" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[var(--text-tertiary)] text-[10px] mb-1">Hasta</label>
                          <div className="flex gap-2">
                            <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[var(--border)] cursor-pointer flex-shrink-0" />
                            <input type="text" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1 bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg px-1.5 sm:px-2 py-1 text-[var(--text-primary)] text-[10px] font-mono min-w-0" />
                          </div>
                        </div>
                      </div>
                      <div className="h-5 sm:h-6 rounded-lg" style={{ background: gradientType === "radial" ? `radial-gradient(${gradientFrom}, ${gradientTo})` : `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }} />
                      <div className="flex gap-2">
                        {["linear", "radial"].map(t => (
                          <button key={t} onClick={() => setGradientType(t)} className={`flex-1 py-1 rounded-lg text-[10px] font-medium border transition-all ${gradientType === t ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)]"}`}>
                            {t === "linear" ? "Lineal" : "Radial"}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Tamaño: {qrSize}px</label>
                  <input type="range" min="180" max="400" step="10" value={qrSize} onChange={(e) => setQrSize(parseInt(e.target.value))} className="w-full h-1.5 bg-[var(--border)] rounded-full accent-[var(--accent)]" />
                </div>
              </div>
            )}

            {/* Tab: Puntos */}
            {activeTab === "puntos" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Estilo de puntos</label>
                  <div className="grid grid-cols-1 gap-2">
                    {DOT_STYLES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setDotStyle(s.value)}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${dotStyle === s.value ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                      >
                        <span className="text-base sm:text-lg w-5 sm:w-6 text-center">{s.icon}</span>
                        <span className="text-[11px] sm:text-sm">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Esquinas</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CORNER_STYLES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setCornerStyle(s.value)}
                        className={`py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-medium transition-all ${cornerStyle === s.value ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
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
                  <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest mb-2 sm:mb-3">Estilo de marco</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FRAME_STYLES.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFrameStyle(f.value)}
                        className={`py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-medium transition-all ${frameStyle === f.value ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {frameStyle !== "none" && (
                  <div>
                    <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Texto del marco</label>
                    <input
                      type="text"
                      value={frameLabel}
                      onChange={(e) => setFrameLabel(e.target.value)}
                      maxLength={20}
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Nombre del archivo</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition"
                  />
                </div>
              </div>
            )}

            {/* Tab: Logo */}
            {activeTab === "logo" && (
              <div className="space-y-4">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-6 sm:py-8 rounded-xl bg-[var(--surface)] border-2 border-dashed border-[var(--border)] text-[var(--text-tertiary)] text-xs sm:text-sm font-medium hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex flex-col items-center gap-2"
                >
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Subir logo PNG o JPG
                </button>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" onChange={handleLogoUpload} className="hidden" />

                {logoPreview && (
                  <>
                    <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2 sm:p-3">
                      <img src={logoPreview} alt="Logo" className={`w-10 h-10 sm:w-12 sm:h-12 object-cover border border-[var(--border)] ${logoRounded ? "rounded-xl" : "rounded-sm"}`} />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm text-[var(--text-primary)] font-medium">Logo cargado</p>
                        <p className="text-[10px] sm:text-xs text-[var(--text-tertiary)]">Se centrará en el QR</p>
                      </div>
                      <button onClick={removeLogo} className="text-red-400 hover:text-red-500 text-[10px] sm:text-xs font-medium">Quitar</button>
                    </div>

                    <div>
                      <label className="block text-[var(--text-secondary)] text-[10px] sm:text-xs mb-1.5 sm:mb-2">Tamaño del logo</label>
                      <div className="flex gap-2">
                        {LOGO_SIZES.map(o => (
                          <button key={o.value} onClick={() => setLogoSize(o.value)} className={`flex-1 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-bold border transition-all ${logoSize === o.value ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]"}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl p-2 sm:p-3">
                      <span className="text-xs sm:text-sm text-[var(--text-primary)]">Bordes redondeados</span>
                      <button
                        onClick={() => setLogoRounded(v => !v)}
                        className={`relative w-9 sm:w-10 h-4 sm:h-5 rounded-full transition-colors ${logoRounded ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                      >
                        <span className={`absolute top-0.5 w-3.5 sm:w-4 h-3.5 sm:h-4 rounded-full bg-white shadow transition-all ${logoRounded ? "left-4 sm:left-5" : "left-0.5"}`} />
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
              className="w-full py-2.5 sm:py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-xs sm:text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
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
          <label className="text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase tracking-widest">Vista previa</label>

          <div
            className="transition-all duration-500 flex justify-center"
            style={{
              ...frameWrapperStyle(),
              boxShadow: frameStyle !== "none" ? `0 8px 32px ${(useGradient ? gradientFrom : qrColor)}22` : "none",
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
                style={{ color: useGradient ? gradientFrom : qrColor }}
              >
                {frameLabel.toUpperCase()}
              </div>
            )}
          </div>

          {!text.trim() && (
            <div
              className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)]"
              style={{ width: qrSize, height: qrSize }}
            >
              <p className="text-[var(--text-tertiary)] text-[10px] sm:text-xs text-center px-6">Escribe una URL<br />para generar tu QR</p>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[10px] sm:text-xs">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
              </svg>
              Generando...
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — QR Artístico | Códigos QR profesionales">{content}</Layout>;
}