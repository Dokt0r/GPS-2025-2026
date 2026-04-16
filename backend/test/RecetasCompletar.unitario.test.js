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

        test('debería eliminar un ingrediente de una receta completada', async () => {
            Receta.findOne.mockResolvedValue({
                title: 'Tortilla',
                isCompleted: true,
                ingredients: [
                    { nombre: 'Huevo', cantidad: 2, unidad: 'ud' },
                    { nombre: 'Cebolla', cantidad: 1, unidad: 'ud' }
                ]
            });

            Receta.findOneAndUpdate.mockResolvedValue({
                title: 'Tortilla',
                isCompleted: true,
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
            });

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'Tortilla',
                    nombreIngrediente: 'Cebolla'
                });

            expect(res.status).toBe(200);
            expect(Receta.findOne).toHaveBeenCalledWith({ title: /^Tortilla$/i });
            expect(Receta.findOneAndUpdate).toHaveBeenCalledWith(
                { title: /^Tortilla$/i },
                { $pull: { ingredients: { nombre: 'Cebolla' } } },
                { returnDocument: 'after' }
            );
        });

        test('debería devolver 404 si la receta no existe al eliminar ingrediente', async () => {
            Receta.findOne.mockResolvedValue(null);

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'NoExiste',
                    nombreIngrediente: 'Sal'
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Receta no encontrada');
            expect(Receta.findOneAndUpdate).not.toHaveBeenCalled();
        });

        test('debería devolver 400 si la receta no está completada', async () => {
            Receta.findOne.mockResolvedValue({
                title: 'Tortilla',
                isCompleted: false,
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
            });

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'Tortilla',
                    nombreIngrediente: 'Sal'
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Solo se pueden eliminar ingredientes de recetas completadas');
            expect(Receta.findOneAndUpdate).not.toHaveBeenCalled();
        });

        test('debería devolver 500 si ocurre un error al eliminar ingrediente', async () => {
            Receta.findOne.mockResolvedValue({
                title: 'Tortilla',
                isCompleted: true,
                ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
            });
            Receta.findOneAndUpdate.mockRejectedValue(new Error('Fallo interno'));

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: 'Tortilla',
                    nombreIngrediente: 'Sal'
                });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error al eliminar ingrediente');
        });
    });

    // ==========================================
    // TDD LC-170: Lógica de restar ingredientes
    // ==========================================
    describe('LC-170: Lógica de restar ingredientes al completar receta', () => {

        
        // IMPORTANTE: BORRAR esta función mock cuando este hecha  la función real de la tarea.
        const restarIngredientes = (nevera, ingredientesUsados) => {
            throw new Error("Falta implementar por RB en la tarea LC-166"); 
        };

        test('Resta correctamente la cantidad si el usuario tiene de sobra', () => {
            const neveraInicial = [{ nombre: 'Huevo', cantidad: 6, unidad: 'ud' }];
            const ingredientesUsados = [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }];

            const neveraFinal = restarIngredientes(neveraInicial, ingredientesUsados);

            // Esperamos que siga teniendo huevos, pero solo 4
            expect(neveraFinal).toHaveLength(1);
            expect(neveraFinal[0].nombre).toBe('Huevo');
            expect(neveraFinal[0].cantidad).toBe(4);
        });

        test('El ingrediente se queda a 0 (o se elimina) si gasta la cantidad exacta', () => {
            const neveraInicial = [{ nombre: 'Leche', cantidad: 1, unidad: 'L' }];
            const ingredientesUsados = [{ nombre: 'Leche', cantidad: 1, unidad: 'L' }];

            const neveraFinal = restarIngredientes(neveraInicial, ingredientesUsados);

            // Esperamos o bien que el array esté vacío, o que la leche esté a cantidad 0
            const leche = neveraFinal.find(i => i.nombre === 'Leche');
            if (leche) {
                expect(leche.cantidad).toBe(0);
            } else {
                expect(neveraFinal).toHaveLength(0);
            }
        });

        test('LC-166 CLAVE: Ignora los ingredientes que la receta pide pero el usuario NO tiene', () => {
            const neveraInicial = [{ nombre: 'Tomate', cantidad: 3, unidad: 'ud' }];
            const ingredientesUsados = [
                { nombre: 'Tomate', cantidad: 1, unidad: 'ud' },
                { nombre: 'Cebolla', cantidad: 1, unidad: 'ud' } // El usuario NO tiene cebolla
            ];

            // NO debe lanzar error ("incluye eliminar el mensaje"), solo restar lo que pueda
            expect(() => restarIngredientes(neveraInicial, ingredientesUsados)).not.toThrow();

            const neveraFinal = restarIngredientes(neveraInicial, ingredientesUsados);

            // La nevera debe tener 2 tomates y NINGÚN error por la cebolla
            expect(neveraFinal).toHaveLength(1);
            expect(neveraFinal[0].nombre).toBe('Tomate');
            expect(neveraFinal[0].cantidad).toBe(2);
        });

        test('LC-166 CLAVE: Elimina el mensaje (no devuelve error) si falta cantidad', () => {
            const neveraInicial = [{ nombre: 'Arroz', cantidad: 100, unidad: 'g' }];
            const ingredientesUsados = [{ nombre: 'Arroz', cantidad: 500, unidad: 'g' }];

            // Según el enunciado, se ignora lo que no se tiene y se elimina el mensaje de error.
            // Si pide 500g y solo tenemos 100g, no debe explotar.
            expect(() => restarIngredientes(neveraInicial, ingredientesUsados)).not.toThrow();
        });
    });

});