import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import ListaNevera from '../src/components/ListaNevera'; // Ajusta la ruta si es necesario

describe('Componente ListaNevera', () => {
  
  test('Muestra el mensaje de estado vacío cuando no hay ingredientes', () => {
    // Renderizamos el componente con un array vacío
    render(<ListaNevera ingredientes={[]} onEliminar={vi.fn()} />);

    // Comprobamos que el texto de nevera vacía está en el documento
    expect(screen.getByText('Tu nevera está vacía. Añade algo arriba.')).toBeInTheDocument();
    
    // Comprobamos que la lista ul no se está renderizando (buscando por su id)
    const lista = document.querySelector('#mi-nevera');
    expect(lista).not.toBeInTheDocument();
  });

  test('Renderiza correctamente una lista de ingredientes', () => {
    const mockIngredientes = [
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud' },
      { nombre: 'Leche', cantidad: 1, unidad: 'L' }
    ];

    render(<ListaNevera ingredientes={mockIngredientes} onEliminar={vi.fn()} />);

    // Comprobamos que los nombres se renderizan
    expect(screen.getByText('Tomate')).toBeInTheDocument();
    expect(screen.getByText('Leche')).toBeInTheDocument();

    // Comprobamos que las cantidades y unidades se renderizan correctamente
    expect(screen.getByText('3 ud')).toBeInTheDocument();
    expect(screen.getByText('1 L')).toBeInTheDocument();
    
    // El mensaje de vacío no debería estar
    expect(screen.queryByText('Tu nevera está vacía. Añade algo arriba.')).not.toBeInTheDocument();
  });

  test('Llama a la función onEliminar con el nombre correcto al hacer clic en ✕', () => {
    // Creamos una función espía (mock) de Vitest
    const mockOnEliminar = vi.fn();
    const mockIngredientes = [
      { nombre: 'Tomate', cantidad: 3, unidad: 'ud' }
    ];

    render(<ListaNevera ingredientes={mockIngredientes} onEliminar={mockOnEliminar} />);

    // Buscamos el botón de borrar por su contenido (la ✕)
    const botonEliminar = screen.getByText('✕');
    
    // Simulamos un click del usuario
    fireEvent.click(botonEliminar);

    // Comprobamos que la función espía ha sido llamada 1 vez
    expect(mockOnEliminar).toHaveBeenCalledTimes(1);
    
    // Comprobamos que se le ha pasado el nombre del ingrediente correcto como argumento
    expect(mockOnEliminar).toHaveBeenCalledWith('Tomate');
  });

});