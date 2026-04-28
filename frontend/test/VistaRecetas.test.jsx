import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VistaRecetas from '../src/VistaRecetas';

// ==========================================
// DATOS MOCK
// ==========================================

const generarRecetasMock = (cantidad) =>
    Array.from({ length: cantidad }, (_, i) => ({
        _id: `id-${i}`,
        title: `Receta ${i + 1}`,
        image_url: `https://imagen.com/${i}.jpg`,
        coincidenciaTexto: i % 3 === 0 ? '4/4' : i % 3 === 1 ? '2/5' : '1/4',
    }));

// Helper: renderiza SOLO VistaRecetas con su router mínimo
const renderVistaRecetas = (queryString = '?ingredientes=tomate|2|ud|') =>
    render(
        <MemoryRouter initialEntries={[`/recetas${queryString}`]}>
            <Routes>
                <Route path="/recetas" element={<VistaRecetas />} />
                <Route path="/" element={<div data-testid="vista-nevera">Nevera</div>} />
                <Route path="/receta/:titulo" element={<div data-testid="vista-detalles">Detalles</div>} />
            </Routes>
        </MemoryRouter>
    );

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => generarRecetasMock(3),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});


// ==========================================
// BLOQUE 1: RENDERIZADO INICIAL
// ==========================================

describe('VistaRecetas unitario — Renderizado inicial', () => {

    test('Muestra siempre la cabecera "Recetas sugeridas"', async () => {
        renderVistaRecetas();

        expect(screen.getByText('Recetas sugeridas')).toBeInTheDocument();
    });

    test('Muestra el texto de carga mientras espera al servidor', () => {
        // Fetch que nunca resuelve → se queda en estado cargando
        global.fetch = vi.fn(() => new Promise(() => { }));

        renderVistaRecetas();

        expect(screen.getByText('Buscando en tu base de datos...')).toBeInTheDocument();
    });

    test('Cuando termina la carga, el texto de carga desaparece', async () => {
        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.queryByText('Buscando en tu base de datos...')).not.toBeInTheDocument();
    });

    test('No llama a fetch si no hay ingredientes en la URL', () => {
        renderVistaRecetas('');

        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('Llama a fetch con la URL correcta al montar', async () => {
        renderVistaRecetas('?ingredientes=tomate|2|ud|');

        await screen.findByText('Receta 1');

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toContain('/api/recetas');
        expect(global.fetch.mock.calls[0][0]).toContain('tomate');
    });

});


// ==========================================
// BLOQUE 2: ESTADOS DE ERROR Y VACÍO
// ==========================================

describe('VistaRecetas unitario — Estados de error y vacío', () => {

    test('Muestra mensaje de error si el fetch falla por red', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        renderVistaRecetas();

        expect(await screen.findByText('Hubo un problema al buscar las recetas.')).toBeInTheDocument();
    });

    test('Muestra mensaje de error si el servidor responde con status no OK', async () => {
        global.fetch = vi.fn().mockResolvedValue({ ok: false });

        renderVistaRecetas();

        expect(await screen.findByText('Hubo un problema al buscar las recetas.')).toBeInTheDocument();
    });

    test('Muestra mensaje vacío si el servidor devuelve array vacío', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [],
        });

        renderVistaRecetas();

        expect(await screen.findByText('No encontramos recetas con esos ingredientes 😔')).toBeInTheDocument();
    });

    test('Cuando hay error no se muestra la grid de recetas', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

        renderVistaRecetas();

        await screen.findByText('Hubo un problema al buscar las recetas.');

        expect(screen.queryByText('Receta 1')).not.toBeInTheDocument();
    });

});


// ==========================================
// BLOQUE 3: RENDERIZADO DE RECETAS
// ==========================================

describe('VistaRecetas unitario — Renderizado de recetas', () => {

    test('Renderiza todas las recetas devueltas por el servidor', async () => {
        renderVistaRecetas();

        expect(await screen.findByText('Receta 1')).toBeInTheDocument();
        expect(screen.getByText('Receta 2')).toBeInTheDocument();
        expect(screen.getByText('Receta 3')).toBeInTheDocument();
    });

    test('Cada receta muestra su badge de coincidencia', async () => {
        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.getByText('Match: 4/4')).toBeInTheDocument();
        expect(screen.getByText('Match: 2/5')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/4')).toBeInTheDocument();
    });

    test('Las imágenes se renderizan con el atributo alt correcto', async () => {
        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.getByAltText('Receta 1')).toBeInTheDocument();
        expect(screen.getByAltText('Receta 2')).toBeInTheDocument();
    });

});


