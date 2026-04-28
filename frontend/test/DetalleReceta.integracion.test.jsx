import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// ==========================================
// DATOS MOCK (ESTÁTICOS)
// ==========================================

const INGREDIENTES_MOCK = [
  { _id: '1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: 100 },
  { _id: '2', nombre: 'Arroz', unidad: 'g', equivalencia_g_ml: null },
];

const RECETAS_MOCK = [
  { _id: 'r1', title: 'Arroz con tomate', image_url: 'img1.jpg', coincidenciaTexto: '2/2' },
  { _id: 'r2', title: 'Sopa de tomate', image_url: 'img2.jpg', coincidenciaTexto: '1/3' },
];

const DETALLE_RECETA_MOCK = {
  _id: 'r1',
  title: 'Arroz con tomate',
  image_url: 'img1.jpg',
  ingredients: [
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
    { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
  ],
  steps: ['Lavar el arroz', 'Cocinar con el tomate']
};

// ==========================================
// HELPERS
// ==========================================

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

const añadirIngrediente = async (nombre, cantidad = '100') => {
  const input = screen.getByPlaceholderText(/Ingrediente/i);
  fireEvent.change(input, { target: { value: nombre } });

  const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
  fireEvent.click(sugerencia);

  const inputCantidad = screen.getByPlaceholderText('Cant.');
  fireEvent.change(inputCantidad, { target: { value: cantidad } });

  fireEvent.click(screen.getByText('Confirmar Selección'));
};

afterEach(() => {
  vi.restoreAllMocks();
});

// ==========================================
// BLOQUE DE PRUEBAS DE INTEGRACIÓN
// ==========================================

describe('Integración — Flujo Completo: Nevera -> VistaRecetas -> VistaDetalles', () => {

  beforeEach(() => {
    // Configuramos los mocks de fetch en orden secuencial
    global.fetch = vi.fn()
      // 1. Carga de ingredientes (Nevera)
      .mockResolvedValueOnce({ ok: true, json: async () => INGREDIENTES_MOCK })
      // 2. Búsqueda de recetas (VistaRecetas)
      .mockResolvedValueOnce({ ok: true, json: async () => RECETAS_MOCK })
      // 3. Detalle de una receta específica (VistaDetalles)
      .mockResolvedValueOnce({ ok: true, json: async () => DETALLE_RECETA_MOCK });
  });

  test('Flujo exitoso: Añadir ingredientes, buscar y ver detalles de una receta', async () => {
    renderApp();

    // --- PASO 1: NEVERA ---
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText('Buscar Recetas'));

    // --- PASO 2: VISTA RECETAS ---
    // Comprobamos que aparecen las tarjetas
    const recetaCard = await screen.findByText('Arroz con tomate');
    expect(recetaCard).toBeInTheDocument();
    expect(screen.getByText('Match: 2/2')).toBeInTheDocument();

    // Navegamos al detalle
    fireEvent.click(recetaCard);

    // --- PASO 3: VISTA DETALLES ---
    // Verificamos estado de carga inicial
    expect(screen.getByText(/Preparando la receta/i)).toBeInTheDocument();

    // Verificamos que el contenido del detalle carga correctamente
    const tituloDetalle = await screen.findByRole('heading', { name: /Arroz con tomate/i });
    expect(tituloDetalle).toBeInTheDocument();

    // Comprobamos que los ingredientes y pasos del mock están presentes
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Lavar el arroz')).toBeInTheDocument();

    // Verificamos que el botón "Completar Receta" existe
    expect(screen.getByRole('button', { name: /Completar Receta/i })).toBeInTheDocument();
  });


  test('Navegación hacia atrás: De detalles a lista, y de lista a nevera manteniendo estado', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');

    // Ir a lista
    fireEvent.click(screen.getByText('Buscar Recetas'));

    // Ir a detalle
    fireEvent.click(await screen.findByText('Arroz con tomate'));

    // Volver a la lista (Botón Volver de VistaDetalles)
    const btnVolverLista = await screen.findByText(/Volver/i);
    fireEvent.click(btnVolverLista);
    expect(await screen.findByText('Recetas sugeridas')).toBeInTheDocument();

    // Volver a la nevera (Botón de VistaRecetas)
    fireEvent.click(screen.getByText(/Volver a la Nevera/i));

    // Comprobar que el "Tomate" sigue ahí
    expect(await screen.findByText('Mi Nevera Virtual')).toBeInTheDocument();
    expect(screen.getByText('Tomate')).toBeInTheDocument();
  });

  test('Manejo de error 404 en VistaDetalles', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => INGREDIENTES_MOCK })
      .mockResolvedValueOnce({ ok: true, json: async () => RECETAS_MOCK })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    renderApp();

    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText('Buscar Recetas'));

    fireEvent.click(await screen.findByText('Arroz con tomate'));

    // Comprobamos que muestra el mensaje de error de tu componente
    expect(await screen.findByText(/❌ Receta no encontrada/i)).toBeInTheDocument();
  });
});