import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// ==========================================
// SETUP GLOBAL Y DATOS MOCK
// ==========================================
const INGREDIENTES_MOCK = [
  { _id: '1', nombre: 'Tomate',  unidad: 'ud', equivalencia_g_ml: null },
  { _id: '2', nombre: 'Arroz',   unidad: 'g',  equivalencia_g_ml: null },
  { _id: '3', nombre: 'Leche',   unidad: 'ml', equivalencia_g_ml: null },
  { _id: '4', nombre: 'Huevo',   unidad: 'ud', equivalencia_g_ml: 60   },
  { _id: '5', nombre: 'Aceite',  unidad: 'ml', equivalencia_g_ml: null },
];

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

beforeEach(() => {
  // Mock base por defecto para pruebas de añadir/eliminar
  global.fetch = vi.fn(async (url) => {
    if (url.includes('/api/ingredientes')) {
      return { ok: true, json: async () => INGREDIENTES_MOCK };
    }
    return { ok: false, status: 404 };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ==========================================
// BLOQUE 1: AÑADIR INGREDIENTES A LA NEVERA
// ==========================================
describe('Sistema — Añadir ingredientes a la nevera', () => {
  test('Al añadir un ingrediente aparece en la lista de la nevera', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '3');

    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('3 ud')).toBeInTheDocument();
  });

  test('Añadir el mismo ingrediente dos veces acumula la cantidad', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');
    await añadirIngrediente('Tomate', '3');

    expect(screen.getByText('5 ud')).toBeInTheDocument();
    expect(screen.getAllByText('Tomate')).toHaveLength(1);
  });

  test('Añadir varios ingredientes distintos los muestra todos en la nevera', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');
    await añadirIngrediente('Arroz',  '200');
    await añadirIngrediente('Leche',  '500');

    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Arroz')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
  });

  test('Tras añadir un ingrediente, los inputs se limpian automáticamente', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '3');

    expect(screen.getByPlaceholderText(/Ingrediente/i).value).toBe('');
    expect(screen.getByPlaceholderText('Cant.').value).toBe('');
  });

  test('Añadir ingrediente sin especificar cantidad asigna 1 por defecto', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    const input = screen.getByPlaceholderText(/Ingrediente/i);
    fireEvent.change(input, { target: { value: 'Tomate' } });
    const sugerencia = await screen.findByText('Tomate');
    fireEvent.click(sugerencia);
    fireEvent.click(screen.getByText('Confirmar Selección'));

    expect(screen.getByText('1 ud')).toBeInTheDocument();
  });

  test('Los ingredientes de la nevera se muestran ordenados alfabéticamente', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');
    await añadirIngrediente('Arroz',  '200');
    await añadirIngrediente('Leche',  '500');

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Arroz');
    expect(items[1]).toHaveTextContent('Leche');
    expect(items[2]).toHaveTextContent('Tomate');
  });

  test('Aparece toast de confirmación al añadir un ingrediente', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');

    expect(await screen.findByText(/Añadido: Tomate/i)).toBeInTheDocument();
  });

  test('No se puede añadir un ingrediente escrito a mano que no esté en la base de datos', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    const input = screen.getByPlaceholderText(/Ingrediente/i);
    fireEvent.change(input, { target: { value: 'IngredienteInventado' } });
    fireEvent.click(screen.getByText('Confirmar Selección'));

    expect(screen.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeInTheDocument();
  });
});

// ==========================================
// BLOQUE 2: ELIMINAR INGREDIENTES DE LA NEVERA
// ==========================================
describe('Sistema — Eliminar ingredientes de la nevera', () => {
  test('Eliminar el único ingrediente muestra el mensaje de nevera vacía', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');
    expect(screen.getByText('Tomate')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));

    expect(screen.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeInTheDocument();
    expect(screen.queryByText('Tomate')).not.toBeInTheDocument();
  });

  test('Eliminar un ingrediente de una lista con varios no afecta a los demás', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Arroz',  '200');
    await añadirIngrediente('Leche',  '500');
    await añadirIngrediente('Tomate', '2');

    const botones = screen.getAllByText('✕');
    fireEvent.click(botones[0]); // Arroz

    expect(screen.queryByText('Arroz')).not.toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText('Tomate')).toBeInTheDocument();
  });

  test('Se pueden eliminar todos los ingredientes uno a uno', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Arroz',  '200');
    await añadirIngrediente('Leche',  '500');

    fireEvent.click(screen.getAllByText('✕')[0]);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    fireEvent.click(screen.getByText('✕'));
    expect(screen.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeInTheDocument();
  });
});

// ==========================================
// BLOQUE 3: FLUJO DE BÚSQUEDA DE RECETAS
// ==========================================
describe('Sistema — Flujo de búsqueda de recetas', () => {
  test('Intentar buscar recetas con la nevera vacía muestra un mensaje de error', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    fireEvent.click(screen.getByText('Buscar Recetas'));

    expect(await screen.findByText(/Tu nevera está vacía. Añade algo primero/i)).toBeInTheDocument();
  });

  test('Con ingredientes en la nevera, el botón Buscar Recetas navega a /recetas', async () => {
    // Mock inteligente para este test específico
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/api/ingredientes')) return { ok: true, json: async () => INGREDIENTES_MOCK };
      if (url.includes('/api/recetas')) return { ok: true, json: async () => [] };
      return { ok: false, status: 404 };
    });

    renderApp();
    await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

    await añadirIngrediente('Tomate', '2');
    fireEvent.click(screen.getByText('Buscar Recetas'));

    expect(await screen.findByText('Recetas sugeridas')).toBeInTheDocument();
  });
});

// ==========================================
// BLOQUE 4: ESTADO DE CONEXIÓN CON EL SERVIDOR
// ==========================================
describe('Sistema — Estado de conexión con el servidor', () => {
  test('Si el servidor falla, el input de búsqueda queda deshabilitado', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderApp();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Sin conexión/i)).toBeDisabled();
    });
  });

  test('Si el servidor falla, se muestra un toast de error de conexión', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderApp();

    expect(await screen.findByText(/No se pudo conectar con el servidor/i)).toBeInTheDocument();
  });

  test('Si la base de datos de ingredientes está vacía, se muestra aviso', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    renderApp();

    expect(await screen.findByText(/base de datos de ingredientes está vacía/i)).toBeInTheDocument();
  });
});