// ==========================================
// BLOQUE 4: LÓGICA DE COLORES DE COINCIDENCIA
// ==========================================

describe('VistaRecetas unitario — Colores de coincidencia (match)', () => {

    test('Receta con coincidencia total (4/4) recibe clase match-verde', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { _id: '1', title: 'Receta Verde', image_url: 'img.jpg', coincidenciaTexto: '4/4' },
            ],
        });

        renderVistaRecetas();

        await screen.findByText('Receta Verde');

        const badge = screen.getByText('Match: 4/4');
        expect(badge).toHaveClass('match-verde');
    });

    test('Receta con coincidencia >= 75% recibe clase match-verde', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { _id: '1', title: 'Receta Verde2', image_url: 'img.jpg', coincidenciaTexto: '3/4' },
            ],
        });

        renderVistaRecetas();

        await screen.findByText('Receta Verde2');

        expect(screen.getByText('Match: 3/4')).toHaveClass('match-verde');
    });

    test('Receta con coincidencia entre 40% y 74% recibe clase match-amarillo', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { _id: '1', title: 'Receta Amarilla', image_url: 'img.jpg', coincidenciaTexto: '2/5' },
            ],
        });

        renderVistaRecetas();

        await screen.findByText('Receta Amarilla');

        expect(screen.getByText('Match: 2/5')).toHaveClass('match-amarillo');
    });

    test('Receta con coincidencia menor al 40% recibe clase match-rojo', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { _id: '1', title: 'Receta Roja', image_url: 'img.jpg', coincidenciaTexto: '1/5' },
            ],
        });

        renderVistaRecetas();

        await screen.findByText('Receta Roja');

        expect(screen.getByText('Match: 1/5')).toHaveClass('match-rojo');
    });

    test('Badge sin formato válido recibe clase match-neutral', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { _id: '1', title: 'Receta Neutral', image_url: 'img.jpg', coincidenciaTexto: null },
            ],
        });

        renderVistaRecetas();

        await screen.findByText('Receta Neutral');

        // El span se renderiza con el texto "Match: " y clase neutral
        const badge = screen.getByText(/Match:/);
        expect(badge).toHaveClass('match-neutral');
    });

});


// ==========================================
// BLOQUE 5: PAGINACIÓN
// ==========================================

describe('VistaRecetas unitario — Paginación', () => {

    test('Con 12 o menos recetas no aparecen controles de paginación', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(12),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.queryByText('Siguiente ›')).not.toBeInTheDocument();
    });

    test('Con más de 12 recetas aparecen los controles de paginación', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.getByText('Siguiente ›')).toBeInTheDocument();
    });

    test('El botón Anterior está deshabilitado en la primera página', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');

        expect(screen.getByText('‹ Anterior')).toBeDisabled();
    });

    test('Al hacer clic en Siguiente se muestra la página 2', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');

        fireEvent.click(screen.getByText('Siguiente ›'));

        expect(await screen.findByText('Receta 13')).toBeInTheDocument();
        expect(screen.queryByText('Receta 1')).not.toBeInTheDocument();
    });

    test('En la última página el botón Siguiente está deshabilitado', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');
        fireEvent.click(screen.getByText('Siguiente ›'));
        await screen.findByText('Receta 13');

        expect(screen.getByText('Siguiente ›')).toBeDisabled();
    });

    test('El botón « va directamente a la primera página', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas();

        await screen.findByText('Receta 1');
        fireEvent.click(screen.getByText('Siguiente ›'));
        await screen.findByText('Receta 13');

        fireEvent.click(screen.getByTitle('Ir a la primera página'));

        expect(await screen.findByText('Receta 1')).toBeInTheDocument();
    });

    test('El parámetro ?pagina=2 en la URL arranca directamente en la página 2', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => generarRecetasMock(13),
        });

        renderVistaRecetas('?ingredientes=tomate|2|ud|&pagina=2');

        expect(await screen.findByText('Receta 13')).toBeInTheDocument();
        expect(screen.queryByText('Receta 1')).not.toBeInTheDocument();
    });

});


// ==========================================
// BLOQUE 6: NAVEGACIÓN
// ==========================================

describe('VistaRecetas unitario — Navegación', () => {

    test('El botón Volver a la Nevera navega a /', async () => {
        renderVistaRecetas();

        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByTestId('vista-nevera')).toBeInTheDocument();
    });

    test('Al hacer clic en una receta navega a /receta/:titulo', async () => {
        renderVistaRecetas();

        await screen.findByText('Receta 1');
        fireEvent.click(screen.getByText('Receta 1'));

        expect(await screen.findByTestId('vista-detalles')).toBeInTheDocument();
    });

});