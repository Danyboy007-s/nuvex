import { useState } from "react";
import Layout from "../../components/Layout";
import imageCompression from "browser-image-compression";

export default function FileUtilsPage({ standalone = false }) {
  const [image, setImage] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [compressedPreview, setCompressedPreview] = useState(null);
  const [compressed, setCompressed] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [customName, setCustomName] = useState("");
  const [quality, setQuality] = useState(0.7);
  const [maxWidth, setMaxWidth] = useState(1024);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setOriginalSize(file.size);
      setCustomName(file.name.split('.')[0]);
      setCompressed(null);
      setCompressedPreview(null);
      
      // Vista previa original
      const reader = new FileReader();
      reader.onload = (event) => {
        setOriginalPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompress = async () => {
    if (!image) return;
    setCompressing(true);
    try {
      const options = {
        maxSizeMB: quality,
        maxWidthOrHeight: maxWidth,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(image, options);
      setCompressed(compressedFile);
      setCompressedSize(compressedFile.size);
      
      // Vista previa comprimida
      const reader = new FileReader();
      reader.onload = (event) => {
        setCompressedPreview(event.target.result);
      };
      reader.readAsDataURL(compressedFile);
      
    } catch (error) {
      console.error("Compression error:", error);
    }
    setCompressing(false);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getSavings = () => {
    if (originalSize === 0 || compressedSize === 0) return 0;
    return Math.round((1 - compressedSize / originalSize) * 100);
  };

  const content = (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
            <path d="m14 19.5 3-3 3 3"/>
            <path d="M17 22v-5.5"/>
            <circle cx="9" cy="9" r="2"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">Compresor de imágenes</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Reduce el tamaño de tus imágenes sin perder calidad visible</p>
        <div className="w-8 h-px bg-[var(--border)] mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        {/* Dropzone */}
        <div 
          className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input').click()}
        >
          <input id="file-input" type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm">{image ? image.name : "Arrastra una imagen o haz clic"}</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">PNG · JPG · WEBP</p>
        </div>

        {/* Configuración de compresión */}
        {image && !compressed && (
          <div className="space-y-4 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-5">
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Calidad / Tamaño máximo: {(quality * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--surface-hover)] rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
                <span>Más compresión</span>
                <span>Equilibrio</span>
                <span>Más calidad</span>
              </div>
            </div>
            
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Ancho máximo: {maxWidth}px</label>
              <input
                type="range"
                min="300"
                max="2000"
                step="50"
                value={maxWidth}
                onChange={(e) => setMaxWidth(parseInt(e.target.value))}
                className="w-full h-2 bg-[var(--surface-hover)] rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="imagen-comprimida"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            
            <button
              onClick={handleCompress}
              disabled={compressing}
              className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-85 transition-opacity shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {compressing ? "Comprimiendo..." : "Comprimir imagen"}
            </button>
          </div>
        )}

        {/* Comparación antes/después */}
        {originalPreview && compressedPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Original</p>
                </div>
                <img src={originalPreview} alt="Original" className="w-full h-auto object-cover" />
                <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-hover)]/30">
                  <p className="text-xs text-[var(--text-tertiary)]">{formatBytes(originalSize)}</p>
                </div>
              </div>
              
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Comprimida</p>
                </div>
                <img src={compressedPreview} alt="Compressed" className="w-full h-auto object-cover" />
                <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-hover)]/30">
                  <p className="text-xs text-[var(--text-tertiary)]">{formatBytes(compressedSize)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
              <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[var(--text-primary)] text-sm font-medium">¡Compresión completada!</p>
              <p className="text-[var(--text-tertiary)] text-xs mt-1">Reducción del {getSavings()}% · Ahorraste {formatBytes(originalSize - compressedSize)}</p>
            </div>
            
            <a
              href={URL.createObjectURL(compressed)}
              download={`${customName || "comprimida"}.${compressed?.name?.split('.').pop() || "jpg"}`}
              className="block w-full py-3 rounded-xl text-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
              </svg>
              Descargar imagen comprimida
            </a>
            
            <button
              onClick={() => {
                setImage(null);
                setOriginalPreview(null);
                setCompressedPreview(null);
                setCompressed(null);
                setOriginalSize(0);
                setCompressedSize(0);
                setCustomName("");
                document.getElementById('file-input').value = "";
              }}
              className="w-full py-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-sm transition-colors"
            >
              Comprimir otra imagen
            </button>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[var(--text-tertiary)] text-xs">Compresión local · Tus imágenes no se suben</p>
        </div>
      </div>

      <p className="text-center text-[var(--text-tertiary)] text-xs mt-8">Procesamiento local · Tus archivos no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — Compresor de imágenes">{content}</Layout>;
}