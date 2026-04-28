const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Receta = require('../src/models/recetas');
const Usuario = require('../src/models/usuario');

// Asumo que tu modelo de ingredientes se llama así, ajusta si es necesario
// const Ingrediente = require('../src/models/ingredientes'); 

describe('PUT /api/recetas/completar — Integración con Populate', () => {
    let token;
    let usuarioId;
    let ingredienteId;
    const suffix = `_RARE_${Date.now()}`;
    const nombreIngredienteRaro = `Especia_Prohibida${suffix}`;
    const tituloRecetaUnica = `Receta Secreta${suffix}`;

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        // 1. CREAR INGREDIENTE REAL (para que el populate funcione)
        // Usamos una operación directa a la colección si no tienes el modelo importado,
        // o usa el modelo Ingrediente si lo tienes.
        const ingredienteDoc = await mongoose.connection.collection('ingredientes').insertOne({
            nombre: nombreIngredienteRaro,
            unidad: "g",
            isTest: true
        });
        ingredienteId = ingredienteDoc.insertedId;

        // 2. CREAR USUARIO con ese ingrediente en su nevera
        const usuario = await Usuario.create({
            nombre: "Cocinero Test",
            email: `test_completar${suffix}@example.com`,
            password: "password123",
            nevera: [
                {
                    ingrediente: ingredienteId,
                    nombre: nombreIngredienteRaro, // A veces se guarda duplicado por comodidad
                    cantidad: 100,
                    unidad: "g"
                }
            ]
        });
        usuarioId = usuario._id;

        // 3. GENERAR TOKEN
        token = jwt.sign(
            { usuario: { id: usuarioId } },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '1h' }
        );

        // 4. CREAR RECETA que usa ese ingrediente
        await Receta.create({
            title: tituloRecetaUnica,
            ingredients: [{ nombre: nombreIngredienteRaro, cantidad: 40, unidad: "g" }],
            steps: ["Mezclar la especia rara"],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });
    });

    afterAll(async () => {
        await Usuario.findByIdAndDelete(usuarioId);
        await Receta.deleteMany({ title: tituloRecetaUnica });
        await mongoose.connection.collection('ingredientes').deleteOne({ _id: ingredienteId });
        await mongoose.connection.close();
    });

    test('Debe restar el ingrediente raro correctamente usando populate', async () => {
        const res = await request(app)
            .put('/api/recetas/completar')
            .set('Authorization', `Bearer ${token}`)
            .send({
                titulo: tituloRecetaUnica,
                steps: ["Paso completado"],
                ingredients: [{ nombre: nombreIngredienteRaro, cantidad: 40, unidad: "g" }]
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verificamos que queden 60g (100 - 40)
        const usuarioDB = await Usuario.findById(usuarioId);
        const item = usuarioDB.nevera[0];
        expect(item.cantidad).toBe(60);
    });

    test('Debe eliminar el ingrediente si se agota la especia rara', async () => {
        // Gastamos los 60g que quedan
        const res = await request(app)
            .put('/api/recetas/completar')
            .set('Authorization', `Bearer ${token}`)
            .send({
                titulo: tituloRecetaUnica,
                steps: ["Final"],
                ingredients: [{ nombre: nombreIngredienteRaro, cantidad: 60, unidad: "g" }]
            });

        expect(res.status).toBe(200);

        const usuarioDB = await Usuario.findById(usuarioId);
        // Debería estar vacía porque el filtro elimina cantidades <= 0
        expect(usuarioDB.nevera.length).toBe(0);
    });

    test('Debe marcar la receta como isCompleted: true en la base de datos', async () => {
        const recetaDB = await Receta.findOne({ title: tituloRecetaUnica });
        expect(recetaDB.isCompleted).toBe(true);
    });

    test('Debe completar la receta con éxito aunque la receta pida un ingrediente que el usuario NO tiene en la nevera', async () => {
        // Creamos un nombre de ingrediente que sabemos que no está en la nevera del usuario
        const ingredienteInexistente = `Ingrediente_Fantasma_${Date.now()}`;

        const res = await request(app)
            .put('/api/recetas/completar')
            .set('Authorization', `Bearer ${token}`)
            .send({
                titulo: tituloRecetaUnica,
                steps: ["Paso con ingrediente que no tengo"],
                // Enviamos el ingrediente raro (que sí tiene) y uno nuevo (que no tiene)
                ingredients: [
                    { nombre: nombreIngredienteRaro, cantidad: 1, unidad: "g" },
                    { nombre: ingredienteInexistente, cantidad: 500, unidad: "g" }
                ]
            });

        // Verificamos que no explote (200) y que devuelva el mensaje de éxito
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.mensaje).toBe("Receta completada e ingredientes actualizados en tu nevera.");

        // Verificamos que la receta se haya actualizado igualmente en la BBDD
        const recetaDB = await Receta.findOne({ title: tituloRecetaUnica });
        const tieneIngredienteFantasma = recetaDB.ingredients.some(ing => ing.nombre === ingredienteInexistente);

        expect(recetaDB.isCompleted).toBe(true);
        expect(tieneIngredienteFantasma).toBe(true);
    });
});