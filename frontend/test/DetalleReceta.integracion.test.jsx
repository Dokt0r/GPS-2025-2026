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
  { 
    _id: 'r1', id: 'r1', 
    title: 'Arroz con tomate', titulo: 'Arroz con tomate', 
    image_url: 'img1.jpg', imagen: 'img1.jpg',
    coincidenciaTexto: '2/2' 
  },
  { 
    _id: 'r2', id: 'r2', 
    title: 'Sopa de tomate', titulo: 'Sopa de tomate', 
    image_url: 'img2.jpg', imagen: 'img2.jpg',
    coincidenciaTexto: '1/3' 
  },
];

const DETALLE_RECETA_MOCK = {
  _id: 'r1',
  id: 'r1',
  title: 'Arroz con tomate',
  titulo: 'Arroz con tomate',
  image_url: 'img1.jpg',
  imagen: 'img1.jpg',
  ingredients: [
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
    { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
  ],
  ingredientes: [ 
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
    { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
  ],
  steps: ['Lavar el arroz', 'Cocinar con el tomate'],
  instrucciones: ['Lavar el arroz', 'Cocinar con el tomate'], 
  preparacion: ['Lavar el arroz', 'Cocinar con el tomate'],
};

const renderApp = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  );

// --- FUNCIÓN ACTUALIZADA PARA EVITAR EL CHOQUE DE LAS '✕' ---
const añadirIngrediente = async (nombre, cantidad = '100') => {
  // 1. Clic en el botón flotante (FAB) para abrir el modal
  const fabBtn = await screen.findByText('+');
  fireEvent.click(fabBtn);

  // 2. Esperar a que el modal cargue y el input esté disponible
  const input = await screen.findByPlaceholderText(/Ingrediente/i);
  fireEvent.change(input, { target: { value: nombre } });

  // 3. Seleccionar la sugerencia
  const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
  fireEvent.click(sugerencia);

  // 4. Poner la cantidad y confirmar
  const inputCantidad = screen.getByPlaceholderText('Cant.');
  fireEvent.change(inputCantidad, { target: { value: cantidad } });
  fireEvent.click(screen.getByText(/Confirmar Selección/i));

  // 5. Cerrar el modal apuntando específicamente a su clase para evitar el error de múltiples elementos
  await waitFor(() => {
    const btnCerrar = document.querySelector('.btn-cerrar-modal');
    if (btnCerrar) {
      fireEvent.click(btnCerrar);
    }
  });

  // 6. Esperamos a que el modal desaparezca del DOM
  await waitFor(() => {
    expect(screen.queryByPlaceholderText(/Ingrediente/i)).not.toBeInTheDocument();
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Integración — Flujo Completo: Nevera -> VistaRecetas -> VistaDetalles', () => {

  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      const stringUrl = String(url);
      
      if (stringUrl.includes('/api/ingredientes')) {
        return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
      }
      
      if (stringUrl.match(/\/api\/recetas\/r1$/) || stringUrl.includes('Arroz%20con%20tomate')) {
        return { ok: true, status: 200, json: async () => DETALLE_RECETA_MOCK };
      }
      
      if (stringUrl.endsWith('/api/recetas') || stringUrl.includes('/api/recetas?')) {
        return { ok: true, status: 200, json: async () => RECETAS_MOCK };
      }
      
      return { ok: false, status: 404 };
    });
  });

  test('Flujo exitoso: Añadir ingredientes, buscar y ver detalles de una receta', async () => {
    renderApp();

    // Ya no esperamos por el input directamente, añadirIngrediente hace todo el proceso
    await añadirIngrediente('Tomate', '2');
    
    // Una vez cerrado el modal, buscamos la receta
    fireEvent.click(screen.getByText(/Buscar Recetas/i));

    const recetaCard = await screen.findByText(/Arroz con tomate/i);
    expect(recetaCard).toBeInTheDocument();
    
    fireEvent.click(recetaCard);

    await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Arroz con tomate/i })).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Lavar el arroz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Completar Receta/i })).toBeInTheDocument();
  });

  test('Navegación hacia atrás: De detalles a lista, y de lista a nevera manteniendo estado', async () => {
    renderApp();

    await añadirIngrediente('Tomate', '2');

    fireEvent.click(screen.getByText(/Buscar Recetas/i));
    fireEvent.click(await screen.findByText(/Arroz con tomate/i));

    const btnVolverLista = await screen.findByText(/Volver/i);
    fireEvent.click(btnVolverLista);
    
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
      const stringUrl = String(url);
      
      if (stringUrl.includes('/api/ingredientes')) {
        return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
      }
      
      if (stringUrl.match(/\/api\/recetas\/r1$/)) {
        return { ok: false, status: 404 };
      }
      
      if (stringUrl.endsWith('/api/recetas') || stringUrl.includes('/api/recetas?')) {
        return { ok: true, status: 200, json: async () => RECETAS_MOCK };
      }
      
      return { ok: false, status: 404 }; 
    });

    renderApp();

    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText(/Buscar Recetas/i));

    fireEvent.click(await screen.findByText(/Arroz con tomate/i));

    await waitFor(() => {
        expect(screen.getByText(/Receta no encontrada/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});