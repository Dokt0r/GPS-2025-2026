import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import Buscador from '../src/components/Buscador';

const ingredientesMock = [
    { nombre: 'Aceite', unidad: 'ml' },
    { nombre: 'Acelgas', unidad: 'g' },
    { nombre: 'Cebolla', unidad: 'ud' },
    { nombre: 'Tomate', unidad: 'ud' }
];

describe('Buscador', () => {

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => [
                { nombre: 'Aceite', unidad: 'ml' },
                { nombre: 'Acelgas', unidad: 'g' }
            ]
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('Se renderiza correctamente', () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} />);
        expect(screen.getByPlaceholderText(/Ingrediente/i)).toBeInTheDocument();
    });

    test('Muestra sugerencias al escribir', async () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} />);
        const input = screen.getByPlaceholderText(/Ingrediente/i);
        fireEvent.change(input, { target: { value: 'ace' } });
        
        expect(await screen.findByText('Aceite')).toBeInTheDocument();
        expect(screen.getByText('Acelgas')).toBeInTheDocument();
    });

    test('Al seleccionar sugerencia se rellena el input', async () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} />);
        const input = screen.getByPlaceholderText(/Ingrediente/i);
        fireEvent.change(input, { target: { value: 'ace' } });
        
        const sugerencia = await screen.findByText('Aceite');
        fireEvent.click(sugerencia);
        
        expect(input.value).toBe('Aceite');
    });

    // ─────────────────────────────────────────────────────────────────────────
    // GESTIÓN LOCAL DE MENSAJES (SIN EMOJIS)
    // ─────────────────────────────────────────────────────────────────────────

    test('Muestra mensaje de error local si se intenta confirmar sin seleccionar ingrediente', async () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} />);
        fireEvent.click(screen.getByText(/Confirmar Selección/i));
        
        // CORRECCIÓN: Usar findByText para esperar el renderizado del error
        const mensaje = await screen.findByText(/Por favor, selecciona un ingrediente válido/i);
        expect(mensaje).toBeInTheDocument();
        expect(mensaje).toHaveClass('mensaje-local', 'error');
    });

    test('Muestra mensaje de error local si la cantidad es 0 o menor', async () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} />);
        
        const input = screen.getByPlaceholderText(/Ingrediente/i);
        fireEvent.change(input, { target: { value: 'ace' } });
        fireEvent.click(await screen.findByText('Aceite')); // Asegurar que damos click tras aparecer

        const inputCantidad = screen.getByPlaceholderText('Cant.');
        fireEvent.change(inputCantidad, { target: { value: '0' } });

        fireEvent.click(screen.getByText(/Confirmar Selección/i));
        
        // CORRECCIÓN: Usar findByText para esperar el renderizado del error
        const mensaje = await screen.findByText(/La cantidad debe ser mayor que 0/i);
        expect(mensaje).toBeInTheDocument();
        expect(mensaje).toHaveClass('mensaje-local', 'error');
    });

    test('Muestra mensaje de éxito local (sin emojis) tras añadir correctamente', async () => {
        const mockAñadir = vi.fn();
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={mockAñadir} />);
        
        const input = screen.getByPlaceholderText(/Ingrediente/i);
        fireEvent.change(input, { target: { value: 'tomate' } });
        
        // Esperamos a que la sugerencia exista en el DOM del test antes de hacer click
        // *Nota: Si tomate no estaba en el mock de tu fetch, el componente usa ingredientesBase. 
        // Si usa el fetch, asegúrate de que el mock del beforeEach devuelva 'Tomate' también si lo buscas.
        fireEvent.click(await screen.findByText('Tomate'));

        const inputCantidad = screen.getByPlaceholderText('Cant.');
        fireEvent.change(inputCantidad, { target: { value: '3' } });

        fireEvent.click(screen.getByText(/Confirmar Selección/i));

        // CORRECCIÓN: Usar una regex más permisiva para evitar fallos por espacios o saltos de línea
        const mensaje = await screen.findByText(/Añadido:\s*Tomate/i);
        expect(mensaje).toBeInTheDocument();
        expect(mensaje).toHaveClass('mensaje-local', 'success');
        
        expect(mockAñadir).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Tomate', unidad: 'ud' }), 3);
    });
});