const request = require('supertest');

jest.mock('mongoose', () => {
    class MockSchema {
        constructor() {
            this.statics = {};
            this.methods = {};
        }
        index() {} 
        pre() {}
        post() {}
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
    findOne: jest.fn()
}));

const app = require('../src/app');
const Receta = require('../src/models/recetas');

describe('API de Recetas - Integración (Mocks DB)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('GET /api/recetas', () => {

        test('Devuelve error 400 si no se envían ingredientes en la query', async () => {
            const res = await request(app).get('/api/recetas');
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
            expect(Receta.buscarPorIngredientesYCantidades).not.toHaveBeenCalled();
        });

        test('Devuelve las recetas sugeridas estandarizando los ingredientes correctamente', async () => {
            const mockRecetas = [
                { title: 'Tortilla de patatas' },
                { title: 'Patatas bravas' }
            ];
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue(mockRecetas);
            
            const ingredientesQuery = "Patata|1|kg|,Huevo|3|uds|";

            const res = await request(app).get(`/api/recetas?ingredientes=${encodeURIComponent(ingredientesQuery)}`);
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0].title).toBe('Tortilla de patatas');
            
            expect(Receta.buscarPorIngredientesYCantidades).toHaveBeenCalledWith([
                { nombre: "Patata", cantidad: 1000, unidad: "g", equivalencia_g_ml: null },
                { nombre: "Huevo", cantidad: 3, unidad: "ud", equivalencia_g_ml: null }
            ]);
        });

        test('Devuelve array vacío si ningún ingrediente coincide con recetas en BD', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);
            const ingredientesQuery = "IngredienteRaro|1|kg|";
            
            const res = await request(app).get(`/api/recetas?ingredientes=${ingredientesQuery}`);
            
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(0);
        });

        test('Maneja error de base de datos correctamente devolviendo 500', async () => {
            Receta.buscarPorIngredientesYCantidades.mockRejectedValue(new Error('DB error'));
            const ingredientesQuery = "Tomate|2|uds|";
            
            const res = await request(app).get(`/api/recetas?ingredientes=${ingredientesQuery}`);
            
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor');
        });
    });

    describe('GET /api/recetas/detalle', () => {

        test('Devuelve error 400 si falta el parámetro título', async () => {

            const res = await request(app).get('/api/recetas/detalle');
            
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Falta el título');
            expect(Receta.findOne).not.toHaveBeenCalled();
        });

        test('Devuelve error 404 si la receta no se encuentra en la base de datos', async () => {
            Receta.findOne.mockResolvedValue(null);
            
            const res = await request(app).get('/api/recetas/detalle?titulo=RecetaFalsa');
            
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Receta no encontrada');
        });

        test('Maneja error de base de datos en el detalle devolviendo 500', async () => {
            Receta.findOne.mockRejectedValue(new Error('DB error on findOne'));
            
            const res = await request(app).get('/api/recetas/detalle?titulo=Macarrones');
            
            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno');
        });
    });

});