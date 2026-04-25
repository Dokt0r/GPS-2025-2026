import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/AuthContext';

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

const renderApp = () =>
    render(
        <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        </AuthProvider>
    );

// ==========================================
// HELPER: FLUJO CON MODAL
// ==========================================
const añadirIngrediente = async (nombre, cantidad = '100') => {
    const fabBtn = await screen.findByText('+');
    fireEvent.click(fabBtn);

    const input = await screen.findByPlaceholderText(/Ingrediente/i);
    fireEvent.change(input, { target: { value: nombre } });

    const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
    fireEvent.click(sugerencia);

    const inputCantidad = screen.getByPlaceholderText('Cant.');
    fireEvent.change(inputCantidad, { target: { value: cantidad } });
    fireEvent.click(screen.getByText(/Confirmar Selección/i));

    await waitFor(() => {
        const btnCerrar = document.querySelector('.btn-cerrar-modal');
        if (btnCerrar) {
            fireEvent.click(btnCerrar);
        }
    });

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

    let forzarErrorRecetas = false;
    let forzarRecetasVacias = false;
    let neveraMockState = []; // <-- ESTADO EN MEMORIA PARA EL MOCK

    beforeEach(() => {
        forzarErrorRecetas = false;
        forzarRecetasVacias = false;
        neveraMockState = []; // Limpiamos la nevera antes de cada test

        global.fetch = vi.fn(async (input, options = {}) => {
            const url = typeof input === 'string' ? input : input.url;

            // 1. Simular sesión activa
            if (url.includes('/api/auth/refresh')) {
                return { ok: true, status: 200, json: async () => ({ accessToken: 'token', usuario: { id: 'u1' } }) };
            }

            // 2. Diccionario de ingredientes (Importante: que no pise la ruta de la nevera)
            if (url.includes('/api/ingredientes') && !url.includes('nevera')) {
                return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
            }

            // 3. API Nevera (ESTADO DINÁMICO)
            if (url.includes('/api/ingredientes/nevera')) {
                // Si el frontend añade un ingrediente, lo guardamos en nuestro estado mockeado
                if (options.method === 'POST' || options.method === 'PUT') {
                    if (options.body) {
                        try {
                            const bodyParseado = JSON.parse(options.body);
                            // Soportar si el frontend envía toda la nevera o solo un item
                            if (bodyParseado.nevera) {
                                neveraMockState = bodyParseado.nevera;
                            } else {
                                neveraMockState.push(bodyParseado);
                            }
                        } catch (e) {}
                    }
                    return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
                }
                // Las peticiones GET ahora devolverán lo que se haya añadido previamente
                return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
            }

            // 4. API Recetas
            if (url.includes('/api/recetas')) {
                if (forzarErrorRecetas) return Promise.reject(new Error('Network error'));
                if (forzarRecetasVacias) return { ok: true, status: 200, json: async () => [] };
                return { ok: true, status: 200, json: async () => RECETAS_MOCK };
            }

            return { ok: false, status: 404 };
        });
    });

    test('Al buscar recetas con ingredientes en la nevera, VistaRecetas muestra los resultados', async () => {
        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Recetas sugeridas')).toBeInTheDocument();

        expect(await screen.findByText('Arroz con tomate')).toBeInTheDocument();
        expect(screen.getByText('Sopa de tomate')).toBeInTheDocument();
        expect(screen.getByText('Risotto')).toBeInTheDocument();
    });

    test('Las recetas muestran su badge de coincidencia correctamente', async () => {
        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('Match: 2/2')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/3')).toBeInTheDocument();
        expect(screen.getByText('Match: 1/5')).toBeInTheDocument();
    });

    test('El fetch de recetas recibe los ingredientes de la nevera correctamente formateados', async () => {
        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');

        const llamadaRecetas = global.fetch.mock.calls.find(call => {
            const url = typeof call[0] === 'string' ? call[0] : call[0].url;
            return url.includes('/api/recetas');
        });
        
        const urlLlamada = typeof llamadaRecetas[0] === 'string' ? llamadaRecetas[0] : llamadaRecetas[0].url;
        expect(urlLlamada.toLowerCase()).toContain('tomate');
    });

    test('Si el servidor de recetas falla, VistaRecetas muestra el mensaje de error', async () => {
        forzarErrorRecetas = true;

        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        // Nota: Asegúrate de que este texto coincida exactamente con lo que tienes en el componente frontend
        expect(await screen.findByText('Hubo un problema al buscar las recetas.')).toBeInTheDocument();
    });

    test('Si el servidor devuelve recetas vacías, VistaRecetas muestra el mensaje correspondiente', async () => {
        forzarRecetasVacias = true;

        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        expect(await screen.findByText('No encontramos recetas con esos ingredientes 😔')).toBeInTheDocument();
    });

    test('Desde VistaRecetas, el botón Volver a la Nevera regresa a la vista principal', async () => {
        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        fireEvent.click(screen.getByText('Buscar Recetas'));

        await screen.findByText('Recetas sugeridas');
        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByText('Mi Nevera Virtual')).toBeInTheDocument();
        expect(screen.getByText('Tomate')).toBeInTheDocument();
    });

    test('Los ingredientes de la nevera se mantienen al volver desde VistaRecetas', async () => {
        renderApp();
        await screen.findByText('Mi Nevera Virtual');
        
        await añadirIngrediente('Tomate', '2');
        await añadirIngrediente('Arroz', '200');

        fireEvent.click(screen.getByText('Buscar Recetas'));
        await screen.findByText('Recetas sugeridas');

        fireEvent.click(screen.getByText(/Volver a la Nevera/i));

        expect(await screen.findByText('Tomate')).toBeInTheDocument();
        expect(screen.getByText('Arroz')).toBeInTheDocument();
    });

});