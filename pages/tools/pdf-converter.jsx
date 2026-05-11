import { useState, useRef, useCallback, useEffect } from "react";
import Layout from "../../components/Layout";
import { PDFDocument } from "pdf-lib";
import { useDropzone } from "react-dropzone";

export default function PDFConverterPage({ standalone = false }) {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [resultPdf, setResultPdf] = useState(null);
  const [resultPreview, setResultPreview] = useState(null);
  const [customName, setCustomName] = useState("documento");
  const [mode, setMode] = useState("convert");
  const [extractPages, setExtractPages] = useState("");
  const [pageInfo, setPageInfo] = useState([]);
  
  const fileInputRef = useRef(null);

  const generatePreview = async (pdfBytes) => {
    try {
      const pdf = await PDFDocument.load(pdfBytes);
      const pageCount = pdf.getPageCount();
      setResultPreview({ pageCount, ready: true });
    } catch (e) {
      setResultPreview({ pageCount: 0, ready: false });
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (mode === "convert") {
      const newFiles = acceptedFiles.map(f => ({
        id: `${f.name}_${Date.now()}_${Math.random()}`,
        name: f.name,
        file: f,
        type: f.type,
        size: f.size,
      }));
      setFiles(prev => [...prev, ...newFiles]);
    } else {
      const pdfFiles = acceptedFiles.filter(f => f.type === "application/pdf");
      const newFiles = pdfFiles.map(f => ({
        id: `${f.name}_${Date.now()}_${Math.random()}`,
        name: f.name,
        file: f,
        type: f.type,
        pages: 0,
      }));
      setFiles(prev => [...prev, ...newFiles]);
      
      pdfFiles.forEach(async (f, idx) => {
        const arrayBuffer = await f.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setPageInfo(prev => [...prev, { name: f.name, pages: pdf.getPageCount() }]);
      });
    }
    setResultPdf(null);
    setResultPreview(null);
  }, [mode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: mode === "convert" ? {} : { "application/pdf": [".pdf"] },
    maxFiles: 10,
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setResultPdf(null);
    setResultPreview(null);
  };

  const clearAll = () => {
    setFiles([]);
    setResultPdf(null);
    setResultPreview(null);
    setProgress(0);
    setStatus("");
    setPageInfo([]);
  };

  const convertToPDF = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setStatus("Preparando archivos...");
    
    try {
      const pdfDoc = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Procesando ${file.name}...`);
        setProgress(Math.round((i / files.length) * 70));
        
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(fileExt)) {
          const imageBytes = await file.file.arrayBuffer();
          let image;
          if (fileExt === "png" || file.type === "image/png") {
            image = await pdfDoc.embedPng(imageBytes);
          } else {
            image = await pdfDoc.embedJpg(imageBytes);
          }
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
        else if (file.type === "text/plain" || fileExt === "txt") {
          const text = await file.file.text();
          const page = pdfDoc.addPage([500, 700]);
          const { width, height } = page.getSize();
          page.drawText(text.substring(0, 3000), { x: 50, y: height - 50, size: 11, lineHeight: 16, maxWidth: width - 100 });
        }
        else if (file.type === "application/pdf" || fileExt === "pdf") {
          const arrayBuffer = await file.file.arrayBuffer();
          const sourcePdf = await PDFDocument.load(arrayBuffer);
          const pages = await pdfDoc.copyPages(sourcePdf, sourcePdf.getPageIndices());
          pages.forEach(page => pdfDoc.addPage(page));
        }
        else {
          const page = pdfDoc.addPage([500, 700]);
          const { width, height } = page.getSize();
          page.drawText(`Archivo: ${file.name}`, { x: 50, y: height - 50, size: 14 });
          page.drawText(`Tamaño: ${(file.size / 1024).toFixed(2)} KB`, { x: 50, y: height - 80, size: 12 });
          page.drawText(`Tipo: ${file.type || "Desconocido"}`, { x: 50, y: height - 110, size: 12 });
        }
      }
      
      setProgress(90);
      setStatus("Generando PDF...");
      
      const pdfBytes = await pdfDoc.save();
      await generatePreview(pdfBytes);
      
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultPdf(url);
      setProgress(100);
      setStatus("");
      
    } catch (error) {
      console.error("Error:", error);
      alert("Error al convertir los archivos");
    }
    
    setIsProcessing(false);
  };

  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Sube al menos 2 PDFs para combinar");
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setStatus("Preparando archivos...");
    
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (let i = 0; i < files.length; i++) {
        setStatus(`Combinando ${files[i].name}...`);
        setProgress(Math.round((i / files.length) * 70));
        
        const arrayBuffer = await files[i].file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      }
      
      setProgress(90);
      setStatus("Generando PDF final...");
      
      const pdfBytes = await mergedPdf.save();
      await generatePreview(pdfBytes);
      
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultPdf(url);
      setProgress(100);
      setStatus("");
      
    } catch (error) {
      console.error("Error:", error);
      alert("Error al combinar los PDFs");
    }
    
    setIsProcessing(false);
  };

  const extractSpecificPages = async () => {
    if (files.length === 0) return;
    
    let pagesToExtract = [];
    const extractInput = extractPages.trim();
    
    if (extractInput.includes(",") || extractInput.includes("-")) {
      const parts = extractInput.split(",");
      for (const part of parts) {
        if (part.includes("-")) {
          const [start, end] = part.split("-").map(n => parseInt(n.trim()));
          for (let i = start; i <= end; i++) pagesToExtract.push(i - 1);
        } else {
          pagesToExtract.push(parseInt(part.trim()) - 1);
        }
      }
    } else if (extractInput) {
      pagesToExtract = [parseInt(extractInput) - 1];
    } else {
      alert("Ingresa números de página válidos");
      return;
    }
    
    pagesToExtract = pagesToExtract.filter(p => !isNaN(p));
    
    if (pagesToExtract.length === 0) {
      alert("Ingresa números de página válidos (ej: 1,3,5 o 1-5)");
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setStatus("Extrayendo páginas...");
    
    try {
      const newPdf = await PDFDocument.create();
      
      for (const file of files) {
        const arrayBuffer = await file.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const totalPages = pdf.getPageCount();
        
        const validPages = pagesToExtract.filter(p => p < totalPages && p >= 0);
        if (validPages.length > 0) {
          const pages = await newPdf.copyPages(pdf, validPages);
          pages.forEach(page => newPdf.addPage(page));
        }
      }
      
      setProgress(90);
      setStatus("Generando PDF...");
      
      const pdfBytes = await newPdf.save();
      await generatePreview(pdfBytes);
      
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultPdf(url);
      setProgress(100);
      setStatus("");
      
    } catch (error) {
      console.error("Error:", error);
      alert("Error al extraer páginas");
    }
    
    setIsProcessing(false);
  };

  const optimizePDF = async () => {
    if (files.length === 0) return;
    
    setIsProcessing(true);
    setProgress(0);
    setStatus("Optimizando PDF...");
    
    try {
      const arrayBuffer = await files[0].file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      setProgress(50);
      setStatus("Reorganizando estructura...");
      
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => newPdf.addPage(page));
      
      setProgress(90);
      setStatus("Guardando...");
      
      const pdfBytes = await newPdf.save();
      await generatePreview(pdfBytes);
      
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setResultPdf(url);
      setProgress(100);
      setStatus("");
      
    } catch (error) {
      console.error("Error:", error);
      alert("Error al optimizar el PDF");
    }
    
    setIsProcessing(false);
  };

  const handleProcess = () => {
    if (mode === "convert") convertToPDF();
    else if (mode === "merge") mergePDFs();
    else if (mode === "extract") extractSpecificPages();
    else if (mode === "optimize") optimizePDF();
  };

  const getTotalPages = () => pageInfo.reduce((sum, f) => sum + (f.pages || 0), 0);

  const content = (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
            <path d="M10 9H8"/>
            <path d="M16 13H8"/>
            <path d="M16 17H8"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">PDF Converter</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Convierte, combina, extrae y optimiza PDFs</p>
        <div className="w-8 h-px bg-[var(--border)] mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
          <button onClick={() => { setMode("convert"); setFiles([]); setResultPdf(null); setResultPreview(null); }} className={`py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${mode === "convert" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
            </svg>
            Convertir
          </button>
          <button onClick={() => { setMode("merge"); setFiles([]); setResultPdf(null); setResultPreview(null); }} className={`py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${mode === "merge" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 4v16h16" stroke="currentColor" strokeLinecap="round"/>
              <path d="m8 12 4-4 4 4" stroke="currentColor" strokeLinecap="round"/>
            </svg>
            Combinar
          </button>
          <button onClick={() => { setMode("extract"); setFiles([]); setResultPdf(null); setResultPreview(null); }} className={`py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${mode === "extract" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 4v16h16" stroke="currentColor" strokeLinecap="round"/>
              <path d="m8 12 4 4 4-4" stroke="currentColor"/>
            </svg>
            Extraer
          </button>
          <button onClick={() => { setMode("optimize"); setFiles([]); setResultPdf(null); setResultPreview(null); }} className={`py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${mode === "optimize" ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M4 4v16h16" stroke="currentColor" strokeLinecap="round"/>
              <path d="M8 12h8" stroke="currentColor"/>
            </svg>
            Optimizar
          </button>
        </div>

        <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragActive ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
          <input {...getInputProps()} />
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm">{isDragActive ? "Suelta los archivos aquí..." : "Arrastra archivos o haz clic"}</p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">{mode === "convert" ? "Cualquier archivo" : "Solo PDFs"}</p>
        </div>

        {files.length > 0 && (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="border-b border-[var(--border)] p-3 bg-[var(--surface-hover)]/50 flex justify-between items-center">
              <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">{files.length} archivo{files.length !== 1 ? 's' : ''}</span>
              <button onClick={clearAll} className="text-[10px] text-red-400 hover:text-red-500 transition-colors">Limpiar</button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-[12px] text-[var(--text-primary)] truncate max-w-[180px] md:max-w-[300px]">{file.name}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{(file.size / 1024).toFixed(1)} KB</p>
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
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <label className="block text-[var(--text-secondary)] text-sm mb-2">Páginas a extraer</label>
            <input
              type="text"
              value={extractPages}
              onChange={(e) => setExtractPages(e.target.value)}
              placeholder="Ej: 1,3,5  o  1-5"
              className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
            />
            <p className="text-[var(--text-tertiary)] text-xs mt-2">Separa con comas. Usa guiones para rangos.</p>
          </div>
        )}

        {files.length > 0 && !resultPdf && (
          <>
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo final</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="mi-documento"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className={`w-full py-3 rounded-xl font-medium transition-all shadow-sm ${
                isProcessing
                  ? "bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]"
                  : "bg-[var(--accent)] text-white hover:opacity-85"
              }`}
            >
              {isProcessing ? "Procesando..." : mode === "convert" ? "Convertir a PDF" : mode === "merge" ? "Combinar PDFs" : mode === "extract" ? "Extraer páginas" : "Optimizar PDF"}
            </button>
          </>
        )}

        {isProcessing && (
          <div className="space-y-2 bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{status}</span>
              <span className="text-[var(--accent)] font-mono">{progress}%</span>
            </div>
            <div className="w-full bg-[var(--surface-hover)] rounded-full h-2 overflow-hidden">
              <div className="bg-[var(--accent)] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {resultPdf && (
          <div className="space-y-4">
            <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
              <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-[var(--text-primary)] text-sm font-medium">PDF listo para descargar</p>
              {resultPreview && (
                <p className="text-[var(--text-tertiary)] text-xs mt-1">{resultPreview.pageCount} página{resultPreview.pageCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            {resultPreview && (
              <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/>
                    <path d="M14 2v5a1 1 0 0 0 1 1h5"/>
                  </svg>
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{customName || "documento"}.pdf</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{resultPreview.pageCount} páginas</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <a
                href={resultPdf}
                download={`${customName || "documento"}.pdf`}
                className="flex-1 py-3 rounded-xl text-center bg-[var(--accent)] text-white text-sm font-medium hover:opacity-85 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
                </svg>
                Descargar
              </a>
              <button
                onClick={() => { clearAll(); setResultPdf(null); setResultPreview(null); }}
                className="flex-1 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors"
              >
                Nuevos archivos
              </button>
            </div>
          </div>
        )}

        <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[var(--text-tertiary)] text-xs">Procesamiento local con pdf-lib</p>
        </div>
      </div>

      <p className="text-center text-[var(--text-tertiary)] text-xs mt-8">Conversión local · Tus archivos no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — PDF Converter">{content}</Layout>;
}