import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import BotonAccion from '../src/components/BotonAccion';

describe('Componente BotonAccion', () => {

    test('Renderiza el texto pasado por prop', () => {
        render(<BotonAccion texto="Buscar Recetas" alHacerClic={vi.fn()} />);
        expect(screen.getByText('Buscar Recetas')).toBeInTheDocument();
    });

    test('Muestra texto genérico si no se pasa prop texto', () => {
        render(<BotonAccion alHacerClic={vi.fn()} />);
        expect(screen.getByText('Botón Genérico')).toBeInTheDocument();
    });

    test('Llama a alHacerClic al hacer clic', () => {
        const mockClic = vi.fn();
        render(<BotonAccion texto="Buscar" alHacerClic={mockClic} />);

        fireEvent.click(screen.getByText('Buscar'));

        expect(mockClic).toHaveBeenCalledTimes(1);
    });

    test('No falla si no se pasa alHacerClic', () => {
        render(<BotonAccion texto="Buscar" />);

        // No debe lanzar error al hacer clic aunque no haya handler
        expect(() => fireEvent.click(screen.getByText('Buscar'))).not.toThrow();
    });
});