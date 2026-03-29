import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';

// ==========================================
// DATOS MOCK
// ==========================================

const INGREDIENTES_MOCK = [
    { _id: '1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: null },
    { _id: '2', nombre: 'Arroz', unidad: 'g', equivalencia_g_ml: null },
];

const RECETAS_MOCK = [
    { _id: 'r1', title: 'Arroz con tomate', image_url: 'img1.jpg', coincidenciaTexto: '2/2' },
    { _id: 'r2', title: 'Sopa de tomate', image_url: 'img2.jpg', coincidenciaTexto: '1/3' },
    { _id: 'r3', title: 'Risotto', image_url: 'img3.jpg', coincidenciaTexto: '1/5' },
];

// Helper: renderiza la App completa con router
const renderApp = () =>
    render(
        <MemoryRouter initialEntries={['/']}>
            <App />
        </MemoryRouter>
    );

// Helper: añade un ingrediente a la nevera
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
// BLOQUE: FLUJO NEVERA → BUSCAR → VISTARECETAS
// ==========================================

describe('Integración — Flujo completo Nevera → VistaRecetas', () => {

    beforeEach(() => {
        // Primera llamada: carga ingredientes base
        // Segunda llamada: fetch de recetas en VistaRecetas
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => INGREDIENTES_MOCK })
            .mockResolvedValueOnce({ ok: true, json: async () => RECETAS_MOCK });
    });

    test('Al buscar recetas con ingredientes en la nevera, VistaRecetas muestra los resultados', async () => {
        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        // Comprobamos que estamos en VistaRecetas
        expect(await screen.findByText('Recetas sugeridas')).toBeInTheDocument();

        // Comprobamos que las recetas mockeadas aparecen
        expect(await screen.findByText('Arroz con tomate')).toBeInTheDocument();
        expect(screen.getByText('Sopa de tomate')).toBeInTheDocument();
        expect(screen.getByText('Risotto')).toBeInTheDocument();
    });

    test('Las recetas muestran su badge de coincidencia correctamente', async () => {
        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Match: 2/2')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/3')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/5')).toBeInTheDocument();
    });

    test('El fetch de recetas recibe los ingredientes de la nevera correctamente formateados', async () => {
        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');

        // Verificamos que la segunda llamada al fetch incluye el ingrediente en la URL
        const segundaLlamada = global.fetch.mock.calls[1][0];
        expect(segundaLlamada).toContain('/api/recetas');
        expect(segundaLlamada).toContain('tomate');
    });

    test('Si el servidor de recetas falla, VistaRecetas muestra el mensaje de error', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => INGREDIENTES_MOCK })
            .mockRejectedValueOnce(new Error('Network error'));

        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Hubo un problema al buscar las recetas.')).toBeInTheDocument();
    });

    test('Si el servidor devuelve recetas vacías, VistaRecetas muestra el mensaje correspondiente', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => INGREDIENTES_MOCK })
            .mockResolvedValueOnce({ ok: true, json: async () => [] });

        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('No encontramos recetas con esos ingredientes 😔')).toBeInTheDocument();
    });

    test('Desde VistaRecetas, el botón Volver a la Nevera regresa a la vista principal', async () => {
        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');
        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        // Volvemos a ver la nevera con el ingrediente que teníamos
        expect(await screen.findByText('Mi Nevera Virtual')).toBeInTheDocument();
        expect(screen.getByText('Tomate')).toBeInTheDocument();
    });

    test('Los ingredientes de la nevera se mantienen al volver desde VistaRecetas', async () => {
        renderApp();
        await waitFor(() => expect(screen.getByPlaceholderText(/Ingrediente/i)).not.toBeDisabled());

        await añadirIngrediente('Tomate', '2');
        await añadirIngrediente('Arroz', '200');

        fireEvent.click(screen.getByText('Buscar Recetas'));
        await screen.findByText('Recetas sugeridas');

        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByText('Tomate')).toBeInTheDocument();
        expect(screen.getByText('Arroz')).toBeInTheDocument();
    });

});