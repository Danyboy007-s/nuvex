// Ícono y color sólido de cada herramienta (por id de lib/tools.js).
// Los usan la portada (FeaturedTools) y el menú de /tools (ToolSidebar).
// Colores elegidos para leerse bien con texto/ícono blanco encima.

const Svg = ({ children, className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    {children}
  </svg>
);

export const TOOL_VISUALS = {
  "assistant": {
    color: "var(--ai)",
    icon: (p) => (
      <Svg {...p}>
        <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" />
        <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8z" />
      </Svg>
    ),
  },
  "pdf-converter": {
    color: "#ff5a3c",
    icon: (p) => (
      <Svg {...p}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5M9 13h6M9 17h4" />
      </Svg>
    ),
  },
  "file-utils": {
    color: "#00a88f",
    icon: (p) => (
      <Svg {...p}>
        <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
      </Svg>
    ),
  },
  "remove-metadata": {
    color: "#f2a900",
    icon: (p) => (
      <Svg {...p}>
        <path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" />
        <path d="M9.5 8.5l5 5M14.5 8.5l-5 5" />
      </Svg>
    ),
  },
  "remove-bg": {
    color: "#ff4f9a",
    icon: (p) => (
      <Svg {...p}>
        <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
        <circle cx="12" cy="11" r="3" />
        <path d="M7 19c1-2.5 3-4 5-4s4 1.5 5 4" />
      </Svg>
    ),
  },
  "png-to-dxf": {
    color: "#3d5afe",
    icon: (p) => (
      <Svg {...p}>
        <path d="M4 20L12 4l8 16z" />
        <circle cx="12" cy="4" r="1.5" fill="currentColor" />
        <circle cx="4" cy="20" r="1.5" fill="currentColor" />
        <circle cx="20" cy="20" r="1.5" fill="currentColor" />
      </Svg>
    ),
  },
  "text-humanizer": {
    color: "#2fb344",
    icon: (p) => (
      <Svg {...p}>
        <path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-4.5A8 8 0 1 1 21 12z" />
        <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" />
      </Svg>
    ),
  },
  "qr-generator": {
    color: "#16161a",
    icon: (p) => (
      <Svg {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14h3v3M21 14v.01M14 21h3M21 18v3" />
      </Svg>
    ),
  },
};

// Cuadro de color sólido con el ícono blanco de la herramienta.
// `background` permite otro fondo (p. ej. translúcido sobre la tarjeta violeta de la IA).
export function ToolBadge({ id, size = "md", className = "", background }) {
  const visual = TOOL_VISUALS[id];
  if (!visual) return null;
  const box = size === "sm" ? "w-7 h-7 rounded-lg" : size === "lg" ? "w-12 h-12 rounded-2xl" : "w-10 h-10 rounded-xl";
  const icon = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";
  return (
    <span
      className={`${box} inline-flex items-center justify-center text-white shrink-0 ${id === "qr-generator" ? "dark:ring-1 dark:ring-white/20" : ""} ${className}`}
      style={{ background: background || visual.color }}
    >
      {visual.icon({ className: icon })}
    </span>
  );
}
