const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Usuario = require('../src/models/usuario');
const Receta = require('../src/models/recetas');

describe('Integracion Recetas - Guardar favoritos', () => {
    let accessToken = '';
    let usuarioId = '';
    let recetaId = '';
    const username = `fav${Date.now().toString().slice(-8)}`;
    const password = 'clave123';

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const receta = await Receta.create({
            title: `TEST_FAVORITO_${Date.now()}`,
            steps: ['Paso 1'],
            image_url: 'https://via.placeholder.com/150',
            ingredients: [{ nombre: 'Tomate', cantidad: 1, unidad: 'ud' }],
            isTest: true
        });
        recetaId = receta._id.toString();

        const registro = await request(app)
            .post('/api/auth/registro')
            .send({ username, password });

        accessToken = registro.body.accessToken;
        usuarioId = registro.body?.usuario?.id;
    });

    afterAll(async () => {
        try {
            await Usuario.deleteMany({ nombre: username });
            await Receta.deleteMany({ _id: recetaId });
        } finally {
            await mongoose.connection.close();
        }
    });

    test('Guarda una receta en la lista de favoritos del usuario autenticado', async () => {
        const res = await request(app)
            .post('/api/recetas/favoritos')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ recetaId });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);

        const usuarioActualizado = await Usuario.findById(usuarioId).lean();
        const favoritos = usuarioActualizado.listas.find(
            (lista) => lista.nombreLista.toLowerCase() === 'favoritos'
        );

        expect(favoritos).toBeDefined();
        expect(favoritos.recetas.map((id) => id.toString())).toContain(recetaId);
    });

    test('Devuelve 400 cuando la receta ya esta guardada en favoritos', async () => {
        const res = await request(app)
            .post('/api/recetas/favoritos')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ recetaId });

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('ya está en tu lista de favoritos');
    });

    test('Devuelve 401 si no se envia token de autenticacion', async () => {
        const res = await request(app)
            .post('/api/recetas/favoritos')
            .send({ recetaId });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('Devuelve 400 si falta recetaId en el body', async () => {
        const res = await request(app)
            .post('/api/recetas/favoritos')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Falta el ID de la receta.');
    });
});
