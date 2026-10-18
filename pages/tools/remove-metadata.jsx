import { useState, useRef } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";
import { stripMetadata } from "../../lib/metadata";
import { decodeImage, encodeCanvas, resolveOutputMime, extensionFor } from "../../lib/image";

// Limpia metadatos (GPS, cámara, fecha...). En JPG y PNG se quitan los bloques
// de metadatos directamente del archivo (lib/metadata.js): la imagen no se
// recomprime y conserva su formato. Otros formatos (WEBP...) se redibujan en
// un canvas, que no copia metadatos.
export default function RemoveMetadataPage({ standalone = false }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null); // { blob, mime, removed, lossless }
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [customName, setCustomName] = useState("");
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
      setImage(file);
      setCustomName(file.name.replace(/\.[^.]+$/, ""));
      setResult(null);
      setMetadata(null);
      setError(null);
    }
  };

  const extractMetadata = async () => {
    if (!image) return;
    try {
      // exifr se descarga solo si se pide ver los metadatos.
      const { default: exifr } = await import("exifr");
      const data = await exifr.parse(image);
      if (data && Object.keys(data).length > 0) {
        setMetadata(data);
      } else {
        setMetadata({ message: "No se encontraron metadatos EXIF en esta imagen" });
      }
    } catch (error) {
      console.error("Error leyendo metadatos:", error);
      setMetadata({ message: "Error al leer metadatos" });
    }
  };

  const removeMetadata = async () => {
    if (!image) return;
    setProcessing(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const stripped = stripMetadata(bytes, image.type);
      if (stripped) {
        setResult({
          blob: new Blob([stripped.bytes], { type: image.type }),
          mime: image.type === "image/jpg" ? "image/jpeg" : image.type,
          removed: stripped.removed,
          lossless: true,
        });
      } else {
        // Formato sin limpieza directa: se redibuja (recomprime con calidad alta).
        const mime = resolveOutputMime(image.type);
        const { canvas, ctx, bitmap } = await decodeImage(image);
        ctx.drawImage(bitmap, 0, 0);
        const blob = await encodeCanvas(canvas, mime, 0.92);
        setResult({ blob, mime: blob.type || mime, removed: ["Todos los metadatos"], lossless: false });
      }
    } catch (err) {
      console.error("Error eliminando metadatos:", err);
      setError("No se pudo procesar esta imagen.");
    }
    setProcessing(false);
  };

  const downloadImage = () => {
    if (!result) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customName || "imagen-limpia"}.${extensionFor(result.mime)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const content = (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">Eliminar metadatos EXIF</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Limpia datos ocultos de tus imágenes (GPS, cámara, fecha)</p>
        <div className="w-8 h-px bg-[var(--border)] mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        <div 
          className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center hover:border-[var(--accent)] transition-colors cursor-pointer"
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm">
            {imagePreview ? "Imagen cargada" : "Selecciona una imagen"}
          </p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">
            PNG · JPG · WEBP
          </p>
        </div>

        {imagePreview && (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain p-4" />
          </div>
        )}

        {image && !result && (
          <div className="space-y-3">
            <button
              onClick={extractMetadata}
              className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors"
            >
              Ver metadatos actuales
            </button>
            
            {metadata && (
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">Metadatos encontrados</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {metadata.message ? (
                    <p className="text-xs text-[var(--text-tertiary)]">{metadata.message}</p>
                  ) : (
                    Object.entries(metadata).slice(0, 10).map(([key, value]) => (
                      <div key={key} className="text-[11px]">
                        <span className="text-[var(--accent)]">{key}:</span>
                        <span className="text-[var(--text-tertiary)] ml-2">
                          {typeof value === "object" ? JSON.stringify(value).substring(0, 50) : String(value).substring(0, 50)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo limpio</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="imagen-limpia"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            
            <button
              onClick={removeMetadata}
              disabled={processing}
              className={`w-full py-3 rounded-xl font-medium transition-all ${
                processing
                  ? "bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]"
                  : "bg-[var(--accent)] text-white hover:opacity-85 shadow-sm"
              }`}
            >
              {processing ? "Procesando..." : "Eliminar metadatos"}
            </button>
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
              <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[var(--text-primary)] text-sm font-medium">Imagen limpia</p>
              <p className="text-[var(--text-tertiary)] text-xs mt-1">
                {result.removed.length > 0
                  ? `Se quitó: ${result.removed.join(", ")}`
                  : "No tenía metadatos que quitar"}
              </p>
              <p className="text-[var(--text-tertiary)] text-[11px] mt-1">
                {result.lossless
                  ? "Calidad intacta: la imagen no se recomprimió."
                  : "Se volvió a guardar con calidad alta (92%)."}
                {" "}{(image.size / 1024).toFixed(0)} KB → {(result.blob.size / 1024).toFixed(0)} KB
              </p>
            </div>
            
            <button
              onClick={downloadImage}
              className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
              </svg>
              Descargar {customName || "imagen-limpia"}.{extensionFor(result.mime)}
            </button>
            
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
                setResult(null);
                setMetadata(null);
                setError(null);
                setCustomName("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="w-full py-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-sm transition-colors"
            >
              Limpiar otra imagen
            </button>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[var(--text-tertiary)] text-xs">Elimina GPS, cámara, fecha y otros datos ocultos</p>
        </div>
      </div>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("remove-metadata")}>{content}</Layout>;
}