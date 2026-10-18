import { render, screen } from '@testing-library/react';
import HeroSection from '../../components/HeroSection';

describe('HeroSection', () => {
  it('muestra el titular y el enlace a las herramientas', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Pídelo\.\s*Nuvex lo resuelve\./);
    expect(screen.getByRole('link', { name: /Ver herramientas/ })).toHaveAttribute('href', '/tools');
  });

  it('incluye Nuvex IA, lo más destacado de la portada', () => {
    render(<HeroSection />);
    expect(screen.getByRole('heading', { name: 'Nuvex IA' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preguntar' })).toBeInTheDocument();
  });
});
