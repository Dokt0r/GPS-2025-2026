import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/AuthContext';

// ==========================================
// DATOS MOCK (ESTÁTICOS)
// ==========================================
const INGREDIENTES_MOCK = [
    { _id: '1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: 100 },
    { _id: '2', nombre: 'Arroz', unidad: 'g', equivalencia_g_ml: null },
];

const RECETAS_MOCK = [
    { 
        _id: 'r1', 
        title: 'Arroz con tomate', 
        image_url: 'img1.jpg', 
        coincidenciaTexto: '2/2' 
    },
];

const DETALLE_RECETA_MOCK = {
    _id: 'r1',
    title: 'Arroz con tomate',
    image_url: 'img1.jpg',
    ingredients: [
        { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
        { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
    ],
    steps: ['Lavar el arroz', 'Cocinar con el tomate'],
};

// ==========================================
// HELPERS
// ==========================================
const renderApp = () =>
    render(
        <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        </AuthProvider>
    );

const añadirIngrediente = async (nombre, cantidad = '100') => {
    // Abrir modal
    const fabBtn = await screen.findByText('+');
    fireEvent.click(fabBtn);

    // Escribir nombre y seleccionar sugerencia
    const input = await screen.findByPlaceholderText(/Ingrediente/i);
    fireEvent.change(input, { target: { value: nombre } });
    const sugerencia = await screen.findByText(nombre, { selector: '.sugerencia-item' });
    fireEvent.click(sugerencia);

    // Poner cantidad y confirmar
    const inputCantidad = screen.getByPlaceholderText('Cant.');
    fireEvent.change(inputCantidad, { target: { value: cantidad } });
    fireEvent.click(screen.getByText(/Confirmar Selección/i));

    // Cerrar modal
    await waitFor(() => {
        const btnCerrar = document.querySelector('.btn-cerrar-modal');
        if (btnCerrar) fireEvent.click(btnCerrar);
    });

    // Esperar a que el modal desaparezca
    await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Ingrediente/i)).not.toBeInTheDocument();
    });
};

// ==========================================
// BLOQUE DE TESTS
// ==========================================
describe('Integración — Flujo Completo: Nevera -> VistaRecetas -> VistaDetalles', () => {
    let neveraMockState = [];

    beforeEach(() => {
        neveraMockState = []; // Reiniciar "base de datos" falsa

        global.fetch = vi.fn(async (input, options = {}) => {
            const url = typeof input === 'string' ? input : input.url;

            // Mock de Sesión
            if (url.includes('/api/auth/refresh')) {
                return { 
                    ok: true, 
                    status: 200, 
                    json: async () => ({ accessToken: 'token-xyz', usuario: { id: 'u1', nombre: 'Test' } }) 
                };
            }

            // Mock de Diccionario (Sugerencias)
            if (url.includes('/api/ingredientes') && !url.includes('nevera')) {
                return { ok: true, status: 200, json: async () => INGREDIENTES_MOCK };
            }

            // Mock de Nevera (DINÁMICO)
            if (url.includes('/api/ingredientes/nevera')) {
                if (options.method === 'POST' || options.method === 'PUT') {
                    const body = JSON.parse(options.body);
                    // Si el body tiene propiedad .nevera (array completo) o es un item suelto
                    if (body.nevera) {
                        neveraMockState = body.nevera;
                    } else {
                        neveraMockState = [...neveraMockState, body];
                    }
                    return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
                }
                return { ok: true, status: 200, json: async () => ({ nevera: neveraMockState }) };
            }

            // Mock de Recetas (Lista y Detalle)
            if (url.match(/\/api\/recetas\/r1$/) || url.includes('Arroz%20con%20tomate')) {
                return { ok: true, status: 200, json: async () => DETALLE_RECETA_MOCK };
            }
            if (url.includes('/api/recetas')) {
                return { ok: true, status: 200, json: async () => RECETAS_MOCK };
            }

            return { ok: false, status: 404 };
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('Flujo completo hasta ver los pasos de la receta', async () => {
        renderApp();

        // 1. Añadimos el ingrediente
        await añadirIngrediente('Tomate', '2');
        
        // 2. IMPORTANTE: Esperar a que el ingrediente se pinte en la nevera
        // Esto confirma que el frontend ha recibido la respuesta del POST y ha actualizado el estado
        expect(await screen.findByText(/Tomate/i)).toBeInTheDocument();

        // 3. Pulsamos buscar (ya no debería decir "nevera vacía")
        const btnBuscar = screen.getByText(/Buscar Recetas/i);
        fireEvent.click(btnBuscar);

        // 4. Seleccionar la receta de la lista
        const recetaCard = await screen.findByText(/Arroz con tomate/i);
        fireEvent.click(recetaCard);

        // 5. Verificar que estamos en la vista de detalle
        expect(await screen.findByText(/Lavar el arroz/i)).toBeInTheDocument();
        expect(screen.getByText(/200 g/)).toBeInTheDocument();
    });

    test('Navegación: Detalle -> Lista -> Nevera', async () => {
        renderApp();
        await añadirIngrediente('Tomate', '2');
        
        // Ir a lista
        fireEvent.click(await screen.findByText(/Buscar Recetas/i));
        
        // Ir a detalle
        fireEvent.click(await screen.findByText(/Arroz con tomate/i));

        // Volver a lista
        const btnVolver = await screen.findByText(/Volver/i);
        fireEvent.click(btnVolver);
        expect(await screen.findByText(/Recetas sugeridas/i)).toBeInTheDocument();

        // Volver a nevera
        fireEvent.click(screen.getByText(/Volver a la Nevera/i));
        expect(await screen.findByText(/Mi Nevera Virtual/i)).toBeInTheDocument();
        expect(screen.getByText(/Tomate/i)).toBeInTheDocument();
    });
});