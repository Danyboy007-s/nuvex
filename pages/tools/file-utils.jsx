import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";
import {
  compressImage, resolveOutputMime, supportsQuality, extensionFor,
  OUTPUT_FORMATS, SIZE_PRESETS,
} from "../../lib/image";

// Compresor de imágenes. La lógica está en lib/image.js: se decodifica la
// imagen en un canvas y se vuelve a codificar con el codificador del navegador
// (sin librerías externas, funciona también sin conexión).
export default function FileUtilsPage({ standalone = false }) {
  const [image, setImage] = useState(null);
  const [originalPreview, setOriginalPreview] = useState(null);
  const [compressedPreview, setCompressedPreview] = useState(null);
  const [compressed, setCompressed] = useState(null); // { blob, mime, width, height, keptOriginal }
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);
  const [customName, setCustomName] = useState("");
  const [quality, setQuality] = useState(0.8);   // calidad real del codificador (0–1)
  const [maxSide, setMaxSide] = useState(null);  // null = tamaño original
  const [format, setFormat] = useState("auto");

  const outputMime = image ? resolveOutputMime(image.type, format) : null;

  // Las vistas previas usan URLs temporales: se liberan al cambiar de imagen.
  useEffect(() => () => originalPreview && URL.revokeObjectURL(originalPreview), [originalPreview]);
  useEffect(() => () => compressedPreview && URL.revokeObjectURL(compressedPreview), [compressedPreview]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setImage(file);
      setOriginalSize(file.size);
      setCustomName(file.name.replace(/\.[^.]+$/, ""));
      setCompressed(null);
      setCompressedPreview(null);
      setError(null);
      setOriginalPreview(URL.createObjectURL(file));
    }
  };

  const handleCompress = async () => {
    if (!image) return;
    setCompressing(true);
    setError(null);
    try {
      const result = await compressImage(image, { quality, maxSide, format });
      setCompressed(result);
      setCompressedSize(result.blob.size);
      setCompressedPreview(URL.createObjectURL(result.blob));
    } catch (err) {
      console.error("Error al comprimir:", err);
      setError("No se pudo procesar esta imagen. Prueba con PNG, JPG o WEBP.");
    }
    setCompressing(false);
  };

  const download = () => {
    const url = URL.createObjectURL(compressed.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customName || "comprimida"}.${extensionFor(compressed.mime)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <svg className="w-10 h-10 text-(--accent)" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M10.3 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10l-3.1-3.1a2 2 0 0 0-2.814.014L6 21"/>
            <path d="m14 19.5 3-3 3 3"/>
            <path d="M17 22v-5.5"/>
            <circle cx="9" cy="9" r="2"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-(--text-primary)">Compresor de imágenes</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Reduce el tamaño de tus imágenes sin perder calidad visible</p>
        <div className="w-8 h-px bg-(--border) mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        {/* Dropzone */}
        <div 
          className="border-2 border-dashed border-(--border) rounded-2xl p-8 text-center hover:border-(--accent) transition-colors cursor-pointer"
          onClick={() => document.getElementById('file-input').click()}
        >
          <input id="file-input" type="file" onChange={handleImageUpload} accept="image/*" className="hidden" />
          <svg className="w-10 h-10 mx-auto mb-3 text-(--text-tertiary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-(--text-secondary) text-sm">{image ? image.name : "Arrastra una imagen o haz clic"}</p>
          <p className="text-(--text-tertiary) text-xs mt-1">PNG · JPG · WEBP</p>
        </div>

        {/* Configuración de compresión */}
        {image && !compressed && (
          <div className="space-y-4 bg-(--surface) rounded-xl border border-(--border) p-5">
            <div>
              <label className="block text-(--text-secondary) text-sm mb-2">Formato de salida</label>
              <div className="flex flex-wrap gap-2">
                {OUTPUT_FORMATS.map((f) => (
                  <button key={f.id} onClick={() => setFormat(f.id)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${format === f.id ? "bg-(--accent) text-white border-transparent" : "border-(--border) text-(--text-secondary) hover:bg-(--surface-hover)"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              {outputMime === "image/png" && (
                <p className="text-[11px] text-(--text-tertiary) mt-2">
                  PNG no tiene calidad ajustable: para reducir más el peso, elige WEBP (conserva la transparencia) o reduce el tamaño.
                </p>
              )}
            </div>

            {supportsQuality(outputMime) && (
              <div>
                <label className="block text-(--text-secondary) text-sm mb-2">Calidad: {Math.round(quality * 100)}%</label>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-(--surface-hover) rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-(--text-tertiary) mt-1">
                  <span>Más ligera</span>
                  <span>Recomendado: 75–85%</span>
                  <span>Más calidad</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-(--text-secondary) text-sm mb-2">Tamaño máximo (lado mayor)</label>
              <div className="flex flex-wrap gap-2">
                {SIZE_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => setMaxSide(p.value)} className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${maxSide === p.value ? "bg-(--accent) text-white border-transparent" : "border-(--border) text-(--text-secondary) hover:bg-(--surface-hover)"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-(--text-secondary) text-sm mb-2">Nombre del archivo</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="imagen-comprimida"
                className="w-full bg-(--surface) border border-(--border) rounded-xl px-4 py-3 text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-hidden focus:border-(--accent) transition"
              />
            </div>
            
            <button
              onClick={handleCompress}
              disabled={compressing}
              className="w-full py-3 rounded-xl bg-(--accent) text-white text-sm font-medium hover:opacity-85 transition-opacity shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {compressing ? "Comprimiendo..." : "Comprimir imagen"}
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>
        )}

        {/* Comparación antes/después */}
        {originalPreview && compressedPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
                <div className="p-3 border-b border-(--border) bg-(--surface-hover)/50">
                  <p className="text-[11px] font-medium text-(--text-secondary) uppercase tracking-wider">Original</p>
                </div>
                <img src={originalPreview} alt="Original" className="w-full h-auto object-cover" />
                <div className="p-3 border-t border-(--border) bg-(--surface-hover)/30">
                  <p className="text-xs text-(--text-tertiary)">{formatBytes(originalSize)}</p>
                </div>
              </div>
              
              <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
                <div className="p-3 border-b border-(--border) bg-(--surface-hover)/50">
                  <p className="text-[11px] font-medium text-(--text-secondary) uppercase tracking-wider">Comprimida</p>
                </div>
                <img src={compressedPreview} alt="Compressed" className="w-full h-auto object-cover" />
                <div className="p-3 border-t border-(--border) bg-(--surface-hover)/30">
                  <p className="text-xs text-(--text-tertiary)">{formatBytes(compressedSize)}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
              <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              {compressed.keptOriginal ? (
                <>
                  <p className="text-(--text-primary) text-sm font-medium">Esta imagen ya estaba optimizada</p>
                  <p className="text-(--text-tertiary) text-xs mt-1">Comprimirla de nuevo la hacía más pesada, así que se conserva la original. Prueba con menos calidad, WEBP o un tamaño menor.</p>
                </>
              ) : (
                <>
                  <p className="text-(--text-primary) text-sm font-medium">¡Compresión completada!</p>
                  <p className="text-(--text-tertiary) text-xs mt-1">
                    {compressedSize < originalSize
                      ? `Reducción del ${getSavings()}% · Ahorraste ${formatBytes(originalSize - compressedSize)}`
                      : `Pesa ${formatBytes(compressedSize - originalSize)} más que la original (por el cambio de formato)`}
                    {" · "}{compressed.width}×{compressed.height} px
                  </p>
                </>
              )}
            </div>
            
            <button
              onClick={download}
              className="block w-full py-3 rounded-xl text-center bg-(--surface) border border-(--border) text-(--text-primary) text-sm font-medium hover:bg-(--surface-hover) transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
              </svg>
              Descargar imagen comprimida
            </button>

            {/* Vuelve a mostrar los ajustes con la misma imagen */}
            <button
              onClick={() => { setCompressed(null); setCompressedPreview(null); }}
              className="w-full py-2 rounded-xl text-(--accent) hover:opacity-80 text-sm transition-opacity"
            >
              Cambiar ajustes y volver a comprimir
            </button>

            <button
              onClick={() => {
                setImage(null);
                setOriginalPreview(null);
                setCompressedPreview(null);
                setCompressed(null);
                setOriginalSize(0);
                setCompressedSize(0);
                setCustomName("");
                setError(null);
                document.getElementById('file-input').value = "";
              }}
              className="w-full py-2 rounded-xl text-(--text-tertiary) hover:text-(--text-secondary) text-sm transition-colors"
            >
              Comprimir otra imagen
            </button>
          </div>
        )}

        {/* Información adicional */}
        <div className="bg-(--surface) rounded-xl p-4 text-center border border-(--border)">
          <p className="text-(--text-tertiary) text-xs">Compresión local · Tus imágenes no se suben</p>
        </div>
      </div>

      <p className="text-center text-(--text-tertiary) text-xs mt-8">Procesamiento local · Tus archivos no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("file-utils")}>{content}</Layout>;
}