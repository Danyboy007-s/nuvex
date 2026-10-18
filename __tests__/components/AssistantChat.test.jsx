import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssistantChat from '../../components/AssistantChat';

// Sin servidor en los tests: /api/assistant "no está configurada" (503) y el
// chat debe responder con el asistente local.
beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
});
afterEach(() => {
  delete global.fetch;
});

describe('AssistantChat', () => {
  it('envía el historial a /api/assistant y, sin IA, responde en modo local', async () => {
    render(<AssistantChat />);
    fireEvent.change(screen.getByLabelText('Escribe lo que necesitas'), { target: { value: 'quiero unir dos pdf' } });
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }));

    expect(screen.getByText('quiero unir dos pdf')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /PDF Converter/ });
    expect(link).toHaveAttribute('href', '/tools?tool=pdf-converter');

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/assistant');
    expect(JSON.parse(options.body).messages).toEqual([{ from: 'user', text: 'quiero unir dos pdf' }]);
  });

  it('muestra la respuesta de la IA cuando está disponible', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ text: 'Te recomiendo el Generador QR.', toolIds: ['qr-generator'] }),
    }));
    render(<AssistantChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear un QR para el menú de mi negocio' }));
    expect(await screen.findByText('Te recomiendo el Generador QR.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: /Generador QR/ })).toBeInTheDocument());
  });
});
