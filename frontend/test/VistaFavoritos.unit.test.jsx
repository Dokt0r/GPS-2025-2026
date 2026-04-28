import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import VistaFavoritos from '../src/VistaFavoritos';

const fetchConAuthMock = vi.fn();

vi.mock('../src/AuthContext', () => ({
  useAuth: () => ({ fetchConAuth: fetchConAuthMock }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('VistaFavoritos - Unit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra mensaje vacío cuando no hay favoritos', async () => {
    fetchConAuthMock.mockResolvedValueOnce({ ok: true, json: async () => ({ favoritos: [] }) });

    render(<VistaFavoritos />);

    expect(await screen.findByText(/cargando tus recetas favoritas/i)).toBeTruthy();

    // Esperamos a que desaparezca el estado de carga y aparezca el mensaje vacío
    expect(await screen.findByText(/aún no tienes recetas favoritas/i)).toBeInTheDocument();
  });

  it('muestra la lista de favoritos ordenada alfabéticamente y permite eliminar', async () => {
    const favoritosInicial = [
      { _id: 'r-z', title: 'Zanahoria', image_url: 'z.jpg' },
      { _id: 'r-a', title: 'Arroz', image_url: 'a.jpg' },
    ];

    // Primera llamada GET devuelve la lista
    fetchConAuthMock.mockImplementationOnce(async () => ({ ok: true, json: async () => ({ favoritos: favoritosInicial }) }))
      // Segunda llamada DELETE devuelve ok
      .mockImplementationOnce(async (_, options = {}) => {
        if (options && options.method === 'DELETE') return { ok: true, json: async () => ({}) };
        return { ok: false, json: async () => ({}) };
      });

    render(<VistaFavoritos />);

    // Se muestran los títulos ordenados: Arroz antes que Zanahoria
    const tituloArroz = await screen.findByRole('heading', { name: /mis favoritos/i }).then(() => screen.findByText('Arroz'));
    expect(tituloArroz).toBeInTheDocument();

    const tarjetas = await screen.findAllByRole('img');
    expect(tarjetas.length).toBeGreaterThanOrEqual(2);

    // Botones de eliminar (tienen title="Quitar de favoritos")
    const botonesQuitar = screen.getAllByTitle(/quitar de favoritos/i);
    expect(botonesQuitar.length).toBeGreaterThanOrEqual(2);

    // Hacemos click en el primer botón y esperamos a que se elimine "Arroz"
    fireEvent.click(botonesQuitar[0]);

    await waitFor(() => {
      expect(screen.queryByText('Arroz')).not.toBeInTheDocument();
    });
  });

  it('muestra error si la petición falla', async () => {
    fetchConAuthMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'fallo' }) });

    render(<VistaFavoritos />);

    // Debe mostrar un mensaje de error
    expect(await screen.findByText(/no se pudieron cargar tus favoritos/i)).toBeInTheDocument();
  });
});
