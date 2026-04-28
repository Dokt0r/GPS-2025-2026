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

// AÑADIDO: Mock para el modelo InventarioItem que ha usado tu compañero
jest.mock('../src/models/InventarioItem', () => ({
    findOne: jest.fn()
}));

const app = require('../src/app');
const Receta = require('../src/models/recetas');
const InventarioItem = require('../src/models/InventarioItem');

describe('API de Recetas - Tests Unitarios de completar y eliminar ingredientes', () => {

    beforeEach(() => {
        vi.spyOn(Receta, 'buscarPorIngredientesYCantidades').mockResolvedValue([]);
        vi.spyOn(Receta, 'findOne').mockResolvedValue(null);
        vi.spyOn(Receta, 'findOneAndUpdate').mockResolvedValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
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