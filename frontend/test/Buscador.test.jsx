import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Buscador from '../src/components/Buscador';

const ingredientesMock = [
    { nombre: 'Aceite' },
    { nombre: 'Acelgas' },
    { nombre: 'Cebolla' },
    { nombre: 'Tomate' }
];

describe('Buscador', () => {

    test('Se renderiza correctamente', () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} onError={vi.fn()} />);
        expect(screen.getByPlaceholderText('Ingrediente (ej: Arroz)')).toBeInTheDocument();
    });

    test('Muestra sugerencias al escribir', () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} onError={vi.fn()} />);
        const input = screen.getByPlaceholderText('Ingrediente (ej: Arroz)');
        fireEvent.change(input, { target: { value: 'ace' } });
        expect(screen.getByText('Aceite')).toBeInTheDocument();
        expect(screen.getByText('Acelgas')).toBeInTheDocument();
    });

    test('No muestra sugerencias con input vacío', () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} onError={vi.fn()} />);
        const input = screen.getByPlaceholderText('Ingrediente (ej: Arroz)');
        fireEvent.change(input, { target: { value: '' } });
        expect(screen.queryByText('Aceite')).not.toBeInTheDocument();
    });

    test('Al seleccionar sugerencia se rellena el input', () => {
        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={vi.fn()} onError={vi.fn()} />);
        const input = screen.getByPlaceholderText('Ingrediente (ej: Arroz)');
        fireEvent.change(input, { target: { value: 'ace' } });
        fireEvent.click(screen.getByText('Aceite'));
        expect(input.value).toBe('Aceite');
    });
    test('No permite añadir ingredientes con cantidad negativa', () => {
        const mockOnAñadir = vi.fn();
        const mockOnError = vi.fn();

        render(<Buscador ingredientesBase={ingredientesMock} onAñadir={mockOnAñadir} onError={mockOnError} />);

        const inputNombre = screen.getByPlaceholderText('Ingrediente (ej: Arroz)');
        // Asumiendo que tienes un input de cantidad. Si no lo tienes, este test valida 
        // que tu lógica interna no acepte valores negativos de ninguna forma.
        const inputCantidad = screen.queryByPlaceholderText(/cantidad/i) || screen.getByRole('spinbutton');

        // 1. Simulamos que el usuario elige un ingrediente
        fireEvent.change(inputNombre, { target: { value: 'Aceite' } });
        // 2. Simulamos que intenta poner una cantidad negativa
        fireEvent.change(inputCantidad, { target: { value: '-5' } });

        // 3. Intentamos confirmar la selección
        const botonConfirmar = screen.getByRole('button', { name: /Confirmar/i });
        fireEvent.click(botonConfirmar);
        // Assert: 
        // La función onAñadir NO debe haber sido llamada
        expect(mockOnAñadir).not.toHaveBeenCalled();
        // La función onError SÍ debe haber sido llamada para mostrar el aviso al usuario
        expect(mockOnError).toHaveBeenCalled();
    });

});