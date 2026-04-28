const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Usuario = require('../src/models/usuario');
const Receta = require('../src/models/recetas');

describe('Integración Recetas - Favoritos (Guardar y Ver)', () => {
    let accessToken = '';
    let usuarioId = '';
    let recetaId = '';
    let recetaId2 = '';
    const suffix = Date.now().toString().slice(-8);
    const username = `fav${suffix}`;
    const password = 'clave123';

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        const receta1 = await Receta.create({
            title: `TEST_FAVORITO_A_${suffix}`,
            steps: ['Paso 1'],
            image_url: 'https://via.placeholder.com/150',
            ingredients: [{ nombre: 'Tomate', cantidad: 1, unidad: 'ud' }],
            isTest: true
        });
        recetaId = receta1._id.toString();

        const receta2 = await Receta.create({
            title: `TEST_FAVORITO_B_${suffix}`,
            steps: ['Paso 1'],
            image_url: 'https://via.placeholder.com/150',
            ingredients: [{ nombre: 'Sal', cantidad: 1, unidad: 'g' }],
            isTest: true
        });
        recetaId2 = receta2._id.toString();

        // ¿Existe la receta justo antes de los tests?
        const comprobacion = await Receta.findById(recetaId);
        console.log('¿Receta existe tras crearla?', comprobacion ? 'SÍ' : 'NO - YA FUE BORRADA');

        const registro = await request(app)
            .post('/api/auth/registro')
            .send({ username, password });

        accessToken = registro.body.accessToken;
        usuarioId = registro.body?.usuario?.id;
        console.log('accessToken:', accessToken ? 'OK' : 'FALTA');
        console.log('usuarioId:', usuarioId);
    });

    afterAll(async () => {
        try {
            await Usuario.deleteMany({ nombre: username });
            await Receta.deleteMany({ isTest: true, title: { $regex: suffix } });
        } finally {
            await mongoose.connection.close();
        }
    });

    // =========================================================================
    // BLOQUE 1: POST /api/recetas/favoritos — Guardar favorito
    // =========================================================================
    describe('POST /api/recetas/favoritos', () => {

        test('Guarda una receta en la lista de favoritos del usuario autenticado', async () => {
            const res = await request(app)
                .post('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ recetaId });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);

            // Verificamos en BD que realmente se guardó
            const usuarioActualizado = await Usuario.findById(usuarioId).lean();
            const favoritos = usuarioActualizado.listas.find(
                (lista) => lista.nombreLista.toLowerCase() === 'favoritos'
            );

            expect(favoritos).toBeDefined();
            expect(favoritos.recetas.map((id) => id.toString())).toContain(recetaId);
        });

        test('Devuelve 400 cuando la receta ya está guardada en favoritos', async () => {
            // Intentamos guardar la misma receta por segunda vez
            const res = await request(app)
                .post('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ recetaId });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('ya está en tu lista de favoritos');
        });

        test('Devuelve 401 si no se envía token de autenticación', async () => {
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

        test('Guarda una segunda receta distinta en favoritos', async () => {
            const res = await request(app)
                .post('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ recetaId: recetaId2 });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('success', true);

            const usuarioActualizado = await Usuario.findById(usuarioId).lean();
            const favoritos = usuarioActualizado.listas.find(
                (lista) => lista.nombreLista.toLowerCase() === 'favoritos'
            );

            expect(favoritos.recetas.map((id) => id.toString())).toContain(recetaId2);
        });
    });

    // =========================================================================
    // BLOQUE 2: GET /api/recetas/favoritos — Ver favoritos
    // Nota: estos tests dependen de que el POST anterior haya guardado datos,
    // por eso están en el mismo describe y se ejecutan después.
    // =========================================================================
    describe('GET /api/recetas/favoritos', () => {

        test('Devuelve la lista de favoritos del usuario autenticado', async () => {
            const res = await request(app)
                .get('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('favoritos');
            expect(Array.isArray(res.body.favoritos)).toBe(true);
        });

        test('La lista incluye las recetas guardadas previamente', async () => {
            const res = await request(app)
                .get('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);

            const ids = res.body.favoritos.map((r) => r._id.toString());
            expect(ids).toContain(recetaId);
            expect(ids).toContain(recetaId2);
        });

        test('Cada receta devuelta tiene los campos _id, title e image_url', async () => {
            const res = await request(app)
                .get('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);

            for (const receta of res.body.favoritos) {
                expect(receta).toHaveProperty('_id');
                expect(receta).toHaveProperty('title');
                expect(receta).toHaveProperty('image_url');
            }
        });

        test('No devuelve campos extra como steps o ingredients', async () => {
            const res = await request(app)
                .get('/api/recetas/favoritos')
                .set('Authorization', `Bearer ${accessToken}`);

            expect(res.status).toBe(200);

            for (const receta of res.body.favoritos) {
                expect(receta).not.toHaveProperty('steps');
                expect(receta).not.toHaveProperty('ingredients');
            }
        });

        test('Devuelve 401 si no se envía token de autenticación', async () => {
            const res = await request(app)
                .get('/api/recetas/favoritos');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });
    });
});