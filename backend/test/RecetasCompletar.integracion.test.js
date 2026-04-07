const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

// Aumentamos el timeout para dar tiempo a la base de datos real
jest.setTimeout(30000);

// Datos base para las pruebas de completar y eliminar
const recetasTest = [
    {
        title: "TEST_Tortilla para Completar",
        ingredients: [
            { nombre: "Huevo", cantidad: 2, unidad: "ud" }
        ],
        steps: ["Batir huevos"],
        image_url: "https://via.placeholder.com/150",
        isTest: true,
        isCompleted: false
    },
    {
        title: "TEST_Ensalada para Borrar",
        ingredients: [
            { nombre: "Lechuga", cantidad: 100, unidad: "g" },
            { nombre: "Cebolla", cantidad: 1, unidad: "ud" }
        ],
        steps: ["Lavar y cortar"],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    }
];

const titulosBase = new Set(recetasTest.map(r => r.title));

beforeAll(async () => {
    // Conexión a la base de datos real (MongoDB Atlas)
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    // Limpieza inicial de datos de test previos
    /* await Receta.deleteMany({ isTest: true }); */
    // Insertamos las recetas necesarias para los tests
    await Receta.insertMany(recetasTest);
});

afterEach(async () => {
    // Limpiamos recetas creadas durante los tests, manteniendo las de la base
    /* await Receta.deleteMany({
         isTest: true,
         title: { $nin: Array.from(titulosBase) }
     });*/
});

afterAll(async () => {
    try {
        // Limpieza final absoluta
        // const resultado = await Receta.deleteMany({ isTest: true });
        console.log(`Limpieza final: ${resultado.deletedCount} recetas de test eliminadas.`);
    } catch (error) {
        console.error("Error limpiando la base de datos tras los tests:", error);
    } finally {
        await mongoose.connection.close();
    }
});

describe('Integración Recetas - Completar y Eliminar ingredientes (Base de Datos Real)', () => {

    // --- PRUEBAS PARA EL ENDPOINT 3: COMPLETAR ---
    describe('PUT /api/recetas/completar', () => {

        test('Actualiza correctamente los pasos e ingredientes y marca como completada', async () => {
            const nuevosPasos = ["Batir", "Echar sal", "Cocinar"];
            const nuevosIngredientes = [{ nombre: "Huevo", cantidad: 3, unidad: "ud" }];

            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: "TEST_Tortilla para Completar",
                    steps: nuevosPasos,
                    ingredients: nuevosIngredientes
                });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe("TEST_Tortilla para Completar");
            expect(res.body.steps).toEqual(nuevosPasos);
            expect(res.body.ingredients[0].cantidad).toBe(3);

            // Verificamos que realmente se guardó en la BD real
            const recetaEnBD = await Receta.findOne({ title: "TEST_Tortilla para Completar" });
            expect(recetaEnBD.isCompleted).toBe(true);
        });

        test('Devuelve 404 si la receta no existe', async () => {
            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: "ESTA_RECETA_NO_EXISTE",
                    steps: ["Nada"],
                    ingredients: []
                });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Receta no encontrada');
        });
        test('Lógica de Negocio (LC-49): Devuelve 400 si se intenta guardar con cantidad 0', async () => {
            const res = await request(app)
                .put('/api/recetas/completar')
                .send({
                    titulo: "TEST_Tortilla para Completar", // Título válido
                    steps: ["Paso 1"],
                    ingredients: [{ nombre: "Huevo", cantidad: 0, unidad: "ud" }] // Dato inválido
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Lógica de Negocio');
        });
    });

    // --- PRUEBAS PARA EL ENDPOINT 4: ELIMINAR INGREDIENTE ---
    describe('DELETE /api/recetas/ingrediente', () => {

        test('Elimina un ingrediente específico de la lista de la receta', async () => {
            // La receta "TEST_Ensalada para Borrar" tiene Lechuga y Cebolla. Vamos a quitar la Cebolla.
            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: "TEST_Ensalada para Borrar",
                    nombreIngrediente: "Cebolla"
                });

            expect(res.status).toBe(200);

            // El array de ingredientes solo debería tener 1 elemento ahora (la Lechuga)
            expect(res.body.ingredients.length).toBe(1);
            expect(res.body.ingredients[0].nombre).toBe("Lechuga");

            // Verificación extra en la base de datos real
            const recetaEnBD = await Receta.findOne({ title: "TEST_Ensalada para Borrar" });
            const tieneCebolla = recetaEnBD.ingredients.some(i => i.nombre === "Cebolla");
            expect(tieneCebolla).toBe(false);
        });

        test('Devuelve 404 si la receta para eliminar ingrediente no existe', async () => {
            const res = await request(app)
                .delete('/api/recetas/ingrediente')
                .send({
                    titulo: "TEST_Inexistente",
                    nombreIngrediente: "Sal"
                });

            expect(res.status).toBe(404);
        });
    });
});