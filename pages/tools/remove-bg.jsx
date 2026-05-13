import { useState, useRef, useEffect } from "react";
import Layout from "../../components/Layout";

export default function RemoveBgPage({ standalone = false }) {
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [tolerance, setTolerance] = useState(30);
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [autoDetect, setAutoDetect] = useState(true);
  const [customName, setCustomName] = useState("sin-fondo");
  const [eyeDropperSupported, setEyeDropperSupported] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    setEyeDropperSupported(typeof EyeDropper !== "undefined");
  }, []);

  useEffect(() => {
    if (originalImage && !isProcessing) {
      const timeout = setTimeout(() => {
        applyTransparency();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [tolerance, selectedColor, originalImage]);

  const processImage = (file) => {
    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG o WEBP.");
      return;
    }

    setError(null);
    setResultImage(null);
    setCustomName(file.name.split('.')[0] || "sin-fondo");

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target.result);
      if (autoDetect) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const pixel = ctx.getImageData(10, 10, 1, 1).data;
          const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
          setSelectedColor(hex);
        };
        img.src = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const applyTransparency = async () => {
    if (!originalImage) return;
    
    try {
      const img = imgRef.current;
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      
      await new Promise((resolve) => {
        img.onload = resolve;
        img.src = originalImage;
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const r = parseInt(selectedColor.slice(1, 3), 16);
      const g = parseInt(selectedColor.slice(3, 5), 16);
      const b = parseInt(selectedColor.slice(5, 7), 16);
      
      for (let i = 0; i < data.length; i += 4) {
        const pr = data[i];
        const pg = data[i+1];
        const pb = data[i+2];
        
        const diff = Math.sqrt(
          Math.pow(pr - r, 2) + 
          Math.pow(pg - g, 2) + 
          Math.pow(pb - b, 2)
        );
        
        if (diff < tolerance) {
          data[i+3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      setResultImage(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error(err);
      setError("Error al procesar la imagen.");
    }
  };

  const pickColorWithEyeDropper = async () => {
    if (!eyeDropperSupported) {
      setError("Tu navegador no soporta el selector de color. Usa el selector manual.");
      return;
    }
    
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      setSelectedColor(result.sRGBHex);
      setAutoDetect(false);
    } catch (err) {}
  };

  const handleImageClick = (e) => {
    if (!originalImage || autoDetect) return;
    
    const img = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const rect = e.target.getBoundingClientRect();
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (x >= 0 && x < img.width && y >= 0 && y < img.height) {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
      setSelectedColor(hex);
      setAutoDetect(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processImage(file);
  };

  const downloadImage = () => {
    if (!resultImage) return;
    const link = document.createElement("a");
    link.download = `${customName}.png`;
    link.href = resultImage;
    link.click();
  };

  const resetAll = () => {
    setOriginalImage(null);
    setResultImage(null);
    setError(null);
    setTolerance(30);
    setSelectedColor("#ffffff");
    setAutoDetect(true);
    setCustomName("sin-fondo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] mb-3">
          <span className="text-xs text-[var(--text-tertiary)] tracking-wider uppercase">Beta</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[var(--text-primary)]">Eliminar fondo</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-2 max-w-md mx-auto">
          Perfecto para fondos de color plano o uniforme
        </p>
      </div>

      {!originalImage && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer
            transition-all duration-200
            ${dragActive 
              ? "border-[var(--accent)] bg-[var(--accent)]/5" 
              : "border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface)]/30"
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          
          <svg className="w-12 h-12 mx-auto mb-4 text-[var(--text-tertiary)] opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          
          <p className="text-[var(--text-secondary)] text-sm font-medium">
            Arrastra una imagen o haz clic para seleccionar
          </p>
          <p className="text-[var(--text-tertiary)] text-xs mt-2">
            PNG · JPG · WEBP
          </p>
        </div>
      )}

      {originalImage && (
        <div className="mt-6 space-y-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[var(--text-secondary)] text-sm">Detección automática</label>
              <button
                onClick={() => setAutoDetect(!autoDetect)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoDetect ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoDetect ? "left-5" : "left-0.5"}`} />
              </button>
            </div>

            {!autoDetect && (
              <div>
                <label className="block text-[var(--text-secondary)] text-sm mb-2">Color a eliminar</label>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-[var(--border)] cursor-pointer bg-[var(--surface)]"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="flex-1 min-w-[100px] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const img = new Image();
                        img.src = originalImage;
                        img.onload = () => {
                          const canvas = document.createElement("canvas");
                          const ctx = canvas.getContext("2d");
                          canvas.width = img.width;
                          canvas.height = img.height;
                          ctx.drawImage(img, 0, 0);
                          const pixel = ctx.getImageData(10, 10, 1, 1).data;
                          const hex = "#" + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
                          setSelectedColor(hex);
                        };
                      }}
                      className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors"
                    >
                      Esquina
                    </button>
                    
                    {eyeDropperSupported && (
                      <button
                        onClick={pickColorWithEyeDropper}
                        className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                        title="Selecciona un color de la pantalla"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 2m0 0l2 2m-2-2h6M6 6h2m-2 2h2m-2 4h6M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Lupa
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                  Haz clic en la imagen para seleccionar el color a eliminar
                </p>
              </div>
            )}

            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">
                Tolerancia: {tolerance}
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={tolerance}
                onChange={(e) => setTolerance(parseInt(e.target.value))}
                className="w-full h-2 bg-[var(--border)] rounded-full accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                <span>Solo color exacto</span>
                <span>Más tolerancia</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Original</p>
              </div>
              <div 
                className="aspect-square flex items-center justify-center p-4 bg-[var(--surface-hover)]/30 cursor-crosshair"
                onClick={!autoDetect ? handleImageClick : undefined}
                title={!autoDetect ? "Haz clic para seleccionar el color" : "Activa selección manual para elegir color"}
              >
                <img 
                  src={originalImage} 
                  alt="Original" 
                  className="max-w-full max-h-full object-contain pointer-events-none" 
                />
              </div>
              {!autoDetect && (
                <div className="p-2 text-center text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-hover)]/30 border-t border-[var(--border)]">
                  Haz clic en la imagen para elegir el color
                </div>
              )}
            </div>

            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Sin fondo</p>
              </div>
              <div className="aspect-square flex items-center justify-center p-4 relative">
                <div className="absolute inset-0 bg-[repeating-conic-gradient(#ccc_0%_25%,#e5e5e5_0%_50%)] bg-[length:20px_20px] opacity-30 rounded-xl" />
                {resultImage ? (
                  <img src={resultImage} alt="Sin fondo" className="max-w-full max-h-full object-contain relative z-10" />
                ) : (
                  <div className="relative z-10 text-center">
                    <div className="w-8 h-8 mx-auto mb-2 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--text-tertiary)] text-sm">Procesando...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 space-y-3">
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="sin-fondo"
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)] transition"
                />
                <span className="text-sm text-[var(--text-tertiary)] py-2">.png</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {resultImage && (
                <button
                  onClick={downloadImage}
                  className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-85 transition-opacity flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar PNG
                </button>
              )}
              <button
                onClick={resetAll}
                className="flex-1 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-[10px] text-[var(--text-tertiary)] opacity-60">
          Fondo transparente · Procesamiento local
        </p>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={previewCanvasRef} style={{ display: "none" }} />
      <img ref={imgRef} style={{ display: "none" }} alt="" />
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — Eliminar fondo de imágenes | Herramienta gratuita">{content}</Layout>;
}