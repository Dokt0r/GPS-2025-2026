const request = require('supertest');

// Mockeamos mongoose antes de importar la app
jest.mock('mongoose', () => ({
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    Schema: jest.fn().mockImplementation(() => ({})),
    model: jest.fn()
}));

// Mockeamos el modelo Ingrediente
jest.mock('../src/models/ingredientes', () => ({
    find: jest.fn()
}));

const app = require('../src/app');
const Ingrediente = require('../src/models/ingredientes');

describe('GET /api/ingredientes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Devuelve todos los ingredientes sin filtro', async () => {
        // Arrange
        const mockIngredientes = [
            { nombre: 'Aceite' },
            { nombre: 'Cebolla' },
            { nombre: 'Tomate' }
        ];
        Ingrediente.find.mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockIngredientes)
        });

        // Act
        const res = await request(app).get('/api/ingredientes');

        // Assert
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(3);
    });

    test('Filtra ingredientes por nombre', async () => {
        // Arrange
        const mockFiltrados = [
            { nombre: 'Aceite' },
            { nombre: 'Acelgas' }
        ];
        Ingrediente.find.mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockFiltrados)
        });

        // Act
        const res = await request(app).get('/api/ingredientes?nombre=ace');

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        res.body.forEach(ing => {
            expect(ing.nombre.toLowerCase()).toContain('ace');
        });
    });

    test('Devuelve array vacío si no hay coincidencias', async () => {
        // Arrange
        Ingrediente.find.mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
        });

        // Act
        const res = await request(app).get('/api/ingredientes?nombre=zzzzz');

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });

    test('Cada ingrediente tiene campo nombre', async () => {
        // Arrange
        const mockIngredientes = [
            { nombre: 'Leche' },
            { nombre: 'Huevo' }
        ];
        Ingrediente.find.mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockIngredientes)
        });

        // Act
        const res = await request(app).get('/api/ingredientes?nombre=a');

        // Assert
        expect(res.status).toBe(200);
        res.body.forEach(ing => {
            expect(ing).toHaveProperty('nombre');
        });
    });

});