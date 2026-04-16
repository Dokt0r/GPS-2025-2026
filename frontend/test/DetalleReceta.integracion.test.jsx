import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

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

  fireEvent.click(screen.getByText(/Confirmar Selección/i));
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Integración — Flujo Completo: Nevera -> VistaRecetas -> VistaDetalles', () => {

  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/api/ingredientes')) return { ok: true, json: async () => INGREDIENTES_MOCK };
      
      // CORRECCIÓN: Hacemos la evaluación de la ruta más estricta pero segura
      if (/\/api\/recetas\/r1$/.test(url) || url.endsWith('r1')) {
        return { ok: true, json: async () => DETALLE_RECETA_MOCK };
      }
      
      if (url.includes('/api/recetas')) return { ok: true, json: async () => RECETAS_MOCK };
      
      return { ok: false, status: 404 };
    });
  });

  test('Flujo exitoso: Añadir ingredientes, buscar y ver detalles de una receta', async () => {
    renderApp();

    // --- PASO 1: NEVERA ---
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText(/Buscar Recetas/i));

    // --- PASO 2: VISTA RECETAS ---
    const recetaCard = await screen.findByText(/Arroz con tomate/i);
    expect(recetaCard).toBeInTheDocument();
    expect(screen.getByText('Match: 2/2')).toBeInTheDocument();

    fireEvent.click(recetaCard);

    // --- PASO 3: VISTA DETALLES ---
    // Si tienes un loader, lo esperamos
    const loader = screen.queryByText(/Preparando la receta/i);
    if (loader) {
        expect(loader).toBeInTheDocument();
    }

    // CORRECCIÓN: Envolvemos en waitFor para lidiar con el h1 renderizado vacío
    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Arroz con tomate/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Lavar el arroz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completar Receta/i })).toBeInTheDocument();
  });

  test('Navegación hacia atrás: De detalles a lista, y de lista a nevera manteniendo estado', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');

    fireEvent.click(screen.getByText(/Buscar Recetas/i));
    fireEvent.click(await screen.findByText(/Arroz con tomate/i));

    const btnVolverLista = await screen.findByText(/Volver/i);
    fireEvent.click(btnVolverLista);
    
    // CORRECCIÓN: waitFor para asegurar la transición de vuelta
    await waitFor(() => {
        expect(screen.getByText(/Recetas sugeridas/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Volver a la Nevera/i));

    await waitFor(() => {
        expect(screen.getByText(/Mi Nevera Virtual/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Tomate')).toBeInTheDocument();
  });

  test('Manejo de error 404 en VistaDetalles', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/api/ingredientes')) return { ok: true, json: async () => INGREDIENTES_MOCK };
      if (/\/api\/recetas\/r1$/.test(url) || url.endsWith('r1')) return { ok: false, status: 404 };
      if (url.includes('/api/recetas')) return { ok: true, json: async () => RECETAS_MOCK };
    });

    renderApp();

    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());
    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText(/Buscar Recetas/i));

    fireEvent.click(await screen.findByText(/Arroz con tomate/i));

    // CORRECCIÓN: Usar waitFor para dar tiempo a que el componente resuelva el 404
    await waitFor(() => {
        expect(screen.getByText(/❌ Receta no encontrada/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});