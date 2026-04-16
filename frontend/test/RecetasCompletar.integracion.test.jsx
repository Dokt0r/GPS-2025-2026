import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import VistaDetalles from '../src/VistaDetalles';
import { NeveraContext } from '../src/NeveraContext';

// Receta base reutilizable para no repetir datos en cada test.
// Representa un caso "normal" de receta con ingredientes y pasos.
const recetaBase = {
  title: 'Tortilla',
  image_url: 'https://example.com/tortilla.jpg',
  ingredients: [{ nombre: 'huevo', cantidad: 2, unidad: 'ud' }],
  steps: ['Batir huevos', 'Cuajar en la sartén'],
};

// Helper de integración:
// - Mockea la llamada fetch del detalle de receta.
// - Monta VistaDetalles dentro de Router real (MemoryRouter) con rutas.
// - Inyecta NeveraContext para simular estado de nevera y función de descuento.
const renderVistaDetallesIntegracion = ({
  ingredientesNevera,
  restarIngredientesReceta = vi.fn(),
  receta = recetaBase,
} = {}) => {
  // Simulamos respuesta exitosa del backend con la receta recibida por parámetro.
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(receta),
    })
  );

  // Ruta inicial: detalle de receta.
  // Ruta "/": pantalla de nevera simplificada para comprobar navegación tras completar.
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
  // Limpieza de mocks entre tests para aislar resultados.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Restauramos temporizadores reales por seguridad si algún test los modifica.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('completa receta cuando hay ingredientes suficientes y vuelve a la nevera', async () => {

    // Nevera con cantidad suficiente para completar receta (2 ud requeridas, 4 ud disponibles).
    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 4, unidad: 'ud' }],
    });

    // Acción del usuario: pulsar "Completar Receta".
    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    // Verificamos feedback visual de éxito.
    expect(await screen.findByText(/¡receta completada! buen provecho/i)).toBeInTheDocument();

    // Verificamos efecto de negocio: se descuenta receta exactamente una vez
    // y con la lista de ingredientes esperada.
    expect(restarIngredientesReceta).toHaveBeenCalledTimes(1);
    expect(restarIngredientesReceta).toHaveBeenCalledWith(recetaBase.ingredients);

    // Al completarse, el componente navega a la pantalla principal (nevera).
    expect(await screen.findByText('Pantalla Nevera', {}, { timeout: 4500 })).toBeInTheDocument();
  }, 10000);

  it('muestra alerta y no descuenta ingredientes cuando no alcanza cantidad', async () => {
    // Nevera insuficiente: 1 ud disponible, pero la receta exige 2 ud.
    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 1, unidad: 'ud' }],
    });

    // Acción del usuario: intentar completar receta.
    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    // Verificamos mensaje de bloqueo y detalle del faltante.
    expect(await screen.findByText(/no tienes suficientes ingredientes/i)).toBeInTheDocument();
    expect(screen.getByText('huevo', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/solo tienes 1 ud/i)).toBeInTheDocument();

    // No debe haber descuento cuando faltan ingredientes.
    expect(restarIngredientesReceta).not.toHaveBeenCalled();
  });

  it('muestra ingrediente faltante cuando no existe en la nevera', async () => {
    // Receta alternativa que pide un ingrediente distinto a los de la nevera.
    const recetaConIngredienteNoDisponible = {
      ...recetaBase,
      ingredients: [{ nombre: 'cebolla', cantidad: 1, unidad: 'ud' }],
    };

    // Nevera sin "cebolla" para validar el motivo "no disponible en tu nevera".
    renderVistaDetallesIntegracion({
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 3, unidad: 'ud' }],
      receta: recetaConIngredienteNoDisponible,
    });

    // Acción del usuario: intentar completar receta.
    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    // Verificamos alerta y motivo de faltante por ausencia total.
    expect(await screen.findByText(/no tienes suficientes ingredientes/i)).toBeInTheDocument();
    expect(screen.getByText('cebolla', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/no disponible en tu nevera/i)).toBeInTheDocument();
  });

  it('permite completar cuando la nevera está en gramos y la receta pide unidades', async () => {

    const recetaEnUnidades = {
      ...recetaBase,
      ingredients: [{ nombre: 'huevo', cantidad: 2, unidad: 'ud' }],
    };

    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      // 220g con equivalencia 110g por unidad => 2 ud exactas.
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 220, unidad: 'g', equivalencia_g_ml: 110 }],
      receta: recetaEnUnidades,
    });

    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    expect(await screen.findByText(/¡receta completada! buen provecho/i)).toBeInTheDocument();
    expect(restarIngredientesReceta).toHaveBeenCalledTimes(1);
    expect(restarIngredientesReceta).toHaveBeenCalledWith(recetaEnUnidades.ingredients);
    expect(await screen.findByText('Pantalla Nevera', {}, { timeout: 4500 })).toBeInTheDocument();
  }, 10000);

  it('bloquea completar cuando la nevera está en unidades y la receta pide gramos insuficientes', async () => {
    const recetaEnGramos = {
      ...recetaBase,
      ingredients: [{ nombre: 'huevo', cantidad: 150, unidad: 'g' }],
    };

    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      // 1 ud con equivalencia 100g, pero receta pide 150g.
      ingredientesNevera: [{ nombre: 'huevo', cantidad: 1, unidad: 'ud', equivalencia_g_ml: 100 }],
      receta: recetaEnGramos,
    });

    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    expect(await screen.findByText(/no tienes suficientes ingredientes/i)).toBeInTheDocument();
    expect(screen.getByText('huevo', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText(/solo tienes 1 ud/i)).toBeInTheDocument();
    expect(restarIngredientesReceta).not.toHaveBeenCalled();
  });

  it('considera coincidencia parcial y sin importar mayúsculas en nombre de ingrediente', async () => {

    const recetaNombreCompuesto = {
      ...recetaBase,
      ingredients: [{ nombre: 'Tomate Triturado', cantidad: 2, unidad: 'ud' }],
    };

    const { restarIngredientesReceta } = renderVistaDetallesIntegracion({
      // El algoritmo usa includes + toLowerCase, por eso "tomate" debe casar con "Tomate Triturado".
      ingredientesNevera: [{ nombre: 'tomate', cantidad: 3, unidad: 'ud' }],
      receta: recetaNombreCompuesto,
    });

    const botonCompletar = await screen.findByRole('button', { name: /completar receta/i });
    fireEvent.click(botonCompletar);

    expect(await screen.findByText(/¡receta completada! buen provecho/i)).toBeInTheDocument();
    expect(restarIngredientesReceta).toHaveBeenCalledTimes(1);
    expect(restarIngredientesReceta).toHaveBeenCalledWith(recetaNombreCompuesto.ingredients);
    expect(await screen.findByText('Pantalla Nevera', {}, { timeout: 4500 })).toBeInTheDocument();
  }, 10000);
});
