import { useState, useCallback, useEffect } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";
import { PDFDocument } from "pdf-lib";
import { useDropzone } from "react-dropzone";
import {
  MODES, SINGLE_FILE_MODES, MAX_FILES, ACCEPT_CONVERT, ACCEPT_PDF,
  formatSize, isPdf, isText, loadPdf, embedImage, addImagePage, addTextPages, parsePageRanges,
  IMAGE_LEVELS, recompressImages,
} from "../../lib/pdf";

// Trazos SVG de los íconos de cada modo (se dibujan dentro de un <svg> 24x24).
const MODE_ICONS = {
  convert: <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />,
  merge: <><path d="M4 4v16h16" /><path d="m8 12 4-4 4 4" /></>,
  extract: <><path d="M4 4v16h16" /><path d="m8 12 4 4 4-4" /></>,
  optimize: <><path d="M4 4v16h16" /><path d="M8 12h8" /></>,
};

// ============================================
// COMPONENTE
// ============================================
export default function PDFConverterPage({ standalone = false }) {
  // Cada archivo: { id, name, file, size, pages (solo PDFs; null mientras carga) }
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  // Resultado: { url, pageCount, size, note }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [customName, setCustomName] = useState("documento");
  const [mode, setMode] = useState("convert");
  const [extractPages, setExtractPages] = useState("");
  const [imageLevel, setImageLevel] = useState("screen"); // calidad de imágenes al optimizar

  const currentMode = MODES.find((m) => m.id === mode);

  // Libera la URL temporal del PDF anterior cuando se reemplaza o se sale
  // de la herramienta, para no acumular memoria.
  useEffect(() => () => result?.url && URL.revokeObjectURL(result.url), [result]);

  const resetOutput = () => {
    setResult(null);
    setError(null);
    setProgress(0);
    setStatus("");
  };

  const clearAll = () => {
    setFiles([]);
    setExtractPages("");
    resetOutput();
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    clearAll();
  };

  const onDrop = useCallback(
    (acceptedFiles, rejections) => {
      resetOutput();
      if (rejections.length > 0) {
        setError(
          rejections.some((r) => r.errors.some((e) => e.code === "too-many-files"))
            ? `Máximo ${MAX_FILES} archivos a la vez.`
            : `Formato no soportado: ${rejections.map((r) => r.file.name).join(", ")}`
        );
      }
      if (acceptedFiles.length === 0) return;

      const single = SINGLE_FILE_MODES.includes(mode);
      const newFiles = (single ? acceptedFiles.slice(0, 1) : acceptedFiles).map((f) => ({
        id: `${f.name}_${Date.now()}_${Math.random()}`,
        name: f.name,
        file: f,
        size: f.size,
        pages: isPdf(f) ? null : undefined,
      }));
      setFiles((prev) => (single ? newFiles : [...prev, ...newFiles]));

      // Contar páginas de cada PDF en segundo plano para mostrarlo en la lista.
      newFiles
        .filter((f) => f.pages === null)
        .forEach(async (f) => {
          let pages;
          try {
            pages = (await loadPdf(f.file)).getPageCount();
          } catch (err) {
            pages = 0;
            setError(err.message);
          }
          setFiles((prev) => prev.map((p) => (p.id === f.id ? { ...p, pages } : p)));
        });
    },
    [mode]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mode === "convert" ? ACCEPT_CONVERT : ACCEPT_PDF,
    maxFiles: SINGLE_FILE_MODES.includes(mode) ? 1 : MAX_FILES,
    multiple: !SINGLE_FILE_MODES.includes(mode),
  });

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    resetOutput();
  };

  // Deja el PDF listo para descargar. `bytes` permite reutilizar un PDF ya
  // guardado (Optimizar lo guarda antes para comparar tamaños).
  const finish = async (pdfDoc, note = null, savedBytes = null) => {
    setProgress(90);
    setStatus("Generando PDF...");
    const bytes = savedBytes ?? (await pdfDoc.save({ useObjectStreams: true }));
    const blob = new Blob([bytes], { type: "application/pdf" });
    setResult({ url: URL.createObjectURL(blob), pageCount: pdfDoc.getPageCount(), size: bytes.length, note });
    setProgress(100);
    setStatus("");
  };

  // ---------- Modos ----------

  const convertToPDF = async () => {
    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      const { file, name } = files[i];
      setStatus(`Procesando ${name}...`);
      setProgress(Math.round((i / files.length) * 80));

      if (isPdf(file)) {
        const source = await loadPdf(file);
        const pages = await pdfDoc.copyPages(source, source.getPageIndices());
        pages.forEach((page) => pdfDoc.addPage(page));
      } else if (isText(file)) {
        await addTextPages(pdfDoc, file);
      } else {
        try {
          addImagePage(pdfDoc, await embedImage(pdfDoc, file));
        } catch {
          throw new Error(`No se pudo leer la imagen "${name}".`);
        }
      }
    }
    await finish(pdfDoc);
  };

  const mergePDFs = async () => {
    if (files.length < 2) throw new Error("Sube al menos 2 PDFs para combinar.");
    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
      setStatus(`Combinando ${files[i].name}...`);
      setProgress(Math.round((i / files.length) * 80));
      const source = await loadPdf(files[i].file);
      const pages = await merged.copyPages(source, source.getPageIndices());
      pages.forEach((page) => merged.addPage(page));
    }
    await finish(merged);
  };

  const extractSpecificPages = async () => {
    setStatus("Extrayendo páginas...");
    const source = await loadPdf(files[0].file);
    const indices = parsePageRanges(extractPages, source.getPageCount());
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(source, indices);
    pages.forEach((page) => newPdf.addPage(page));
    await finish(newPdf);
  };

  // "Optimizar" hace dos cosas:
  //   1. Reconstruye el PDF copiando solo las páginas: descarta objetos
  //      huérfanos, versiones viejas de ediciones anteriores y metadatos, y
  //      comprime la estructura con object streams.
  //   2. Recomprime las fotos a la calidad elegida (lib/pdf.js →
  //      recompressImages). Es lo que más reduce un PDF de fotos o escaneos.
  const optimizePDF = async () => {
    setStatus("Reorganizando estructura...");
    const original = files[0];
    const source = await loadPdf(original.file);
    setProgress(20);
    const newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(source, source.getPageIndices());
    pages.forEach((page) => newPdf.addPage(page));

    const level = IMAGE_LEVELS.find((l) => l.id === imageLevel);
    const images = await recompressImages(newPdf, level, {
      onProgress: (done, total) => {
        if (total === 0) return;
        setStatus(`Recomprimiendo imágenes (${done}/${total})...`);
        setProgress(20 + Math.round((done / total) * 65));
      },
    });

    const bytes = await newPdf.save({ useObjectStreams: true });
    if (bytes.length >= original.size) {
      throw new Error(
        images.total === 0
          ? "Este PDF ya está optimizado y no tiene fotos que recomprimir."
          : "No se pudo reducir más este PDF. Prueba con una calidad de imágenes más baja."
      );
    }
    const saved = Math.round((1 - bytes.length / original.size) * 100);
    const detail = images.replaced > 0 ? ` · ${images.replaced} de ${images.total} imágenes recomprimidas` : "";
    await finish(newPdf, `${formatSize(original.size)} → ${formatSize(bytes.length)} (−${saved}%)${detail}`, bytes);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    resetOutput();
    setStatus("Preparando archivos...");
    try {
      if (mode === "convert") await convertToPDF();
      else if (mode === "merge") await mergePDFs();
      else if (mode === "extract") await extractSpecificPages();
      else if (mode === "optimize") await optimizePDF();
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado.");
      setStatus("");
    }
    setIsProcessing(false);
  };

  const content = (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-(--accent)" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
            <path d="M10 9H8"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-(--text-primary)">PDF Converter</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Convierte, combina, extrae y optimiza PDFs</p>
        <div className="w-8 h-px bg-(--border) mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        {/* Selector de modo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-(--surface) rounded-xl border border-(--border)">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${mode === m.id ? "bg-(--accent) text-white" : "text-(--text-secondary) hover:text-(--text-primary)"}`}
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeLinecap="round" viewBox="0 0 24 24">
                {MODE_ICONS[m.id]}
              </svg>
              {m.label}
            </button>
          ))}
        </div>

        {/* Zona para soltar archivos */}
        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragActive ? "border-(--accent) bg-(--accent)/5" : "border-(--border) hover:border-(--accent)"}`}>
          <input {...getInputProps()} />
          <svg className="w-10 h-10 mx-auto mb-3 text-(--text-tertiary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-(--text-secondary) text-sm">{isDragActive ? "Suelta los archivos aquí..." : "Arrastra archivos o haz clic"}</p>
          <p className="text-(--text-tertiary) text-xs mt-1">{currentMode.hint}</p>
        </div>

        {/* Lista de archivos */}
        {files.length > 0 && (
          <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
            <div className="border-b border-(--border) p-3 bg-(--surface-hover)/50 flex justify-between items-center">
              <span className="text-[11px] font-medium text-(--text-secondary) uppercase tracking-wider">{files.length} archivo{files.length !== 1 ? "s" : ""}</span>
              <button onClick={clearAll} className="text-[10px] text-red-400 hover:text-red-500 transition-colors">Limpiar</button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border-b border-(--border) last:border-0 hover:bg-(--surface-hover)/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 text-(--text-tertiary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-[12px] text-(--text-primary) truncate max-w-[180px] md:max-w-[300px]">{file.name}</p>
                      <p className="text-[10px] text-(--text-tertiary)">
                        {formatSize(file.size)}
                        {file.pages === null && " · contando páginas..."}
                        {file.pages > 0 && ` · ${file.pages} página${file.pages !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file.id)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors">
                    <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "extract" && files.length > 0 && (
          <div className="bg-(--surface) rounded-xl border border-(--border) p-4">
            <label className="block text-(--text-secondary) text-sm mb-2">Páginas a extraer</label>
            <input
              type="text"
              value={extractPages}
              onChange={(e) => setExtractPages(e.target.value)}
              placeholder="Ej: 1,3,5  o  1-5"
              className="w-full bg-(--surface-hover) border border-(--border) rounded-xl px-4 py-3 text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-hidden focus:border-(--accent) transition"
            />
            <p className="text-(--text-tertiary) text-xs mt-2">Separa con comas. Usa guiones para rangos.</p>
          </div>
        )}

        {mode === "optimize" && files.length > 0 && !result && (
          <div>
            <label className="block text-(--text-secondary) text-sm mb-2">Calidad de las imágenes</label>
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_LEVELS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setImageLevel(l.id)}
                  className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                    imageLevel === l.id
                      ? "border-(--accent) bg-(--accent)/5"
                      : "border-(--border) hover:bg-(--surface-hover)"
                  }`}
                >
                  <span className="block text-sm text-(--text-primary)">{l.label}</span>
                  <span className="block text-[10px] text-(--text-tertiary)">{l.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-(--text-tertiary) text-xs mt-2 px-1">
              Limpia la estructura del PDF y recomprime las fotos. El texto, los logos y los escaneos en blanco y negro no se tocan.
            </p>
          </div>
        )}

        {files.length > 0 && !result && (
          <>
            <div>
              <label className="block text-(--text-secondary) text-sm mb-2">Nombre del archivo final</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="mi-documento"
                className="w-full bg-(--surface) border border-(--border) rounded-xl px-4 py-3 text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-hidden focus:border-(--accent) transition"
              />
            </div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl font-medium transition-all shadow-xs ${
                isProcessing
                  ? "bg-(--surface) text-(--text-tertiary) cursor-not-allowed border border-(--border)"
                  : "bg-(--accent) text-white hover:opacity-85"
              }`}
            >
              {isProcessing ? "Procesando..." : currentMode.action}
            </button>
          </>
        )}

        {/* Errores (reemplazan a los antiguos alert()) */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-center">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {isProcessing && (
          <div className="space-y-2 bg-(--surface) rounded-xl border border-(--border) p-4">
            <div className="flex justify-between text-xs">
              <span className="text-(--text-secondary)">{status}</span>
              <span className="text-(--accent) font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-(--surface-hover) rounded-full h-2 overflow-hidden">
              <div className="bg-(--accent) h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
              <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-(--text-primary) text-sm font-medium">PDF listo para descargar</p>
              {result.note && <p className="text-(--text-secondary) text-xs mt-1 font-mono">{result.note}</p>}
            </div>

            <div className="bg-(--surface) rounded-xl border border-(--border) p-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-(--accent)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
                  <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
                </svg>
                <div>
                  <p className="text-sm text-(--text-primary)">{customName || "documento"}.pdf</p>
                  <p className="text-[11px] text-(--text-tertiary)">
                    {result.pageCount} página{result.pageCount !== 1 ? "s" : ""} · {formatSize(result.size)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={result.url}
                download={`${customName || "documento"}.pdf`}
                className="flex-1 py-3 rounded-xl text-center bg-(--accent) text-white text-sm font-medium hover:opacity-85 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
                </svg>
                Descargar
              </a>
              <button
                onClick={clearAll}
                className="flex-1 py-2 rounded-xl bg-(--surface) border border-(--border) text-(--text-primary) text-sm font-medium hover:bg-(--surface-hover) transition-colors"
              >
                Nuevos archivos
              </button>
            </div>
          </div>
        )}

        <div className="bg-(--surface) rounded-xl p-4 text-center border border-(--border)">
          <p className="text-(--text-tertiary) text-xs">Procesamiento local con pdf-lib</p>
        </div>
      </div>

      <p className="text-center text-(--text-tertiary) text-xs mt-8">Conversión local · Tus archivos no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("pdf-converter")}>{content}</Layout>;
}
