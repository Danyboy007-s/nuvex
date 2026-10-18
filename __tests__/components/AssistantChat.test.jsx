import { render, screen, fireEvent, act } from '@testing-library/react';
import AssistantChat from '../../components/AssistantChat';

describe('AssistantChat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('responde a un pedido con la herramienta indicada', () => {
    render(<AssistantChat />);
    fireEvent.change(screen.getByLabelText('Escribe lo que necesitas'), { target: { value: 'quiero unir dos pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }));

    expect(screen.getByText('quiero unir dos pdf')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(600));
    const link = screen.getByRole('link', { name: /PDF Converter/ });
    expect(link).toHaveAttribute('href', '/tools?tool=pdf-converter');
  });

  it('las sugerencias rápidas también funcionan', () => {
    render(<AssistantChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear un QR para el menú de mi negocio' }));
    act(() => jest.advanceTimersByTime(600));
    expect(screen.getByRole('link', { name: /Generador QR/ })).toBeInTheDocument();
  });
});
