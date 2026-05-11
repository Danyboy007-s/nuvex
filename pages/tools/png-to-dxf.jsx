import { useState, useRef } from "react";
import Layout from "../../components/Layout";

export default function PngToDxfPage({ standalone = false }) {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [converting, setConverting] = useState(false);
  const [dxfContent, setDxfContent] = useState(null);
  const [customName, setCustomName] = useState("convertido");
  const [contourCount, setContourCount] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target.result);
        setImage(file);
        setDxfContent(null);
        setCustomName(file.name.split('.')[0]);
        setContourCount(0);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const imageToBitmap = (imgElement) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = imgElement.width;
    canvas.height = imgElement.height;
    ctx.drawImage(imgElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const bitmap = [];
    
    // Calcular umbral automático usando Otsu (más inteligente)
    // Primero, obtener histograma de brillo
    const histogram = Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
      histogram[Math.floor(brightness)]++;
    }
    
    // Método Otsu para umbral óptimo
    let total = 0;
    for (let i = 0; i < 256; i++) total += histogram[i];
    
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];
    
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let varMax = 0;
    let threshold = 0;
    
    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;
      
      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const varBetween = wB * wF * (mB - mF) * (mB - mF);
      
      if (varBetween > varMax) {
        varMax = varBetween;
        threshold = i;
      }
    }
    
    for (let i = 0; i < canvas.height; i++) {
      bitmap[i] = [];
      for (let j = 0; j < canvas.width; j++) {
        const idx = (i * canvas.width + j) * 4;
        const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
        bitmap[i][j] = brightness < threshold;
      }
    }
    
    return { bitmap, width: canvas.width, height: canvas.height };
  };

  const findContours = (bitmap, width, height) => {
    const visited = Array(height).fill().map(() => Array(width).fill(false));
    const contours = [];
    const dirX = [1, 0, -1, 0];
    const dirY = [0, -1, 0, 1];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (bitmap[y][x] && !visited[y][x]) {
          const contour = [];
          let startX = x, startY = y;
          let currentX = x, currentY = y;
          let dir = 0;
          
          do {
            visited[currentY][currentX] = true;
            contour.push({ x: currentX, y: currentY });
            
            let found = false;
            for (let i = 0; i < 4; i++) {
              const newDir = (dir + i) % 4;
              const newX = currentX + dirX[newDir];
              const newY = currentY + dirY[newDir];
              
              if (newX >= 0 && newX < width && newY >= 0 && newY < height && bitmap[newY][newX]) {
                currentX = newX;
                currentY = newY;
                dir = (newDir + 3) % 4;
                found = true;
                break;
              }
            }
            if (!found) break;
            
          } while (currentX !== startX || currentY !== startY);
          
          if (contour.length > 10) {
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  };

  const contoursToDxf = (contours, width, height) => {
    let dxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
`;
    
    for (const contour of contours) {
      if (contour.length < 3) continue;
      
      dxf += `0
POLYLINE
8
0
66
1
10
0.0
20
0.0
30
0.0
70
0
`;
      
      for (const point of contour) {
        const x = point.x;
        const y = height - point.y;
        dxf += `0
VERTEX
8
0
10
${x}
20
${y}
30
0.0
70
32
`;
      }
      
      dxf += `0
SEQEND
8
0
`;
    }
    
    dxf += `0
ENDSEC
0
EOF`;
    return dxf;
  };

  const convertToDxf = async () => {
    if (!imagePreview) {
      setError("No hay imagen cargada");
      return;
    }
    
    setConverting(true);
    setError(null);
    setContourCount(0);
    
    try {
      const img = new Image();
      img.src = imagePreview;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      
      const { bitmap, width, height } = imageToBitmap(img);
      const contours = findContours(bitmap, width, height);
      
      if (contours.length === 0) {
        setError("No se detectaron bordes. Prueba con una imagen de mayor contraste.");
        setConverting(false);
        return;
      }
      
      const dxf = contoursToDxf(contours, width, height);
      setDxfContent(dxf);
      setContourCount(contours.length);
      
    } catch (err) {
      console.error("Error:", err);
      setError("Error al procesar la imagen. Intenta con otra imagen.");
    }
    
    setConverting(false);
  };

  const downloadDxf = () => {
    if (!dxfContent) return;
    
    const blob = new Blob([dxfContent], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customName}.dxf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <svg className="w-10 h-10 text-[var(--accent)]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path d="m12.99 6.74 1.93 3.44"/>
            <path d="M19.136 12a10 10 0 0 1-14.271 0"/>
            <path d="m21 21-2.16-3.84"/>
            <path d="m3 21 8.02-14.26"/>
            <circle cx="12" cy="5" r="2"/>
          </svg>
        </div>
        <h1 className="text-3xl font-light tracking-tight text-[var(--text-primary)]">Imagen a vector DXF</h1>
        <p className="text-[var(--text-secondary)] text-sm mt-1">Convierte PNG/JPG a DXF vectorial para AutoCAD</p>
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
            accept="image/png,image/jpeg"
            className="hidden"
          />
          <svg className="w-10 h-10 mx-auto mb-3 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-[var(--text-secondary)] text-sm">
            {imagePreview ? "Imagen cargada" : "Selecciona PNG o JPG"}
          </p>
          <p className="text-[var(--text-tertiary)] text-xs mt-1">
            Ideal para logos, planos, siluetas y dibujos lineales
          </p>
        </div>
        
        {imagePreview && (
          <>
            <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]/50">
                <p className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Imagen original</p>
              </div>
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain p-4" />
            </div>
            
            <div>
              <label className="block text-[var(--text-secondary)] text-sm mb-2">Nombre del archivo DXF</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="mi-plano"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition"
              />
              <p className="text-[var(--text-tertiary)] text-xs mt-1">.dxf se agregará automáticamente</p>
            </div>
            
            {!dxfContent && (
              <button
                onClick={convertToDxf}
                disabled={converting}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  converting
                    ? "bg-[var(--surface)] text-[var(--text-tertiary)] cursor-not-allowed border border-[var(--border)]"
                    : "bg-[var(--accent)] text-white hover:opacity-85 shadow-sm"
                }`}
              >
                {converting ? "Convirtiendo..." : "Convertir a DXF"}
              </button>
            )}
            
            {error && (
              <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/30">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            
            {dxfContent && (
              <div className="space-y-4">
                <div className="bg-green-500/10 rounded-xl p-4 text-center border border-green-500/30">
                  <svg className="w-6 h-6 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[var(--text-primary)] text-sm font-medium">Conversión completada</p>
                  <p className="text-[var(--text-tertiary)] text-xs mt-1">{contourCount} contornos vectorizados</p>
                </div>
                
                <button
                  onClick={downloadDxf}
                  className="w-full py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17V3M12 17l-4-4M12 17l4-4M5 21h14" />
                  </svg>
                  Descargar {customName}.dxf
                </button>
                
                <button
                  onClick={() => {
                    setImagePreview(null);
                    setImage(null);
                    setDxfContent(null);
                    setCustomName("convertido");
                    setContourCount(0);
                    setError(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="w-full py-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-sm transition-colors"
                >
                  Convertir otra imagen
                </button>
              </div>
            )}
          </>
        )}
        
        <div className="bg-[var(--surface)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[var(--text-tertiary)] text-xs">Vectorización local · Formato DXF compatible con AutoCAD</p>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <p className="text-center text-[var(--text-tertiary)] text-xs mt-8">Procesamiento local · Tus imágenes no se suben</p>
    </div>
  );

  if (standalone) return content;
  return <Layout title="Nuvex — PNG a DXF para AutoCAD">{content}</Layout>;
}