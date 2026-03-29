import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import ListaNevera from '../src/components/ListaNevera';

// ─────────────────────────────────────────────────────────────────────────────
// TESTS EXISTENTES (no tocar)
// ─────────────────────────────────────────────────────────────────────────────

describe('Componente ListaNevera', () => {

  test('Muestra el mensaje de estado vacío cuando no hay ingredientes', () => {
    render(<ListaNevera ingredientes={[]} onEliminar={vi.fn()} />);
    expect(screen.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeInTheDocument();
    const lista = document.querySelector('#mi-nevera');
    expect(lista).not.toBeInTheDocument();
  });

  test('Renderiza correctamente una lista de ingredientes', () => {
    const mockIngredientes = [
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud' },
      { nombre: 'Leche', cantidad: 1, unidad: 'L' }
    ];
    render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);
    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();
    expect(screen.getByText('3 ud')).toBeInTheDocument();
    expect(screen.getByText('1 L')).toBeInTheDocument();
    expect(screen.queryByText('Tu nevera está vacía. Añade algo arriba.')).not.toBeInTheDocument();
  });

  test('Llama a la función onEliminar con el nombre correcto al hacer clic en ✕', () => {
    const mockOnEliminar = vi.fn();
    const mockIngredientes = [
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud' }
    ];
    render(<ListaNevera ingredientes={mockIngredientes} onEliminar={mockOnEliminar} />);
    const botonEliminar = screen.getByText('✕');
    fireEvent.click(botonEliminar);
    expect(mockOnEliminar).toHaveBeenCalledTimes(1);
    expect(mockOnEliminar).toHaveBeenCalledWith('Tomate');
  });


  // ─────────────────────────────────────────────────────────────────────────
  // HAPPY PATH — nuevos
  // ─────────────────────────────────────────────────────────────────────────

  describe('Happy path', () => {

    test('Ordena los ingredientes alfabéticamente de A a Z', () => {
      const mockIngredientes = [
        { nombre: 'Tomate',  cantidad: 2, unidad: 'ud' },
        { nombre: 'Arroz',   cantidad: 200, unidad: 'g' },
        { nombre: 'Leche',   cantidad: 1, unidad: 'L' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Arroz');
      expect(items[1]).toHaveTextContent('Leche');
      expect(items[2]).toHaveTextContent('Tomate');
    });

    test('El orden alfabético ignora mayúsculas y minúsculas', () => {
      const mockIngredientes = [
        { nombre: 'zanahoria', cantidad: 3, unidad: 'ud' },
        { nombre: 'Aceite',    cantidad: 500, unidad: 'ml' },
        { nombre: 'Mantequilla', cantidad: 100, unidad: 'g' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Aceite');
      expect(items[1]).toHaveTextContent('Mantequilla');
      expect(items[2]).toHaveTextContent('zanahoria');
    });

    test('Renderiza exactamente un botón ✕ por cada ingrediente', () => {
      const mockIngredientes = [
        { nombre: 'Tomate', cantidad: 1, unidad: 'ud' },
        { nombre: 'Leche',  cantidad: 1, unidad: 'L' },
        { nombre: 'Arroz',  cantidad: 200, unidad: 'g' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      const botones = screen.getAllByText('✕');
      expect(botones).toHaveLength(3);
    });

    test('Renderiza cantidades decimales correctamente', () => {
      const mockIngredientes = [
        { nombre: 'Aceite', cantidad: 0.5, unidad: 'L' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);
      expect(screen.getByText('0.5 L')).toBeInTheDocument();
    });

    test('Cada botón ✕ llama a onEliminar con el nombre de su propio ingrediente', () => {
      const mockOnEliminar = vi.fn();
      const mockIngredientes = [
        { nombre: 'Arroz',  cantidad: 200, unidad: 'g' },
        { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={mockOnEliminar} />);

      const botones = screen.getAllByText('✕');
      // Tras ordenar, el primer item es Arroz
      fireEvent.click(botones[0]);
      expect(mockOnEliminar).toHaveBeenCalledWith('Arroz');

      fireEvent.click(botones[1]);
      expect(mockOnEliminar).toHaveBeenCalledWith('Tomate');

      expect(mockOnEliminar).toHaveBeenCalledTimes(2);
    });

    test('Renderiza correctamente un único ingrediente', () => {
      const mockIngredientes = [
        { nombre: 'Sal', cantidad: 50, unidad: 'g' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      expect(screen.getByText('Sal')).toBeInTheDocument();
      expect(screen.getByText('50 g')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });

    test('Muestra el título "Mi Nevera Virtual" siempre, con o sin ingredientes', () => {
      const { rerender } = render(<ListaNevera ingredientes={[]} onEliminar={vi.fn()} />);
      expect(screen.getByText('Mi Nevera Virtual')).toBeInTheDocument();

      rerender(<ListaNevera ingredientes={[{ nombre: 'Tomate', cantidad: 1, unidad: 'ud' }]} onEliminar={vi.fn()} />);
      expect(screen.getByText('Mi Nevera Virtual')).toBeInTheDocument();
    });

  });


  // ─────────────────────────────────────────────────────────────────────────
  // CORNER CASES
  // ─────────────────────────────────────────────────────────────────────────

  describe('Corner cases', () => {

    test('No modifica el array original al ordenar (inmutabilidad)', () => {
      const mockIngredientes = [
        { nombre: 'Tomate', cantidad: 2, unidad: 'ud' },
        { nombre: 'Arroz',  cantidad: 200, unidad: 'g' },
      ];
      const ordenOriginal = mockIngredientes.map(i => i.nombre);
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      // El array original no debe haber cambiado
      expect(mockIngredientes.map(i => i.nombre)).toEqual(ordenOriginal);
    });

    test('Maneja correctamente ingredientes con nombres que incluyen tildes y eñes', () => {
      const mockIngredientes = [
        { nombre: 'Ñora',   cantidad: 2, unidad: 'ud' },
        { nombre: 'Ajo',    cantidad: 3, unidad: 'ud' },
        { nombre: 'Cebolla', cantidad: 1, unidad: 'ud' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      // En español: Ajo < Cebolla < Ñora
      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Ajo');
      expect(items[1]).toHaveTextContent('Cebolla');
      expect(items[2]).toHaveTextContent('Ñora');
    });

    test('Renderiza correctamente un ingrediente sin unidad (unidad vacía)', () => {
      const mockIngredientes = [
        { nombre: 'Sal', cantidad: 1, unidad: '' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      expect(screen.getByText('Sal')).toBeInTheDocument();
      // No debe lanzar error ni mostrar texto raro como "1 undefined"
      expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
    });

    test('Renderiza correctamente un nombre de ingrediente muy largo', () => {
      const nombreLargo = 'Chocolate fondant para postres con un 70% de cacao de origen';
      const mockIngredientes = [
        { nombre: nombreLargo, cantidad: 200, unidad: 'g' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);
      expect(screen.getByText(nombreLargo)).toBeInTheDocument();
    });

    test('Ingredientes con el mismo nombre aparecen todos (sin deduplicar en vista)', () => {
      const mockIngredientes = [
        { nombre: 'Leche', cantidad: 200, unidad: 'ml' },
        { nombre: 'Leche', cantidad: 500, unidad: 'ml' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(2);
    });

    test('Ingrediente con cantidad 0 se renderiza sin errores', () => {
      const mockIngredientes = [
        { nombre: 'Azúcar', cantidad: 0, unidad: 'g' },
      ];
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);
      expect(screen.getByText('Azúcar')).toBeInTheDocument();
      expect(screen.getByText('0 g')).toBeInTheDocument();
    });

    test('Renderiza una lista grande sin errores (20 ingredientes)', () => {
      const mockIngredientes = Array.from({ length: 20 }, (_, i) => ({
        nombre: `Ingrediente ${String(i).padStart(2, '0')}`,
        cantidad: i + 1,
        unidad: 'g',
      }));
      render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(20);
    });

  });

});
