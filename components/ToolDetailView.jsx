import Link from "next/link";

export default function ToolDetailView({ tool }) {
  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <div className="text-6xl mb-4 opacity-30">🔧</div>
        <h3 className="text-gray-500 dark:text-gray-400 text-lg font-light">Select a tool</h3>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Choose from the sidebar to see details</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <div className="mb-8">
        <div className="text-4xl mb-4 opacity-70">{getIconForTool(tool.id)}</div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-black dark:text-white">
          {tool.name}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
          {tool.description}
        </p>
        <div className="w-12 h-px bg-gray-300 dark:bg-gray-700 mt-4" />
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What it does</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {tool.longDescription}
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
        <Link href={tool.href}>
          <button className="px-6 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black text-sm font-medium hover:scale-105 transition-transform duration-300 shadow-lg">
            Open {tool.name} →
          </button>
        </Link>
      </div>

      <div className="mt-6">
        <p className="text-gray-400 dark:text-gray-500 text-xs">
          ⚡ Local processing · No data leaves your device
        </p>
      </div>
    </div>
  );
}

function getIconForTool(id) {
  const icons = {
    'binary-hex': '0101',
    'unit-converter': '📏',
    'png-to-dxf': '✧',
    'qr-generator': '◼️',
    'file-utils': '⚙️',
    'student-engineering': '📘',
  };
  return icons[id] || '🔧';
}