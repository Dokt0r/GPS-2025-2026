const request = require('supertest');

// --- MOCKS ---
jest.mock('mongoose', () => {
    class MockSchema {
        constructor() { this.statics = {}; this.methods = {}; }
        index() { }
        pre() { }
        post() { }
    }

    return {
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true),
        Schema: MockSchema,
        model: jest.fn()
    };
});

jest.mock('../src/models/recetas', () => ({
    buscarPorIngredientesYCantidades: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn()
}));

const app = require('../src/app');
const Receta = require('../src/models/recetas');

describe('API de Recetas - Tests Unitarios de completar y eliminar ingredientes', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // ENDPOINT: PUT /api/recetas/completar
    // ==========================================
    describe('PUT /api/recetas/completar', () => {

        test('debería actualizar steps, ingredients y marcar la receta como completada', async () => {
            const saveMock = jest.fn().mockResolvedValue({
                title: 'Tortilla',
                steps: ['Batir', 'Cocinar'],
                ingredients: [{ nombre: 'Huevo', cantidad: 3, unidad: 'ud' }],
                isCompleted: true
            });

            const recetaMock = {
                title: 'Tortilla',
                steps: ['Paso viejo'],
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }],
                isCompleted: false,
                save: saveMock
            };

            Receta.findOne.mockResolvedValue(recetaMock);

            const nuevosPasos = ['Batir', 'Cocinar'];
            const nuevosIngredientes = [{ nombre: 'Huevo', cantidad: 3, unidad: 'ud' }];

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: 'Tortilla',
                    steps: nuevosPasos,
                    ingredients: nuevosIngredientes
                });

            expect(res.status).toBe(200);
            expect(recetaMock.steps).toEqual(nuevosPasos);
            expect(recetaMock.ingredients).toEqual(nuevosIngredientes);
            expect(recetaMock.isCompleted).toBe(true);
            expect(saveMock).toHaveBeenCalledTimes(1);
        });

        test('debería devolver 404 si la receta no existe', async () => {
            Receta.findOne.mockResolvedValue(null);

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: 'Inexistente',
                    steps: ['Paso 1'],
                    ingredients: []
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Receta no encontrada');
        });

        test('debería devolver 400 si la lógica de negocio falla al guardar', async () => {
            const saveMock = jest
                .fn()
                .mockRejectedValue(new Error('Lógica de Negocio: No se pueden guardar ingredientes con cantidad 0 o negativa.'));

            Receta.findOne.mockResolvedValue({
                title: 'Tortilla',
                steps: ['Paso 1'],
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }],
                isCompleted: false,
                save: saveMock
            });

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: 'Tortilla',
                    steps: ['Paso 1'],
                    ingredients: [{ nombre: 'Huevo', cantidad: 0, unidad: 'ud' }]
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Lógica de Negocio');
        });
    });

    // ==========================================
    // ENDPOINT: DELETE /api/recetas/ingrediente
    // ==========================================
    describe('DELETE /api/recetas/ingrediente', () => {

        test('debería eliminar un ingrediente de una receta', async () => {
            // Mocking findOneAndUpdate directly since code doesn't use findOne
            Receta.findOneAndUpdate.mockResolvedValue({
                title: 'Tortilla',
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
            });

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'Tortilla',
                    nombreIngrediente: 'Cebolla'
                });

            expect(res.status).toBe(200);
            // Usamos expect.any(RegExp) porque crear la misma regex exacta es difícil de comparar en Jest
            expect(Receta.findOneAndUpdate).toHaveBeenCalledWith(
                { title: expect.any(RegExp) },
                { $pull: { ingredients: { nombre: 'Cebolla' } } },
                { returnDocument: 'after' }
            );
        });
        test('debería devolver 404 si la receta no existe', async () => {
            Receta.findOneAndUpdate.mockResolvedValue(null); // Si no encuentra, devuelve null

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'NoExiste',
                    nombreIngrediente: 'Sal'
                });

            expect(res.status).toBe(404);
            expect(res.body.error).toBe('Receta no encontrada');
        });


        test('debería devolver 500 si ocurre un error', async () => {
            Receta.findOneAndUpdate.mockRejectedValue(new Error('Fallo interno'));

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'Tortilla',
                    nombreIngrediente: 'Sal'
                });

            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Error al eliminar ingrediente');
        });
    });
});
