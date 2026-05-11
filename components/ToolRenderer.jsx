import dynamic from 'next/dynamic';

const toolsMap = {
  'pdf-converter': dynamic(() => import('../pages/tools/pdf-converter')),
  'file-utils': dynamic(() => import('../pages/tools/file-utils')),
  'remove-metadata': dynamic(() => import('../pages/tools/remove-metadata')),
  'png-to-dxf': dynamic(() => import('../pages/tools/png-to-dxf')),
  'text-humanizer': dynamic(() => import('../pages/tools/text-humanizer')),
  'qr-generator': dynamic(() => import('../pages/tools/qr-generator')),
};

export default function ToolRenderer({ tool }) {
  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-4">
          <span className="text-base text-[var(--text-tertiary)]">⌘</span>
        </div>
        <p className="text-[var(--text-secondary)] text-sm font-light">
          selecciona una herramienta
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
          desde el menú de la izquierda
        </p>
      </div>
    );
  }

  const ToolComponent = toolsMap[tool.id];
  
  if (!ToolComponent) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--text-tertiary)] text-sm">herramienta no disponible</p>
      </div>
    );
  }

  return <ToolComponent standalone />;
}