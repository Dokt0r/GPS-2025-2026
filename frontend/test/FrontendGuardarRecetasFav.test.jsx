import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VistaDetalles from '../src/components/VistaDetalles'; // Ajusta la ruta a tu componente
import { guardarRecetaFavorita } from '../src/services/favoritos'; // Ajusta la ruta a tu servicio

// ─────────────────────────────────────────────
// MOCKS DE DEPENDENCIAS EXTERNAS
// ─────────────────────────────────────────────

// Mock del servicio de favoritos
vi.mock('../src/services/favoritos', () => ({
  guardarRecetaFavorita: vi.fn(),
}));

// Mock de AuthContext
vi.mock('../src/AuthContext.jsx', () => ({
  useAuth: () => ({
    fetchConAuth: vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Tortilla',
          ingredients: [],
          steps: [],
        }),
      })
    )
  }),
}));

// Mock de NeveraContext
vi.mock('../src/NeveraContext.jsx', () => ({
  useNevera: () => ({
    ingredientesNevera: [],
    restarIngredientesReceta: vi.fn(),
  }),
}));

// Mock del Router (para useParams y useNavigate)
vi.mock('react-router-dom', () => ({
  useParams: () => ({ titulo: 'tortilla' }),
  useNavigate: () => vi.fn(),
}));

// ─────────────────────────────────────────────
// SUITE DE PRUEBAS: HISTORIA DE USUARIO
// ─────────────────────────────────────────────

describe('Historia de Usuario: Guardar recetas como favoritas', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Sobrescribimos el fetch global por si el componente hace alguna otra llamada nativa
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Tortilla',
          ingredients: [],
          steps: [],
        }),
      })
    );
  });

  it('LC-19-1: Añade la receta a favoritos y muestra mensaje de confirmación', async () => {
    guardarRecetaFavorita.mockResolvedValueOnce({
      ok: true,
      mensaje: 'Receta guardada en tus favoritos correctamente.'
    });

    render(<VistaDetalles />);

    // Esperamos a que cargue la vista y buscamos el botón
    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    fireEvent.click(botonFavorito);

    // Verificamos que el mensaje de éxito aparece en la pantalla
    expect(await screen.findByRole('status')).toHaveTextContent('Receta guardada en tus favoritos correctamente.');
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'true');
  });

  it('LC-19-2: Muestra error correspondiente si la receta no existe en el backend', async () => {
    guardarRecetaFavorita.mockResolvedValueOnce({
      ok: false,
      mensaje: 'Error: La receta que intentas guardar ya no existe.'
    });

    render(<VistaDetalles />);

    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByRole('status')).toHaveTextContent('Error: La receta que intentas guardar ya no existe.');
  });

  it('LC-19-3: Muestra error correspondiente si la receta ya estaba en favoritos', async () => {
    guardarRecetaFavorita.mockResolvedValueOnce({
      ok: false,
      mensaje: 'Esta receta ya se encuentra en tu lista de favoritos.'
    });

    render(<VistaDetalles />);

    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByRole('status')).toHaveTextContent('Esta receta ya se encuentra en tu lista de favoritos.');
  });
});