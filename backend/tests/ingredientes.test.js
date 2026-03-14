const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
    await mongoose.disconnect();
});

describe('GET /api/ingredientes', () => {

    test('Devuelve todos los ingredientes sin filtro', async () => {
        const res = await request(app).get('/api/ingredientes');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
    });

    test('Filtra ingredientes por nombre', async () => {
        const res = await request(app).get('/api/ingredientes?nombre=ace');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        res.body.forEach(ing => {
            expect(ing.nombre.toLowerCase()).toContain('ace');
        });
    });

    test('Devuelve array vacío si no hay coincidencias', async () => {
        const res = await request(app).get('/api/ingredientes?nombre=zzzzzzzzz');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
    });

    test('Cada ingrediente tiene campo nombre', async () => {
        const res = await request(app).get('/api/ingredientes?nombre=a');
        expect(res.status).toBe(200);
        res.body.forEach(ing => {
            expect(ing).toHaveProperty('nombre');
        });
    });

});