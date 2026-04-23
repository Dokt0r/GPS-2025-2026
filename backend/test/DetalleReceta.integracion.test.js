const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

describe('GET /api/recetas/:titulo — Detalle de receta', () => {

  // Usamos un título único con un timestamp para evitar CUALQUIER colisión 
  // con restos de ejecuciones pasadas o de otros archivos.
  const uniqueId = Date.now();
  const tituloTest = `Tarta de Queso ${uniqueId}`;
  const tituloUrl = encodeURIComponent(tituloTest);

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Creamos la receta UNA SOLA VEZ para toda esta suite
    // Asegúrate de incluir TODOS los campos obligatorios (image_url, etc.)
    await Receta.create({
      title: tituloTest,
      ingredients: [
        { nombre: "Queso Crema", cantidad: 500, unidad: "g" }
      ],
      steps: ["Paso 1: Mezclar"],
      image_url: "https://via.placeholder.com/150",
      isTest: true
    });
  });

  // Limpieza final específica de lo que acabamos de crear
  afterAll(async () => {
    await Receta.deleteMany({ title: tituloTest });
    await mongoose.connection.close();
  });

  test('Debe obtener una receta correctamente por su título', async () => {
    const res = await request(app).get(`/api/recetas/${tituloUrl}`);

    // Si aquí te da 404, imprime res.body para ver qué dice el error
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(tituloTest);
  });

  test('Debe ser insensible a mayúsculas/minúsculas', async () => {
    // Convertimos el título a minúsculas para probar el case-insensitive
    const res = await request(app).get(`/api/recetas/${tituloUrl.toLowerCase()}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(tituloTest);
  });

  test('Debe manejar correctamente caracteres especiales y espacios', async () => {
    const tituloEspecial = `Ñandú (Test) ${uniqueId}!`;

    await Receta.create({
      title: tituloEspecial,
      ingredients: [{ nombre: "Test", cantidad: 1, unidad: "ud" }],
      steps: ["Paso especial"],
      image_url: "https://via.placeholder.com/150",
      isTest: true
    });

    const res = await request(app).get(`/api/recetas/${encodeURIComponent(tituloEspecial)}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(tituloEspecial);
  });

  test('Debe devolver 404 si la receta no existe', async () => {
    const res = await request(app).get('/api/recetas/Titulo_Que_No_Existe_Nunca_123');
    expect(res.status).toBe(404);
  });
});