import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VistaDetalles from '../src/VistaDetalles';

// Mock contexto
vi.mock('../src/NeveraContext.jsx', () => ({
  useNevera: () => ({
    ingredientesNevera: [],
    restarIngredientesReceta: vi.fn(),
  }),
}));

// Mock router
vi.mock('react-router-dom', () => ({
  useParams: () => ({ titulo: 'tortilla' }),
  useNavigate: () => vi.fn(),
}));

describe('VistaDetalles UI', () => {

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

  it('muestra alerta de ingredientes faltantes al pulsar completar', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          title: 'Test',
          ingredients: [{ nombre: 'huevo', cantidad: 2, unidad: 'ud' }],
          steps: ['Paso 1'],
        }),
      })
    );

    render(<VistaDetalles />);

    const btn = await screen.findByText(/completar receta/i);
    fireEvent.click(btn);

    expect(await screen.findByText(/no tienes suficientes ingredientes/i)).toBeInTheDocument();
  });

});