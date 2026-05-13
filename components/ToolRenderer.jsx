import dynamic from 'next/dynamic';

const LoadingPlaceholder = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-4">
      <svg className="w-5 h-5 text-[var(--accent)] animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
      </svg>
    </div>
    <p className="text-[var(--text-secondary)] text-sm font-light">cargando herramienta...</p>
  </div>
);

const toolsMap = {
  'pdf-converter': dynamic(() => import('../pages/tools/pdf-converter'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'file-utils': dynamic(() => import('../pages/tools/file-utils'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'remove-metadata': dynamic(() => import('../pages/tools/remove-metadata'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'remove-bg': dynamic(() => import('../pages/tools/remove-bg'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'png-to-dxf': dynamic(() => import('../pages/tools/png-to-dxf'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'text-humanizer': dynamic(() => import('../pages/tools/text-humanizer'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
  'qr-generator': dynamic(() => import('../pages/tools/qr-generator'), { 
    ssr: false,
    loading: () => <LoadingPlaceholder />
  }),
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