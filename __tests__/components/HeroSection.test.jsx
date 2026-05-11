import { render, screen } from '@testing-library/react';
import HeroSection from '../../components/HeroSection';

describe('HeroSection', () => {
  it('debe mostrar el título Nuvex', () => {
    render(<HeroSection />);
    expect(screen.getByText('Nuvex')).toBeInTheDocument();
  });

  it('debe mostrar el botón ver herramientas', () => {
    render(<HeroSection />);
    // El botón tiene "ver herramientas" y luego una flecha aparte
    expect(screen.getByText('ver herramientas')).toBeInTheDocument();
  });
});
