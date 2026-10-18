import { useState, useRef, useEffect, useMemo } from "react";
import Layout from "../../components/Layout";
import { toolPageSeo } from "../../lib/tools";
import { vectorize, toDxf, toSvgPath, countVertices, SHAPE_MODES } from "../../lib/dxf";
import { decodeImage } from "../../lib/image";

// Nivel de detalle = tolerancia de simplificación, en píxeles (lib/dxf.js).
const DETAIL_LEVELS = [
  { value: 0.5, label: "Alto" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Suave" },
];
// Las imágenes más grandes se reducen: más píxeles no dan mejores contornos,
// solo hacen todo más lento.
const MAX_SIDE = 2500;

// Imagen PNG/JPG → DXF. La lógica está en lib/dxf.js; aquí solo la interfaz.
// Los contornos se recalculan al cambiar una opción y se ven en la vista previa.
export default function PngToDxfPage({ standalone = false }) {
  const [image, setImage] = useState(null);       // { data, width, height }
  const [imagePreview, setImagePreview] = useState(null);
  const [customName, setCustomName] = useState("convertido");
  const [error, setError] = useState(null);
  const [shape, setShape] = useState("auto");
  const [tolerance, setTolerance] = useState(1);
  const [ignoreSpecks, setIgnoreSpecks] = useState(true);
  const [widthMm, setWidthMm] = useState("");    // ancho final del dibujo
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen PNG, JPG o WEBP.");
      return;
    }
    setError(null);
    try {
      const { ctx, bitmap, width, height } = await decodeImage(file, MAX_SIDE);
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      setImage({ data: ctx.getImageData(0, 0, width, height).data, width, height });
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
      setCustomName(file.name.replace(/\.[^.]+$/, ""));
      setWidthMm(String(width));
    } catch (err) {
      console.error(err);
      setError("No se pudo leer la imagen.");
    }
  };

  // Vectorizar es rápido (decenas de ms), así que se hace al momento.
  const contours = useMemo(() => {
    if (!image) return null;
    return vectorize(image.data, image.width, image.height, {
      shape, tolerance, minArea: ignoreSpecks ? 16 : 1,
    });
  }, [image, shape, tolerance, ignoreSpecks]);

  // mm por píxel según el ancho pedido (si está vacío o no es válido, 1 px = 1 mm).
  const scale = image && Number(widthMm) > 0 ? Number(widthMm) / image.width : 1;

  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);

  const downloadDxf = () => {
    const blob = new Blob([toDxf(contours, image.height, scale)], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customName || "convertido"}.dxf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reset = () => {
    setImage(null);
    setImagePreview(null);
    setCustomName("convertido");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const chip = (active) =>
    `px-3 py-1.5 rounded-lg text-xs border transition-colors ${
      active
        ? "bg-(--accent) text-white border-transparent"
        : "border-(--border) text-(--text-secondary) hover:bg-(--surface-hover)"
    }`;

  const content = (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-(--accent)" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="m12.99 6.74 1.93 3.44"/>
            <path d="M19.136 12a10 10 0 0 1-14.271 0"/>
            <path d="m21 21-2.16-3.84"/>
            <path d="m3 21 8.02-14.26"/>
            <circle cx="12" cy="5" r="2"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-(--text-primary)">Imagen a vector DXF</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Convierte PNG/JPG a DXF vectorial para AutoCAD</p>
        <div className="w-8 h-px bg-(--border) mx-auto mt-3" />
      </div>

      <div className="space-y-5">
        <div 
          className="border-2 border-dashed border-(--border) rounded-2xl p-8 text-center hover:border-(--accent) transition-colors cursor-pointer"
          onClick={() => fileInputRef.current.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
          />
          <svg className="w-10 h-10 mx-auto mb-3 text-(--text-tertiary)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-(--text-secondary) text-sm">
            {imagePreview ? "Cambiar imagen" : "Selecciona PNG, JPG o WEBP"}
          </p>
          <p className="text-(--text-tertiary) text-xs mt-1">
            Ideal para logos, planos, siluetas y dibujos lineales
          </p>
        </div>
        
        {error && (
          <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {image && contours && (
          <>
            {/* Original y resultado lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
                <p className="p-2 text-[11px] font-medium text-(--text-secondary) uppercase tracking-wider border-b border-(--border)">Original</p>
                <img src={imagePreview} alt="Original" className="w-full h-40 object-contain p-3" />
              </div>
              <div className="bg-(--surface) rounded-xl border border-(--border) overflow-hidden">
                <p className="p-2 text-[11px] font-medium text-(--text-secondary) uppercase tracking-wider border-b border-(--border)">Contornos DXF</p>
                <svg viewBox={`0 0 ${image.width} ${image.height}`} className="w-full h-40 p-3" preserveAspectRatio="xMidYMid meet">
                  <path
                    d={toSvgPath(contours)}
                    fill="var(--accent)"
                    fillOpacity="0.15"
                    fillRule="evenodd"
                    stroke="var(--accent)"
                    strokeWidth={Math.max(image.width, image.height) / 300}
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <p className="text-center text-[11px] text-(--text-tertiary) -mt-2">
              {contours.length} contornos cerrados · {countVertices(contours)} puntos
              {contours.length > 2000 && " · parece una foto: funciona mejor con logos y siluetas"}
            </p>

            <div className="space-y-4 bg-(--surface) rounded-xl border border-(--border) p-5">
              <div>
                <label className="block text-(--text-secondary) text-sm mb-2">Qué es la forma</label>
                <div className="flex flex-wrap gap-2">
                  {SHAPE_MODES.map((m) => (
                    <button key={m.id} onClick={() => setShape(m.id)} className={chip(shape === m.id)}>{m.label}</button>
                  ))}
                </div>
                <p className="text-[10px] text-(--text-tertiary) mt-1">
                  Automático: si la imagen tiene fondo transparente usa lo visible; si no, lo oscuro.
                </p>
              </div>

              <div>
                <label className="block text-(--text-secondary) text-sm mb-2">Detalle de las curvas</label>
                <div className="flex flex-wrap gap-2">
                  {DETAIL_LEVELS.map((d) => (
                    <button key={d.value} onClick={() => setTolerance(d.value)} className={chip(tolerance === d.value)}>{d.label}</button>
                  ))}
                </div>
                <p className="text-[10px] text-(--text-tertiary) mt-1">
                  Más detalle sigue mejor las curvas pequeñas; “Suave” da archivos más ligeros.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-(--text-secondary) cursor-pointer">
                <input type="checkbox" checked={ignoreSpecks} onChange={(e) => setIgnoreSpecks(e.target.checked)} className="accent-(--accent)" />
                Ignorar manchas y puntos sueltos
              </label>

              <div>
                <label className="block text-(--text-secondary) text-sm mb-2">Ancho del dibujo (mm)</label>
                <input
                  type="number"
                  min="1"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                  className="w-full bg-(--surface) border border-(--border) rounded-xl px-4 py-2.5 text-(--text-primary) focus:outline-hidden focus:border-(--accent) transition"
                />
                <p className="text-[10px] text-(--text-tertiary) mt-1">
                  Alto resultante: {(image.height * scale).toFixed(1)} mm. Por defecto, 1 píxel = 1 mm.
                </p>
              </div>

              <div>
                <label className="block text-(--text-secondary) text-sm mb-2">Nombre del archivo</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="mi-plano"
                  className="w-full bg-(--surface) border border-(--border) rounded-xl px-4 py-2.5 text-(--text-primary) placeholder:text-(--text-tertiary) focus:outline-hidden focus:border-(--accent) transition"
                />
              </div>
            </div>

            {contours.length === 0 ? (
              <p className="text-center text-sm text-(--text-secondary)">
                No se detectó ninguna forma. Prueba “Lo claro” o una imagen con más contraste.
              </p>
            ) : (
              <button
                onClick={downloadDxf}
                className="w-full py-3 rounded-xl bg-(--accent) text-white text-sm font-medium hover:opacity-85 transition-opacity shadow-xs flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
                </svg>
                Descargar {customName || "convertido"}.dxf
              </button>
            )}

            <button
              onClick={reset}
              className="w-full py-2 rounded-xl text-(--text-tertiary) hover:text-(--text-secondary) text-sm transition-colors"
            >
              Convertir otra imagen
            </button>
          </>
        )}

        <div className="bg-(--surface) rounded-xl p-4 text-center border border-(--border)">
          <p className="text-(--text-tertiary) text-xs">Vectorización local · Polilíneas cerradas DXF (R12): AutoCAD, LibreCAD, Inkscape, láser y CNC</p>
        </div>
      </div>

      <p className="text-center text-(--text-tertiary) text-xs mt-8">Procesamiento local · Tus imágenes no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout {...toolPageSeo("png-to-dxf")}>{content}</Layout>;
}