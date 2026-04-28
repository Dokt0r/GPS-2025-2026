import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VistaDetalles from '../src/VistaDetalles'; // Ajusta la ruta a tu componente
import { guardarRecetaFavorita } from '../src/services/favoritos'; // Ajusta la ruta a tu servicio

// ─────────────────────────────────────────────
// MOCKS DE DEPENDENCIAS EXTERNAS
// ─────────────────────────────────────────────

// Mock del servicio de favoritos
vi.mock('../src/services/favoritos', () => ({
  guardarRecetaFavorita: vi.fn(),
}));

// Creamos un mock manual para fetchConAuth que podamos modificar en cada test
const mockFetchConAuth = vi.fn();

// Mock de AuthContext
vi.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    fetchConAuth: mockFetchConAuth
  }),
}));

// Mock de NeveraContext
vi.mock('../src/NeveraContext', () => ({
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
    
    // Por defecto, simulamos que la receta carga correctamente y NO es favorita todavía
    mockFetchConAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        _id: '123',
        title: 'Tortilla',
        ingredients: [],
        steps: [],
        esFavorito: false // <--- Refleja el nuevo cambio del backend
      }),
    });
  });

  it('LC-19-1: Añade la receta a favoritos y muestra mensaje de confirmación', async () => {
    guardarRecetaFavorita.mockResolvedValueOnce({
      ok: true,
      mensaje: 'Receta guardada en tus favoritos correctamente.'
    });

    render(<VistaDetalles />);

    // Esperamos a que cargue la vista (desaparece el loading) y buscamos el botón
    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    
    // Al principio no debe estar presionado
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'false');

    // Hacemos click
    fireEvent.click(botonFavorito);

    // Verificamos que el mensaje de éxito aparece en la pantalla
    expect(await screen.findByRole('status')).toHaveTextContent('Receta guardada en tus favoritos correctamente.');
    
    // Verificamos que el botón ha cambiado a estado activo
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'true');
  });

  it('LC-19-2: Muestra error correspondiente si la receta no existe al guardar', async () => {
    guardarRecetaFavorita.mockResolvedValueOnce({
      ok: false,
      mensaje: 'Error: La receta que intentas guardar ya no existe.'
    });

    render(<VistaDetalles />);

    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByRole('status')).toHaveTextContent('Error: La receta que intentas guardar ya no existe.');
    
    // Como dio error, no debería haberse marcado visualmente como activo
    expect(botonFavorito).toHaveAttribute('aria-pressed', 'false');
  });

  it('LC-19-3: Muestra error correspondiente si ocurre un fallo en el servidor', async () => {
    guardarRecetaFavorita.mockRejectedValueOnce(new Error('Fallo de red'));

    render(<VistaDetalles />);

    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });
    fireEvent.click(botonFavorito);

    expect(await screen.findByRole('status')).toHaveTextContent('No se pudo conectar con el servidor.');
  });

  it('Nuevo Test: Si el backend indica que ya es favorita al cargar, el botón aparece marcado', async () => {
    // Simulamos que el backend nos dice que la receta YA está en la lista de favoritos del usuario
    mockFetchConAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        _id: '123',
        title: 'Tortilla',
        ingredients: [],
        steps: [],
        esFavorito: true // <--- Viene como true desde la carga inicial
      }),
    });

    render(<VistaDetalles />);

    // Esperamos a que el botón aparezca
    const botonFavorito = await screen.findByRole('button', { name: /Favorito/i });

    // Verificamos que automáticamente se ha marcado como 'true' gracias al useEffect
    await waitFor(() => {
      expect(botonFavorito).toHaveAttribute('aria-pressed', 'true');
    });
  });
});