import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer', () => {
  it('muestra el año actual y los enlaces principales', () => {
    render(<Footer />);
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} Nuvex`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Herramientas' })).toHaveAttribute('href', '/tools');
    expect(screen.getByRole('link', { name: 'Nuvex IA' })).toHaveAttribute('href', '/tools?tool=assistant');
  });
});
