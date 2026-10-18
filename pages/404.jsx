import Link from 'next/link';
import Layout from '../components/Layout';

export default function Custom404() {
  return (
    <Layout title="Página no encontrada | Nuvex" noindex>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <span className="inline-block -rotate-2 rounded-3xl px-6 py-2 text-7xl md:text-8xl font-semibold tracking-tight text-[#16161a]" style={{ background: "#d4ff3a", boxShadow: "var(--shadow-lg)" }}>
          404
        </span>
        <h1 className="text-2xl font-semibold tracking-tight mt-10">Página no encontrada</h1>
        <p className="text-(--text-secondary) mt-2 max-w-md">
          La página que buscas no existe o cambió de lugar.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Link href="/" className="lift inline-flex h-11 items-center px-5 rounded-2xl text-sm font-semibold bg-(--text-primary) text-(--bg)">
            Volver al inicio
          </Link>
          <Link href="/tools?tool=assistant" className="lift inline-flex h-11 items-center px-5 rounded-2xl text-sm font-semibold text-white" style={{ background: "var(--ai)" }}>
            Pregúntale a Nuvex IA
          </Link>
        </div>
      </div>
    </Layout>
  );
}