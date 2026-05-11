import Link from 'next/link';
import Layout from '../components/Layout';

export default function Custom404() {
  return (
    <Layout title="Página no encontrada">
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-8xl md:text-9xl font-light text-[var(--text-primary)] tracking-tight">404</h1>
        <div className="w-12 h-px bg-[var(--accent)]/40 my-6" />
        <h2 className="text-xl font-light text-[var(--text-secondary)]">Página no encontrada</h2>
        <p className="text-[var(--text-tertiary)] text-sm mt-2 max-w-md">
          Lo sentimos, la página que buscas no existe o fue movida.
        </p>
        <Link href="/">
          <button className="mt-8 px-6 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-medium hover:scale-105 transition-all duration-200">
            Volver al inicio
          </button>
        </Link>
      </div>
    </Layout>
  );
}