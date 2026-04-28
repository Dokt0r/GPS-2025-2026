import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Ajusta estas rutas según la estructura de tu proyecto
import App from '../src/App';
import { AuthProvider } from '../src/AuthContext'; 

// ─────────────────────────────────────────────────────────────
// MOCKS DE DATOS
// ─────────────────────────────────────────────────────────────

const INGREDIENTES_MOCK = [
  { _id: '1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: 100 },
  { _id: '2', nombre: 'Arroz', unidad: 'g', equivalencia_g_ml: null },
];

const RECETAS_MOCK = [
  { 
    _id: 'r1', id: 'r1', 
    title: 'Arroz con tomate', 
    image_url: 'img1.jpg', 
    coincidenciaTexto: '2/2' 
  }
];

const DETALLE_RECETA_MOCK = {
  _id: 'r1',
  id: 'r1',
  title: 'Arroz con tomate',
  image_url: 'img1.jpg',
  ingredients: [
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
    { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
  ],
  steps: ['Lavar el arroz', 'Cocinar con el tomate'],
};

// ─────────────────────────────────────────────────────────────
// HELPERS DE RENDERIZADO Y ACCIÓN
// ─────────────────────────────────────────────────────────────

const renderApp = () =>
  render(
    <AuthProvider> 
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );

/**
 * Añade un ingrediente y se asegura de que el estado se actualice en la UI
 * antes de permitir que el test continúe.
 */
const añadirIngrediente = async (nombre, cantidad = '100') => {
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

  // ESPERA CRÍTICA: Validar que el ingrediente aparece en la lista de la nevera
  // Esto evita el error de "Tu nevera está vacía" al navegar a recetas.
  await screen.findByText(nombre);

  // Cerrar el modal si el componente no lo hace automáticamente
  const btnCerrar = document.querySelector('.btn-cerrar-modal');
  if (btnCerrar) {
    fireEvent.click(btnCerrar);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Ingrediente/i)).not.toBeInTheDocument();
    });
  }
};

// ─────────────────────────────────────────────────────────────
// BLOQUE DE PRUEBAS
// ─────────────────────────────────────────────────────────────

describe('Integración — Flujo Completo: Nevera -> VistaRecetas -> VistaDetalles', () => {

  beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
      const stringUrl = String(url);
      
      // Mock de Autenticación (simula sesión activa)
      if (stringUrl.includes('/api/auth/refresh')) {
        return { 
          ok: true, 
          status: 200, 
          json: async () => ({ accessToken: 'token-test', usuario: { id: 'u1', nombre: 'Test' } }) 
        };
      }

      if (stringUrl.includes('/api/ingredientes')) {
        return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
      }
      
      // Mock de detalle de receta
      if (stringUrl.match(/\/api\/recetas\/r1$/) || stringUrl.includes('Arroz%20con%20tomate')) {
        return { ok: true, status: 200, json: async () => DETALLE_RECETA_MOCK };
      }
      
      // Mock de listado de recetas
      if (stringUrl.endsWith('/api/recetas') || stringUrl.includes('/api/recetas?')) {
        return { ok: true, status: 200, json: async () => RECETAS_MOCK };
      }
      
      return { ok: false, status: 404 };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('Flujo exitoso: Añadir ingredientes, buscar y ver detalles de una receta', async () => {
    renderApp();

    // 1. Añadimos el ingrediente
    await añadirIngrediente('Tomate', '2');
    
    // 2. Navegar a recetas
    const btnBuscar = screen.getByText(/Buscar Recetas/i);
    fireEvent.click(btnBuscar);

    // 3. Seleccionar la receta de la lista (usamos findBy para esperar la carga de la API)
    const recetaCard = await screen.findByText(/Arroz con tomate/i, {}, { timeout: 4000 });
    fireEvent.click(recetaCard);

    // 4. Verificación en la vista de detalles
    const titulo = await screen.findByRole('heading', { name: /Arroz con tomate/i });
    expect(titulo).toBeInTheDocument();

    // Comprobamos los ingredientes usando un matcher flexible por si el texto está fragmentado
    expect(screen.getByText((content, element) => {
      return element.textContent === '200 g' || content.includes('200 g');
    })).toBeInTheDocument();
    
    expect(screen.getByText(/Lavar el arroz/i)).toBeInTheDocument();
  });

  test('Navegación hacia atrás: De detalles a lista, y de lista a nevera', async () => {
    renderApp();

    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText(/Buscar Recetas/i));
    
    const recetaCard = await screen.findByText(/Arroz con tomate/i);
    fireEvent.click(recetaCard);

    // Botón Volver en VistaDetalles -> Regresa a Lista
    const btnVolverDetalle = await screen.findByText(/Volver/i);
    fireEvent.click(btnVolverDetalle);
    
    expect(await screen.findByText(/Recetas sugeridas/i)).toBeInTheDocument();

    // Botón Volver en VistaRecetas -> Regresa a Nevera
    const btnVolverNevera = screen.getByText(/Volver a la Nevera/i);
    fireEvent.click(btnVolverNevera);

    await waitFor(() => {
      expect(screen.getByText(/Mi Nevera Virtual/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText('Tomate')).toBeInTheDocument();
  });

  test('Manejo de error 404 en VistaDetalles', async () => {
    // Sobrescribimos el mock solo para este test para que falle la carga de la receta
    global.fetch.mockImplementation(async (url) => {
      const stringUrl = String(url);
      if (stringUrl.includes('/api/auth/refresh')) return { ok: true, status: 200, json: async () => ({ accessToken: 't', usuario: {} }) };
      if (stringUrl.includes('/api/ingredientes')) return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
      if (stringUrl.includes('/api/recetas')) {
        // El listado funciona, pero el detalle (o búsqueda por nombre) dará 404
        if (stringUrl.includes('Arroz%20con%20tomate')) return { ok: false, status: 404 };
        return { ok: true, status: 200, json: async () => RECETAS_MOCK };
      }
      return { ok: false, status: 404 };
    });

    renderApp();

    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText(/Buscar Recetas/i));
    
    const recetaCard = await screen.findByText(/Arroz con tomate/i);
    fireEvent.click(recetaCard);

    // Verificamos que VistaDetalles muestra el error
    const errorMsg = await screen.findByText(/Receta no encontrada/i, {}, { timeout: 4000 });
    expect(errorMsg).toBeInTheDocument();
  });
});