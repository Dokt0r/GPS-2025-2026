const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../src/app');
const Receta = require('../src/models/recetas');

const tituloBase = `Receta Integracion Detalle ${Date.now()}`;


const esperarConexionMongo = async (timeoutMs = 10000) => {
  const inicio = Date.now();

  while (mongoose.connection.readyState !== 1 && Date.now() - inicio < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (mongoose.connection.readyState !== 1) {
    throw new Error(
      'No se pudo establecer conexion con MongoDB Atlas. Revisa MONGODB_URI y whitelist de IP.'
    );
  }
};

describe('API de Recetas - Integracion detalle (DB real)', () => {
  beforeAll(async () => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI no esta definida. Configura el .env para tests con DB real.');
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose
        .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
        .catch(() => {});
    }

    await esperarConexionMongo(10000);

    await Receta.findOneAndUpdate(
      { title: tituloBase },
      {
        title: tituloBase,
        steps: ['Paso de prueba 1', 'Paso de prueba 2'],
        image_url: 'https://example.com/integracion-detalle.jpg',
        ingredients: [
          { nombre: 'Arroz', cantidad: 200, unidad: 'g' },
          { nombre: 'Pollo', cantidad: 300, unidad: 'g' }
        ],
        nutritions: { calories: 100 },
        tags: ['test']
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await Receta.deleteOne({ title: tituloBase });
    }

    await mongoose.disconnect().catch(() => {});
  });

  describe('GET /api/recetas/:titulo', () => {
    test('devuelve 404 cuando la receta no existe', async () => {
      const res = await request(app).get('/api/recetas/Receta%20Inexistente%20XYZ');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Receta no encontrada');
    });

    test('devuelve 200 y el detalle completo cuando existe', async () => {
      const res = await request(app).get(`/api/recetas/${encodeURIComponent(tituloBase)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', tituloBase);
      expect(Array.isArray(res.body.ingredients)).toBe(true);
      expect(Array.isArray(res.body.steps)).toBe(true);
      expect(res.body.steps.length).toBeGreaterThan(0);
    });

    test('encuentra la receta sin distinguir mayusculas/minusculas', async () => {
      const tituloAlterado = tituloBase
        .split(' ')
        .map((p, i) => (i % 2 === 0 ? p.toUpperCase() : p.toLowerCase()))
        .join(' ');

      const res = await request(app).get(`/api/recetas/${encodeURIComponent(tituloAlterado)}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', tituloBase);
    });
  });
});
