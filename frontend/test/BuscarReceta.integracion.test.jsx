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

// ==========================================
// HELPER ACTUALIZADO: FLUJO CON MODAL
// ==========================================
const añadirIngrediente = async (nombre, cantidad = '100') => {
    // 1. Abrir el modal con el FAB
    const fabBtn = await screen.findByText('+');
    fireEvent.click(fabBtn);

    // 2. Esperar a que el input aparezca
    const input = await screen.findByPlaceholderText(/Ingrediente/i);
    fireEvent.change(input, { target: { value: nombre } });

    // 3. Seleccionar sugerencia
    const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
    fireEvent.click(sugerencia);

    // 4. Cambiar cantidad y confirmar
    const inputCantidad = screen.getByPlaceholderText('Cant.');
    fireEvent.change(inputCantidad, { target: { value: cantidad } });
    fireEvent.click(screen.getByText(/Confirmar Selección/i));

    // 5. Cerrar el modal evitando colisión de '✕'
    await waitFor(() => {
        const btnCerrar = document.querySelector('.btn-cerrar-modal');
        if (btnCerrar) {
            fireEvent.click(btnCerrar);
        }
    });

    // 6. Esperar a que el modal se cierre
    await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Ingrediente/i)).not.toBeInTheDocument();
    });
};

afterEach(() => {
    vi.restoreAllMocks();
});

// ==========================================
// BLOQUE: FLUJO NEVERA → BUSCAR → VISTARECETAS
// ==========================================

describe('Integración — Flujo completo Nevera → VistaRecetas', () => {

    beforeEach(() => {
        // Mock robusto: responde según la URL solicitada para evitar colisiones entre el Buscador y las Recetas
        global.fetch = vi.fn(async (url) => {
            if (url.includes('/api/ingredientes')) {
                return { ok: true, json: async () => INGREDIENTES_MOCK };
            }
            if (url.includes('/api/recetas')) {
                return { ok: true, json: async () => RECETAS_MOCK };
            }
            return { ok: false, status: 404 };
        });
    });

    test('Al buscar recetas con ingredientes en la nevera, VistaRecetas muestra los resultados', async () => {
        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Recetas sugeridas')).toBeInTheDocument();

        expect(await screen.findByText('Arroz con tomate')).toBeInTheDocument();
        expect(screen.getByText('Sopa de tomate')).toBeInTheDocument();
        expect(screen.getByText('Risotto')).toBeInTheDocument();
    });

    test('Las recetas muestran su badge de coincidencia correctamente', async () => {
        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Match: 2/2')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/3')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/5')).toBeInTheDocument();
    });

    test('El fetch de recetas recibe los ingredientes de la nevera correctamente formateados', async () => {
        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');

        // Buscamos específicamente la llamada a la API de recetas
        const llamadaRecetas = global.fetch.mock.calls.find(call => call[0].includes('/api/recetas'));
        expect(llamadaRecetas[0]).toContain('tomate');
    });

    test('Si el servidor de recetas falla, VistaRecetas muestra el mensaje de error', async () => {
        // Sobreescribimos el mock para forzar el error en este test
        global.fetch.mockImplementation(async (url) => {
            if (url.includes('/api/ingredientes')) {
                return { ok: true, json: async () => INGREDIENTES_MOCK };
            }
            return Promise.reject(new Error('Network error'));
        });

        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Hubo un problema al buscar las recetas.')).toBeInTheDocument();
    });

    test('Si el servidor devuelve recetas vacías, VistaRecetas muestra el mensaje correspondiente', async () => {
        // Sobreescribimos para que las recetas devuelvan un array vacío
        global.fetch.mockImplementation(async (url) => {
            if (url.includes('/api/ingredientes')) {
                return { ok: true, json: async () => INGREDIENTES_MOCK };
            }
            if (url.includes('/api/recetas')) {
                return { ok: true, json: async () => [] };
            }
        });

        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('No encontramos recetas con esos ingredientes 😔')).toBeInTheDocument();
    });

    test('Desde VistaRecetas, el botón Volver a la Nevera regresa a la vista principal', async () => {
        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');
        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByText('Mi Nevera Virtual')).toBeInTheDocument();
        expect(screen.getByText('Tomate')).toBeInTheDocument();
    });

    test('Los ingredientes de la nevera se mantienen al volver desde VistaRecetas', async () => {
        renderApp();
        
        await añadirIngrediente('Tomate', '2');
        await añadirIngrediente('Arroz', '200');

        fireEvent.click(screen.getByText('Buscar Recetas'));
        await screen.findByText('Recetas sugeridas');

        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByText('Tomate')).toBeInTheDocument();
        expect(screen.getByText('Arroz')).toBeInTheDocument();
    });

});