import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach, it } from 'vitest';
import VistaDetalles from '../src/VistaDetalles';

// ==========================================
// MOCKS DE CONTEXTO Y ROUTER
// ==========================================

// Mock de AuthContext (Añadido fetchConAuth para evitar el error anterior)
vi.mock('../src/AuthContext.jsx', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Test User' },
    token: 'fake-token',
    fetchConAuth: (...args) => global.fetch(...args) 
  }),
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock de NeveraContext
vi.mock('../src/NeveraContext.jsx', () => ({
  useNevera: () => ({
    ingredientesNevera: [],
    restarIngredientesReceta: vi.fn(),
  }),
}));

// Mock de react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ titulo: 'tortilla' }),
  useNavigate: () => vi.fn(),
}));

// ==========================================
// BLOQUE DE PRUEBAS
// ==========================================

describe('VistaDetalles UI', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra mensaje de carga', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // nunca resuelve

    render(<VistaDetalles />);

    expect(screen.getByText(/preparando la receta/i)).toBeInTheDocument();
  });

  it('muestra título, ingredientes y pasos', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Tortilla',
          ingredients: [
            { nombre: 'huevo', cantidad: 2, unidad: 'ud' }
          ],
          steps: ['Batir huevos']
        }),
      })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText('Tortilla')).toBeInTheDocument();
    expect(screen.getByText('huevo')).toBeInTheDocument();
    expect(screen.getByText('Batir huevos')).toBeInTheDocument();
  });

  it('muestra error si falla la carga', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('muestra error de receta no encontrada', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 404 })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/receta no encontrada/i)).toBeInTheDocument();
  });

  it('muestra mensaje si no hay ingredientes', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test',
          ingredients: [],
          steps: ['Paso 1'],
        }),
      })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/no hay ingredientes/i)).toBeInTheDocument();
  });

  it('muestra mensaje si no hay pasos', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test',
          ingredients: [],
          steps: [],
        }),
      })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/no hay instrucciones/i)).toBeInTheDocument();
  });

  it('muestra botón volver', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test',
          ingredients: [],
          steps: [],
        }),
      })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/volver/i)).toBeInTheDocument();
  });

  it('muestra botón completar receta', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test',
          ingredients: [{ nombre: 'huevo', cantidad: 1, unidad: 'ud' }],
          steps: ['Paso 1'],
        }),
      })
    );

    render(<VistaDetalles />);

    expect(await screen.findByText(/completar receta/i)).toBeInTheDocument();
  });

});