import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VistaDetalles from '../src/VistaDetalles';
import { NeveraContext } from '../src/NeveraContext';

// 1. MOCK DE AUTH: Esto soluciona el 90% de los fallos en integración.
// En lugar de usar el AuthProvider real que busca tokens en localStorage,
// inyectamos un mock que dice que el usuario ya está logueado.
vi.mock('../src/AuthContext.jsx', () => ({
  useAuth: () => ({
    usuario: { id: 'u1' },
    fetchConAuth: (...args) => global.fetch(...args),
    cargando: false,
  }),
  // El Provider mock simplemente deja pasar a los hijos
  AuthProvider: ({ children }) => <>{children}</>
}));

const recetaBase = {
  _id: 'r1',
  title: 'Tortilla',
  image_url: 'https://example.com/tortilla.jpg',
  ingredients: [{ nombre: 'huevo', cantidad: 2, unidad: 'ud' }],
  steps: ['Batir huevos', 'Cuajar en la sartén'],
};

const renderVistaDetallesIntegracion = ({
  ingredientesNevera,
  restarIngredientesReceta = vi.fn(),
  receta = recetaBase,
} = {}) => {
  
  global.fetch = vi.fn(async (input) => {
    // No hace falta mockear /api/auth/refresh porque ya mockeamos el useAuth arriba
    return {
      ok: true,
      status: 200,
      json: async () => receta,
    };
  });

  render(
    <NeveraContext.Provider value={{ ingredientesNevera, restarIngredientesReceta }}>
      <MemoryRouter initialEntries={['/receta/tortilla']}>
        <Routes>
          <Route path="/receta/:titulo" element={<VistaDetalles />} />
          <Route path="/" element={<h1>Pantalla Nevera</h1>} />
        </Routes>
      </MemoryRouter>
    </NeveraContext.Provider>
  );

  return { restarIngredientesReceta };
};

describe('Integración frontend - Completar receta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('completa receta cuando hay ingredientes suficientes y vuelve a la nevera', async () => {
    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 4, unidad: 'ud' }],
    });

    // Esperamos a que la receta cargue y aparezca el botón
    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    expect(await screen.findByText(/¡receta completada! buen provecho/i)).toBeInTheDocument();

    expect(restarIngredientesReceta).toHaveBeenCalledTimes(1);
    // IMPORTANTE: findByText de "Pantalla Nevera" con un timeout generoso por la animación del toast
    expect(await screen.findByText('Pantalla Nevera', {}, { timeout: 5000 })).toBeInTheDocument();
  }, 10000);

  it('considera coincidencia parcial y sin importar mayúsculas', async () => {
    const recetaTomate = {
      ...recetaBase,
      ingredients: [{ nombre: 'Tomate Triturado', cantidad: 2, unidad: 'ud' }],
    };

    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      ingredientesNevera: [{ nombre: 'tomate', cantidad: 3, unidad: 'ud' }],
      receta: recetaTomate,
    });

    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    expect(await screen.findByText(/¡receta completada! buen provecho/i)).toBeInTheDocument();
   expect(restarIngredientesReceta).toHaveBeenCalledWith(recetaTomate.ingredients, undefined);
  });
});