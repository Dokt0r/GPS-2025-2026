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

describe('API de Recetas - Integracion detalle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/recetas/:titulo', () => {
    test('devuelve 404 cuando la receta no existe', async () => {
      Receta.findOne.mockResolvedValue(null);

      const res = await request(app).get('/api/recetas/Receta%20Inexistente');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'Receta no encontrada');
      expect(Receta.findOne).toHaveBeenCalledTimes(1);
    });

    test('devuelve 200 y el detalle de la receta cuando existe', async () => {
      const recetaMock = {
        title: 'Paella mixta',
        image_url: 'https://example.com/paella.jpg',
        ingredients: [
          { nombre: 'Arroz', cantidad: 200, unidad: 'g' },
          { nombre: 'Pollo', cantidad: 300, unidad: 'g' }
        ],
        steps: ['Sofreir ingredientes', 'Cocinar a fuego medio']
      };

      Receta.findOne.mockResolvedValue(recetaMock);

      const res = await request(app).get('/api/recetas/Paella%20mixta');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('title', 'Paella mixta');
      expect(res.body).toHaveProperty('ingredients');
      expect(res.body).toHaveProperty('steps');
      expect(Receta.findOne).toHaveBeenCalledTimes(1);
    });

    test('usa busqueda por titulo exacto sin distinguir mayusculas/minusculas', async () => {
      Receta.findOne.mockResolvedValue({ title: 'Paella mixta' });

      const res = await request(app).get('/api/recetas/pAelLa%20MiXtA');

      expect(res.status).toBe(200);
      expect(Receta.findOne).toHaveBeenCalledWith({
        title: expect.any(RegExp)
      });

      const filtro = Receta.findOne.mock.calls[0][0];
      expect(filtro.title.test('PAELLA MIXTA')).toBe(true);
      expect(filtro.title.test('Paella mixta con marisco')).toBe(false);
    });

    test('devuelve 500 cuando falla la base de datos', async () => {
      Receta.findOne.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/recetas/Paella%20mixta');

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno del servidor');
    });
  });
});
