import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import VistaDetalles from '../src/VistaDetalles';

describe('Integracion VistaDetalles', () => {
  const renderVistaDetalles = (ruta = '/receta/Tortilla%20de%20patata') => {
    return render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/receta/:titulo" element={<VistaDetalles />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('muestra informacion de receta, ingredientes y proceso de elaboracion', async () => {
    const recetaMock = {
      title: 'Tortilla de patata',
      image_url: 'https://example.com/tortilla.jpg',
      ingredients: [
        { nombre: 'Huevos', cantidad: 4, unidad: 'ud' },
        { nombre: 'Patata', cantidad: 500, unidad: 'g' },
        { nombre: 'Aceite de oliva', cantidad: 30, unidad: 'ml' }
      ],
      steps: [
        'Pelar y cortar la patata.',
        'Freir la patata hasta que este tierna.',
        'Mezclar con huevo batido y cuajar la tortilla.'
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => recetaMock
    });

    vi.stubGlobal('fetch', fetchMock);

    renderVistaDetalles('/receta/Tortilla%20de%20patata');

    expect(screen.getByText('Preparando la receta...')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Tortilla de patata' })).toBeInTheDocument();
    expect(screen.queryByText('Preparando la receta...')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Ingredientes' })).toBeInTheDocument();
    expect(screen.getByText('Huevos')).toBeInTheDocument();
    expect(screen.getByText('Patata')).toBeInTheDocument();
    expect(screen.getByText('Aceite de oliva')).toBeInTheDocument();
    expect(screen.getByText('4 ud')).toBeInTheDocument();
    expect(screen.getByText('500 g')).toBeInTheDocument();
    expect(screen.getByText('30 ml')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Preparación' })).toBeInTheDocument();
    expect(screen.getByText('Pelar y cortar la patata.')).toBeInTheDocument();
    expect(screen.getByText('Freir la patata hasta que este tierna.')).toBeInTheDocument();
    expect(screen.getByText('Mezclar con huevo batido y cuajar la tortilla.')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/recetas/Tortilla%20de%20patata');
    });
  });

  test('codifica correctamente caracteres especiales del titulo en la URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Pan (sin gluten)!', ingredients: [], steps: [] })
    });

    vi.stubGlobal('fetch', fetchMock);
    renderVistaDetalles('/receta/Pan%20(sin%20gluten)!');

    await screen.findByRole('heading', { name: 'Pan (sin gluten)!' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/recetas/Pan%20%28sin%20gluten%29%21');
  });

  test('muestra mensajes de vacio cuando no hay ingredientes ni pasos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Receta minima',
        image_url: 'https://example.com/minima.jpg',
        ingredients: [],
        steps: []
      })
    });

    vi.stubGlobal('fetch', fetchMock);
    renderVistaDetalles('/receta/Receta%20minima');

    expect(await screen.findByRole('heading', { name: 'Receta minima' })).toBeInTheDocument();
    expect(screen.getByText('No hay ingredientes especificados.')).toBeInTheDocument();
    expect(screen.getByText('No hay instrucciones disponibles.')).toBeInTheDocument();
  });

  test('muestra error especifico cuando la receta no existe (404)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({})
    });

    vi.stubGlobal('fetch', fetchMock);
    renderVistaDetalles('/receta/Inexistente');

    expect(await screen.findByText('❌ Receta no encontrada.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ingredientes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Preparación' })).not.toBeInTheDocument();
  });

  test('muestra error generico cuando falla el servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({})
    });

    vi.stubGlobal('fetch', fetchMock);
    renderVistaDetalles('/receta/FalloServidor');

    expect(await screen.findByText('❌ Error al conectar con el servidor.')).toBeInTheDocument();
  });

  test('muestra error generico cuando fetch rechaza por error de red', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network Error'));

    vi.stubGlobal('fetch', fetchMock);
    renderVistaDetalles('/receta/ErrorRed');

    expect(await screen.findByText('❌ Network Error')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
