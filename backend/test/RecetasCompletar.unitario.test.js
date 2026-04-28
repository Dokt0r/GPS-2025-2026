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
    // ENDPOINT: PUT /api/recetas/completar
    // ==========================================
    describe('PUT /api/recetas/completar (LC-170: Restar ingredientes)', () => {

        test('debería actualizar steps, ingredients y marcar la receta como completada', async () => {
            const saveMock = vi.fn().mockResolvedValue({
                title: 'Tortilla',
                steps: [],
                ingredients: [],
                isCompleted: false,
                save: recetaSaveMock
            });

            // Simulamos que el usuario tiene 6 huevos en la nevera
            InventarioItem.findOne.mockResolvedValue({
                nombre: 'Huevo',
                cantidad: 6,
                save: inventarioSaveMock
            });

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: 'Tortilla',
                    steps: ['Batir'],
                    ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
                });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true }); // La nueva respuesta de RB
            
            // Verificamos que se restó la cantidad correctamente (6 - 2 = 4)
            const itemLlamado = InventarioItem.findOne.mock.results[0].value;
            const itemEsperado = await itemLlamado;
            expect(itemEsperado.cantidad).toBe(4);
            expect(inventarioSaveMock).toHaveBeenCalled();
            expect(recetaSaveMock).toHaveBeenCalled();
        });

        test('LC-170 CLAVE: Ignora los ingredientes que la receta pide pero el usuario NO tiene', async () => {
            const recetaSaveMock = jest.fn().mockResolvedValue(true);

            Receta.findOne.mockResolvedValue({
                title: 'Tortilla',
                steps: [],
                ingredients: [],
                isCompleted: false,
                save: recetaSaveMock
            });

            // Simulamos que el Inventario NO tiene el ingrediente (devuelve null)
            InventarioItem.findOne.mockResolvedValue(null);

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: 'Tortilla',
                    steps: ['Picar cebolla'],
                    ingredients: [{ nombre: 'Cebolla', cantidad: 1, unidad: 'ud' }]
                });

            // Como pide "ignorar", el endpoint debe devolver 200 OK sin dar error
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true });
            expect(recetaSaveMock).toHaveBeenCalled(); // La receta se guarda igualmente
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
            const saveMock = vi.fn()
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
                    ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
                });

            expect(res.status).toBe(400);
            // Comprobamos que el body está vacío, tal y como programó RB: res.status(400).send()
            expect(res.body).toEqual({}); 
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