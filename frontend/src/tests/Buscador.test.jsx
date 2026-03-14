import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Buscador from '../components/Buscador';

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

});