const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Usuario = require('../src/models/usuario');

const bcrypt = require('bcryptjs');

describe('POST /api/auth/login', () => {

    beforeAll(async () => {
        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        // Limpiamos usuarios de test
        await Usuario.deleteMany({
            $or: [
                { username: 'usuario test' },
                { nombre: 'usuario test' }
            ]
        });
        // Creamos usuario de prueba
        const passwordHash = await bcrypt.hash('123456', 10);

        await Usuario.create({
            nombre: 'usuario test',
            username: 'usuario test',
            password: passwordHash
        });
    });

    afterAll(async () => {
        await Usuario.deleteMany({
            $or: [
                { username: 'usuario test' },
                { nombre: 'usuario test' }
            ]
        });
        await mongoose.connection.close();
    });

    test('Login correcto devuelve token y usuario', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'usuario test',
                password: '123456'
            });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('usuario');
    });

    test('Error si el usuario no existe', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'no_existe_usuario',
                password: '123456'
            });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('Error si la contraseña es incorrecta', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'usuario test',
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error');
    });

    test('Error si faltan campos', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: ''
            });

        expect(res.status).toBe(400);
    });

});