import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import VistaDetalles from '../src/VistaDetalles';
import { NeveraContext } from '../src/NeveraContext';

const fetchConAuthMock = vi.fn();

vi.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    fetchConAuth: fetchConAuthMock,
  }),
}));

const RECETA_DETALLE = {
  _id: 'receta-123',
  title: 'Arroz con tomate',
  image_url: 'https://example.com/arroz.jpg',
  ingredients: [{ nombre: 'Tomate', cantidad: 2, unidad: 'ud' }],
  steps: ['Paso 1', 'Paso 2'],
};

const renderVistaDetalles = () => {
  render(
    <NeveraContext.Provider value={{ ingredientesNevera: [], restarIngredientesReceta: vi.fn() }}>
      <MemoryRouter initialEntries={['/receta/Arroz%20con%20tomate']}>
        <Routes>
          <Route path="/receta/:titulo" element={<VistaDetalles />} />
        </Routes>
      </MemoryRouter>
    </NeveraContext.Provider>
  );
};

describe('Integracion frontend - Guardar receta favorita', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchConAuthMock.mockImplementation(async (url, options = {}) => {
      const stringUrl = String(url);

      if (stringUrl.includes('/api/recetas/favoritos')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            mensaje: 'Receta añadida a tu lista de favoritos correctamente.',
          }),
        };
      }

      if (stringUrl.includes('/api/recetas/')) {
        return {
          ok: true,
          status: 200,
          json: async () => RECETA_DETALLE,
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('guarda receta en favoritos y muestra confirmacion visual', async () => {
    renderVistaDetalles();

    await screen.findByRole('heading', { name: /arroz con tomate/i });

    const botonFavorito = screen.getByRole('button', { name: /favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByText(/receta añadida a tu lista de favoritos correctamente\./i)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchConAuthMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/recetas/favoritos'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recetaId: RECETA_DETALLE._id }),
        })
      );
    });

    expect(botonFavorito).toHaveAttribute('aria-pressed', 'true');
  });

  test('si el backend rechaza por duplicado, muestra el error y no marca el boton', async () => {
    fetchConAuthMock.mockImplementation(async (url) => {
      const stringUrl = String(url);

      if (stringUrl.includes('/api/recetas/favoritos')) {
        return {
          ok: false,
          status: 400,
          json: async () => ({ error: 'La receta ya está en tu lista de favoritos.' }),
        };
      }

      if (stringUrl.includes('/api/recetas/')) {
        return {
          ok: true,
          status: 200,
          json: async () => RECETA_DETALLE,
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderVistaDetalles();

    await screen.findByRole('heading', { name: /arroz con tomate/i });

    const botonFavorito = screen.getByRole('button', { name: /favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByText(/la receta ya está en tu lista de favoritos\./i)).toBeInTheDocument();
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'false');
  });

  test('si falla la red al guardar favorito, muestra error de conexion y mantiene estado no favorito', async () => {
    fetchConAuthMock.mockImplementation(async (url) => {
      const stringUrl = String(url);

      if (stringUrl.includes('/api/recetas/favoritos')) {
        throw new Error('Network Error');
      }

      if (stringUrl.includes('/api/recetas/')) {
        return {
          ok: true,
          status: 200,
          json: async () => RECETA_DETALLE,
        };
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderVistaDetalles();

    await screen.findByRole('heading', { name: /arroz con tomate/i });

    const botonFavorito = screen.getByRole('button', { name: /favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByText(/no se pudo conectar con el servidor\./i)).toBeInTheDocument();
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'false');
  });
});
