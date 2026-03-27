const request = require('supertest');

// MOCK DE MONGOOSE (Copiado de vuestro estilo para ser coherentes)
jest.mock('mongoose', () => {
    class MockSchema {
        constructor() {
            this.statics = {};
            this.methods = {};
        }
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

// MOCK DEL MODELO
jest.mock('../src/models/recetas', () => ({
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn()
}));

const app = require('../src/app');
const Receta = require('../src/models/recetas');

describe('API de Recetas - Integración Completar/Eliminar (Mocks DB)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PUT /api/recetas/completar', () => {
        test('Debe devolver 200 si la receta se actualiza correctamente', async () => {
            // Simulamos que la base de datos encuentra y actualiza la receta
            Receta.findOneAndUpdate.mockResolvedValue({ title: 'Tortilla', steps: ['Paso 1'], isCompleted: true });

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({ 
                    titulo: 'Tortilla', 
                    steps: ['Batir huevos'], 
                    ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }] 
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('title', 'Tortilla');
            expect(Receta.findOneAndUpdate).toHaveBeenCalled();
        });

        test('Debe devolver 400 si faltan datos obligatorios (Lógica de Negocio)', async () => {
            const res = await request(app)
                .put('/api/recetas/completar')
                .send({ titulo: 'Tortilla' }); // Enviamos solo el título, faltan pasos/ingredientes

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('DELETE /api/recetas/ingrediente', () => {
        test('Debe devolver 200 tras eliminar un ingrediente', async () => {
            Receta.findOneAndUpdate.mockResolvedValue({ title: 'Arroz', ingredients: [] });

            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({ titulo: 'Arroz', nombreIngrediente: 'Sal' });

            expect(res.status).toBe(200);
            expect(Receta.findOneAndUpdate).toHaveBeenCalled();
        });
    });
});