const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authRouter = require('../src/routes/auth');
const Usuario = require('../src/models/usuario');

// Configuramos una app Express de prueba para aislar el router
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter); 

describe('API de Autenticación - Tests Unitarios de Registro', () => {

    beforeEach(() => {
        // 1. Espiamos la Base de Datos
        vi.spyOn(Usuario, 'findOne').mockResolvedValue(null);
        // Al crear un "new Usuario()", espiamos su método save
        vi.spyOn(Usuario.prototype, 'save').mockResolvedValue(true);

        // 2. Espiamos bcrypt para que no ralentice el test
        vi.spyOn(bcrypt, 'genSalt').mockResolvedValue('mock-salt');
        vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password');

        // 3. Espiamos JWT para controlar el token generado
        vi.spyOn(jwt, 'sign').mockReturnValue('mock-jwt-token');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ==========================================
    // ENDPOINT: POST /api/auth/registro
    // ==========================================
    describe('POST /api/auth/registro', () => {

        test('LC-16-1: Devuelve 400 si faltan campos obligatorios', async () => {
            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'SoloNombre'
                    // Falta la contraseña
                });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Por favor, rellena todos los campos obligatorios.');
            expect(Usuario.findOne).not.toHaveBeenCalled();
        });

        test('LC-16-4: Devuelve 400 si el nombre de usuario tiene menos de 3 caracteres', async () => {
            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'Jo', // Inválido (muy corto)
                    password: 'password123'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('El nombre de usuario debe tener entre 3 y 15 caracteres');
        });

        test('LC-16-4: Devuelve 400 si el nombre de usuario contiene espacios', async () => {
            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'Chef Juan', // Inválido (contiene espacio)
                    password: 'password123'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('no contener espacios');
        });

        test('LC-16-4: Devuelve 400 si la contraseña no cumple el formato', async () => {
            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'ChefValido',
                    password: ' 12' // Inválido (espacio y muy corto)
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('La contrasena debe tener entre 3 y 15 caracteres');
        });

        test('LC-16-3: Devuelve 409 si el nombre de usuario ya está en uso', async () => {
            // Simulamos que la BD SÍ encuentra un usuario con ese nombre
            Usuario.findOne.mockResolvedValue({ nombre: 'ChefValido' });

            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'ChefValido',
                    password: 'password123'
                });

            expect(res.status).toBe(409);
            expect(res.body).toHaveProperty('error', 'El nombre de usuario no esta disponible.');
            expect(Usuario.findOne).toHaveBeenCalledWith({ nombre: 'ChefValido' });
            expect(Usuario.prototype.save).not.toHaveBeenCalled();
        });

        test('LC-16-2: Éxito total. Registra al usuario y devuelve tokens con cookie', async () => {
            // Simulamos que la BD NO encuentra a nadie
            Usuario.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'NuevoChef',
                    password: 'password123'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('mensaje', 'Usuario registrado correctamente');
            expect(res.body).toHaveProperty('accessToken', 'mock-jwt-token');
            expect(res.body.usuario).toHaveProperty('username', 'NuevoChef');
            
            expect(Usuario.prototype.save).toHaveBeenCalledTimes(1);

            // Verificamos la Cookie
            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toMatch(/jwt_refresh=mock-jwt-token/);
            expect(cookies[0]).toMatch(/HttpOnly/);
        });

        test('Devuelve 500 si hay un error interno del servidor', async () => {
            Usuario.findOne.mockRejectedValue(new Error('Fallo de BD'));

            const res = await request(app)
                .post('/api/auth/registro')
                .send({
                    username: 'ChefValido',
                    password: 'password123'
                });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor.');
        });
    });
});