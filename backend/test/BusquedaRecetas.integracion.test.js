const request = require('supertest');

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

/*const request = require('supertest');
const mongoose = require('mongoose');

jest.setTimeout(30000);

// La app ya conecta a MongoDB en su propio código, no conectamos aquí
const app = require('../src/app');

beforeAll(async () => {
    // Esperamos a que mongoose esté conectado antes de empezar
    if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', reject);
        });
    }
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('GET /api/recetas', () => {

    test('Devuelve 400 si no se pasan ingredientes', async () => {
        const res = await request(app).get('/api/recetas');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
    });

    test('Devuelve recetas con ingredientes válidos', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|60');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    test('Devuelve array vacío con ingrediente inexistente', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=Kriptonita|1|g|');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('"pimiento" encuentra recetas con "pimiento verde"', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=pimiento|1|ud|');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('Cantidad insuficiente devuelve menos recetas que cantidad suficiente', async () => {
        const conPoca = await request(app).get('/api/recetas?ingredientes=Harina|1|g|');
        const conSuficiente = await request(app).get('/api/recetas?ingredientes=Harina|1000|g|');
        expect(conPoca.body.length).toBeLessThanOrEqual(conSuficiente.body.length);
    });

    test('kg y g equivalentes devuelven los mismos resultados', async () => {
        const conKg = await request(app).get('/api/recetas?ingredientes=Harina|1|kg|');
        const conG = await request(app).get('/api/recetas?ingredientes=Harina|1000|g|');
        expect(conKg.body.map(r => r.title)).toEqual(conG.body.map(r => r.title));
    });

    test('Equivalencia ud a g funciona correctamente', async () => {
        // 1 tomate con equivalencia 150g debe dar los mismos resultados que 150g de tomate
        const conUd = await request(app).get('/api/recetas?ingredientes=Tomate|1|ud|150');
        const conG = await request(app).get('/api/recetas?ingredientes=Tomate|150|g|');
        expect(conUd.body.map(r => r.title)).toEqual(conG.body.map(r => r.title));
    });

    test('Resultados ordenados por coincidencias descendente', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|,Sal|5|g|,Tomate|3|ud|');
        expect(res.status).toBe(200);
        if (res.body.length >= 2) {
            const coincidencias = res.body.map(r => parseInt(r.coincidenciaTexto.split('/')[0]));
            for (let i = 0; i < coincidencias.length - 1; i++) {
                expect(coincidencias[i]).toBeGreaterThanOrEqual(coincidencias[i + 1]);
            }
        }
    });
});*/