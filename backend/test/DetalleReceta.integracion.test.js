const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

// ============================================================
// CONFIGURACIÓN DE DATOS
// ============================================================

const recetaDetalleBase = {
  title: "TEST_Tarta de Queso",
  ingredients: [
    { nombre: "Queso Crema", cantidad: 500, unidad: "g" },
    { nombre: "Huevos", cantidad: 4, unidad: "ud" }
  ],
  steps: ["Mezclar todo", "Hornear a 200 grados"],
  image_url: "https://via.placeholder.com/150",
  isTest: true
};

const titulosBase = new Set([recetaDetalleBase.title]);

// ============================================================
// SETUP / TEARDOWN
// ============================================================

beforeAll(async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
  // Limpiamos solo lo que nos pertenece
  await Receta.create(recetaDetalleBase);
});

afterEach(async () => {
  /* Limpieza segura: no borramos la receta base del beforeAll
  await Receta.deleteMany({
    isTest: true,
    title: { $nin: Array.from(titulosBase) }
  });*/
});

afterAll(async () => {
  await mongoose.connection.close();
});

// ============================================================
// PRUEBAS DE INTEGRACIÓN: GET /api/recetas/:titulo
// ============================================================

describe('GET /api/recetas/:titulo — Detalle de receta', () => {

  test('Debe obtener una receta correctamente por su título', async () => {
    // Codificamos el título para simular comportamiento del navegador/frontend
    const tituloUrl = encodeURIComponent("TEST_Tarta de Queso");

    const res = await request(app).get(`/api/recetas/${tituloUrl}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(recetaDetalleBase.title);
    expect(res.body.steps).toEqual(expect.arrayContaining(recetaDetalleBase.steps));
    expect(res.body).toHaveProperty('_id');
  });

  test('Debe ser insensible a mayúsculas/minúsculas (Case Insensitive)', async () => {
    // Buscamos en minúsculas aunque en la BBDD está capitalizado
    const res = await request(app).get(`/api/recetas/test_tarta de queso`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("TEST_Tarta de Queso");
  });

  test('Debe manejar correctamente caracteres especiales y espacios (decodeURIComponent)', async () => {
    const recetaEspecial = await Receta.create({
      title: "TEST_Ensalada de Ñandú!",
      ingredients: [{ nombre: "Lechuga", cantidad: 1, unidad: "ud" }],
      steps: ["Paso 1"],
      image_url: "https://via.placeholder.com/150", // <--- Añadido
      isTest: true
    });

    const tituloUrl = encodeURIComponent(recetaEspecial.title);
    const res = await request(app).get(`/api/recetas/${tituloUrl}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("TEST_Ensalada de Ñandú!");
  });

  test('Debe devolver 404 si la receta no existe', async () => {
    const res = await request(app).get('/api/recetas/Receta_Inexistente_123');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Receta no encontrada');
  });

  test('Debe evitar inyecciones de Regex o búsquedas parciales incorrectas', async () => {
    // Tu código usa ^ y $, por lo que "Tarta" no debería encontrar "TEST_Tarta de Queso"
    const res = await request(app).get('/api/recetas/Tarta');

    expect(res.status).toBe(404);
  });

  test('Debe funcionar con títulos que contienen puntos o paréntesis (escape de regex)', async () => {
    const recetaPuntos = await Receta.create({
      title: "TEST_Receta con (Paréntesis)...",
      ingredients: [{ nombre: "Agua", cantidad: 1, unidad: "ml" }],
      steps: ["Paso 1"],
      image_url: "https://via.placeholder.com/150", // <--- Añadido
      isTest: true
    });

    const tituloUrl = encodeURIComponent(recetaPuntos.title);
    const res = await request(app).get(`/api/recetas/${tituloUrl}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(recetaPuntos.title);
  });
});