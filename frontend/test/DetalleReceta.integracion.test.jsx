import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/AuthContext';

// ==========================================
// MOCKS Y HELPERS CORREGIDOS
// ==========================================

const INGREDIENTES_MOCK = [
  { _id: '1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: 100 },
  { _id: '2', nombre: 'Arroz', unidad: 'g', equivalencia_g_ml: null },
];

const DETALLE_RECETA_MOCK = {
  _id: 'r1',
  title: 'Arroz con tomate',
  image_url: 'img1.jpg',
  ingredients: [
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
    { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
  ],
  steps: ['Lavar el arroz', 'Cocinar con el tomate'],
  esFavorito: false
};

const renderApp = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );

const añadirIngrediente = async (nombre, cantidad = '1') => {
  const fabBtn = await screen.findByText('+');
  fireEvent.click(fabBtn);

  const input = await screen.findByPlaceholderText(/Ingrediente/i);
  fireEvent.change(input, { target: { value: nombre } });

  const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
  fireEvent.click(sugerencia);

  const inputCantidad = screen.getByPlaceholderText('Cant.');
  fireEvent.change(inputCantidad, { target: { value: cantidad } });

  const btnConfirmar = screen.getByText(/Confirmar Selección/i);
  fireEvent.click(btnConfirmar);

  // --- ARREGLO PARA EL ERROR ---
  // Según tu HTML, el botón de cerrar tiene la clase 'btn-cerrar-modal'
  // Hacemos clic manual porque el modal no se cierra solo al confirmar
  const btnCerrar = await screen.findByText('✕', { selector: '.btn-cerrar-modal' });
  fireEvent.click(btnCerrar);

  // Ahora sí, esperamos a que el modal desaparezca de la vista
  await waitFor(() => {
    expect(screen.queryByPlaceholderText(/Ingrediente/i)).not.toBeInTheDocument();
  }, { timeout: 2000 });
};

describe('Integración — Flujo Completo: Nevera -> Recetas -> Detalles', () => {
  let neveraMockState = [];

  beforeEach(() => {
    neveraMockState = [];
    global.fetch = vi.fn(async (input, options = {}) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/api/auth/refresh')) {
        return { ok: true, status: 200, json: async () => ({ accessToken: 'tk', usuario: { id: 'u1' } }) };
      }
      if (url.includes('/api/ingredientes') && !url.includes('nevera')) {
        return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
      }
      if (url.includes('/api/ingredientes/nevera')) {
        if (options.method === 'POST') {
          const body = JSON.parse(options.body);
          neveraMockState = [...neveraMockState, body];
          return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
        }
        return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
      }
      if (url.includes('/api/recetas')) {
        // Si es detalle
        if (url.includes('Arroz%20con%20tomate')) return { ok: true, status: 200, json: async () => DETALLE_RECETA_MOCK };
        // Si es lista
        return { ok: true, status: 200, json: async () => ([{ _id: 'r1', title: 'Arroz con tomate' }]) };
      }
      return { ok: false, status: 404 };
    });
  });

  test('Flujo: Añadir cantidad insuficiente y verificar lógica de "Faltan" en Detalle', async () => {
    renderApp();

    // Añadimos 1 tomate (la receta pide 2)
    await añadirIngrediente('Tomate', '1');

    // Verificamos que se añadió a la lista de la nevera
    expect(await screen.findByText(/Tomate/i)).toBeInTheDocument();

    // Navegar a recetas
    const btnBuscar = screen.getByText(/Buscar Recetas/i);
    fireEvent.click(btnBuscar);

    // Seleccionar receta
    const recetaCard = await screen.findByText(/Arroz con tomate/i);
    fireEvent.click(recetaCard);

    // --- VERIFICACIÓN DE VISTA DETALLES ---
    // 1. Título y pasos
    expect(await screen.findByText('Arroz con tomate', { selector: 'h1' })).toBeInTheDocument();
    expect(screen.getByText(/Lavar el arroz/i)).toBeInTheDocument();

    // 2. Lógica de "Faltan" (Receta pide 2, Nevera tiene 1)
    // Buscamos el texto que genera tu lógica: "— Faltan 1 ud"
    expect(await screen.findByText(/Faltan 1 ud/i)).toBeInTheDocument();

    // 3. Lógica de ingrediente que no tenemos (Arroz)
    expect(screen.getByText(/No tienes este ingrediente/i)).toBeInTheDocument();
  });

  test('Navegación completa y botón volver', async () => {
    renderApp();
    await añadirIngrediente('Tomate', '2');

    fireEvent.click(await screen.findByText(/Buscar Recetas/i));
    fireEvent.click(await screen.findByText(/Arroz con tomate/i));

    // Botón Volver de VistaDetalles
    const btnVolver = await screen.findByText(/Volver/i);
    fireEvent.click(btnVolver);

    expect(await screen.findByText(/Recetas sugeridas/i)).toBeInTheDocument();

    // Volver a la Nevera
    fireEvent.click(screen.getByText(/Volver a la Nevera/i));
    expect(await screen.findByText(/Mi Nevera Virtual/i)).toBeInTheDocument();
  });
});