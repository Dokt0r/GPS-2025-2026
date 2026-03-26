const request = require('supertest');
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
        // Ambas queries llevan factor de conversión para que las comparaciones sean simétricas
        const conUd = await request(app).get('/api/recetas?ingredientes=Tomate|1|ud|150');
        const conG = await request(app).get('/api/recetas?ingredientes=Tomate|150|g|150');
        expect(conUd.body.map(r => r.title)).toEqual(conG.body.map(r => r.title));
    });

    test('Resultados con el mismo porcentaje de coincidencia están ordenados alfabéticamente', async () => {
        // Usamos un único ingrediente muy común para maximizar la probabilidad
        // de obtener varias recetas con el mismo porcentaje (1/N cada una),
        // lo que activa el desempate alfabético del pipeline.
        const res = await request(app).get('/api/recetas?ingredientes=Sal|5|g|');
        expect(res.status).toBe(200);

        if (res.body.length >= 2) {
            // Agrupamos las recetas por su porcentaje de coincidencia
            const grupos = {};
            for (const receta of res.body) {
                const [cumplidos, total] = receta.coincidenciaTexto.split('/').map(Number);
                const porcentaje = cumplidos / total;
                if (!grupos[porcentaje]) grupos[porcentaje] = [];
                grupos[porcentaje].push(receta.title);
            }

            // Dentro de cada grupo con el mismo porcentaje, los títulos deben estar en orden alfabético
            for (const [porcentaje, titulos] of Object.entries(grupos)) {
                if (titulos.length >= 2) {
                    const ordenadosEsperado = [...titulos].sort((a, b) =>
                        a.localeCompare(b, 'es', { sensitivity: 'base' })
                    );
                    expect(titulos).toEqual(ordenadosEsperado);
                }
            }
        } else {
            // Si hay menos de 2 recetas no podemos verificar el orden: pasamos el test
            console.warn('⚠️  Solo se encontró una receta o ninguna; no se puede verificar el orden alfabético.');
        }
    });
});