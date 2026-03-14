const http = require('http');
const mongoose = require('mongoose');
const app = require('../src/app');
const Ingrediente = require('../src/models/ingredientes');

function httpGetJson(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const body = raw ? JSON.parse(raw) : null;
          resolve({ status: res.statusCode, body });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

describe('Pruebas de sistema - Ingredientes (mínimas dependencias)', () => {
  let server;
  let baseUrl;

  beforeAll(async () => {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      // Limpiar e insertar datos de prueba
      await Ingrediente.deleteMany({});
      const testData = [
        { nombre: 'Aceite' },
        { nombre: 'Acelgas' },
        { nombre: 'Cebolla' },
        { nombre: 'Tomate' }
      ];
      await Ingrediente.insertMany(testData);
    }

    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    server.close();
    if (process.env.MONGODB_URI) {
      await mongoose.disconnect();
    }
  });

  describe('GET /api/ingredientes', () => {
    test('Devuelve todos los ingredientes sin filtro', async () => {
      const res = await httpGetJson(`${baseUrl}/api/ingredientes`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test('Filtra ingredientes por nombre', async () => {
      const res = await httpGetJson(`${baseUrl}/api/ingredientes?nombre=tom`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(ing => {
        expect(ing.nombre.toLowerCase()).toContain('tom');
      });
    });

    test('Devuelve array vacío si no hay coincidencias', async () => {
      const res = await httpGetJson(`${baseUrl}/api/ingredientes?nombre=zzzzzzzzz`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    test('Cada ingrediente tiene campo nombre', async () => {
      const res = await httpGetJson(`${baseUrl}/api/ingredientes?nombre=a`);
      expect(res.status).toBe(200);
      res.body.forEach(ing => {
        expect(ing).toHaveProperty('nombre');
      });
    });
  });
});