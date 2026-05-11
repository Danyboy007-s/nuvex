import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";

export default function QRGeneratorPage({ standalone = false }) {
  const [text, setText] = useState("");
  const [customName, setCustomName] = useState("qr-code");
  const [qrSize, setQrSize] = useState(250);
  const [qrColor, setQrColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [dotStyle, setDotStyle] = useState("rounded");
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoSize, setLogoSize] = useState(0.15);
  const [isClient, setIsClient] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);
  const logoInputRef = useRef(null);

  const dotStyles = [
    { value: "rounded", label: "Redondo", icon: "●" },
    { value: "square", label: "Cuadrado", icon: "■" },
    { value: "diamond", label: "Diamante", icon: "◆" },
  ];

  const logoSizeOptions = [
    { value: 0.1, label: "Pequeño", size: "10%" },
    { value: 0.15, label: "Mediano", size: "15%" },
    { value: 0.2, label: "Grande", size: "20%" },
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
        setLogo(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const generateQR = async () => {
    if (!text.trim() || !isClient) return;
    
    setIsGenerating(true);
    
    try {
      const QRCodeStyling = (await import("qr-code-styling")).default;
      
      const qr = new QRCodeStyling({
        width: qrSize,
        height: qrSize,
        data: text,
        image: logo || null,
        dotsOptions: {
          color: qrColor,
          type: dotStyle,
        },
        backgroundOptions: {
          color: bgColor,
        },
        cornersSquareOptions: {
          color: qrColor,
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 10,
          imageSize: logoSize,
        },
      });
      
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        qr.append(canvasRef.current);
      }
    } catch (error) {
      console.error("QR generation error:", error);
    }
    
    setIsGenerating(false);
  };

  const downloadQR = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${customName}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  useEffect(() => {
    if (text.trim() && isClient) {
      const timeout = setTimeout(() => {
        generateQR();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [text, qrColor, bgColor, dotStyle, logo, logoSize, qrSize, isClient]);

  const content = (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <rect width="5" height="5" x="3" y="3" rx="1"/>
            <rect width="5" height="5" x="16" y="3" rx="1"/>
            <rect width="5" height="5" x="3" y="16" rx="1"/>
            <path d="M21 16h-3a2 2 0 0 0-2 2v3"/>
            <path d="M21 21v.01"/>
            <path d="M12 7v3a2 2 0 0 1-2 2H7"/>
            <path d="M3 12h.01"/>
            <path d="M12 3h.01"/>
            <path d="M12 16v.01"/>
            <path d="M16 12h1"/>
            <path d="M21 12v.01"/>
            <path d="M12 21v-1"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">Generador QR</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Crea códigos QR con logo y colores personalizados</p>
        <div className="w-8 h-px bg-[var(--border)] mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-[var(--text-secondary)] text-sm mb-2">Texto o URL</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://ejemplo.com o cualquier texto"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Color QR</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-[var(--surface)]"
              />
              <input
                type="text"
                value={qrColor}
                onChange={(e) => setQrColor(e.target.value)}
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm font-mono"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Color fondo</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-[var(--surface)]"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm font-mono"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Forma de puntos</label>
            <div className="flex gap-2">
              {dotStyles.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setDotStyle(style.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    dotStyle === style.value
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {style.icon} {style.label}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Tamaño QR</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="150"
                max="400"
                step="10"
                value={qrSize}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[var(--surface-hover)] rounded-lg"
              />
              <span className="text-sm text-[var(--text-secondary)] w-12">{qrSize}px</span>
            </div>
          </div>
        </div>
        
        {/* Logo */}
        <div>
          <label className="block text-[var(--text-secondary)] text-sm mb-2">Logo (opcional)</label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Subir logo
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleLogoUpload}
              className="hidden"
            />
            {logoPreview && (
              <button
                onClick={removeLogo}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
          
          {logoPreview && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={logoPreview} alt="Logo preview" className="w-10 h-10 rounded-lg object-cover border border-[var(--border)]" />
                <span className="text-xs text-[var(--text-tertiary)]">Logo incluido en el centro</span>
              </div>
              
              <div>
                <label className="block text-[var(--text-secondary)] text-xs mb-2">Tamaño del logo</label>
                <div className="flex gap-2">
                  {logoSizeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLogoSize(opt.value)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        logoSize === opt.value
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {opt.label} ({opt.size})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="mi-qr"
            className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
          />
        </div>
        
        <button
          onClick={generateQR}
          disabled={!text.trim() || isGenerating || !isClient}
          className={`w-full py-3 rounded-xl font-medium transition-all duration-300 ${
            !text.trim() || isGenerating || !isClient
              ? "bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]"
              : "bg-[var(--accent)] text-white hover:opacity-85 shadow-sm"
          }`}
        >
          {isGenerating ? "Generando..." : "Generar QR"}
        </button>
        
        <div className="flex justify-center py-6">
          <div 
            ref={canvasRef} 
            className="bg-[var(--surface)] rounded-xl p-4 border border-[var(--border)] transition-all duration-300 hover:shadow-md"
          />
        </div>
        
        {text.trim() && (
          <button
            onClick={downloadQR}
            className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
            </svg>
            Descargar {customName}.png
          </button>
        )}
      </div>

      <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)] mt-5">
        <p className="text-[var(--text-tertiary)] text-xs">Colores personalizados · Logo centrado · Tamaño ajustable</p>
      </div>
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — Generador QR Profesional">{content}</Layout>;
}