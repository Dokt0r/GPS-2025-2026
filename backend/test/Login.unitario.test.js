const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const authRouter = require('../src/routes/auth');
const Usuario = require('../src/models/usuario');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// Suite principal para validar el comportamiento del endpoint de inicio de sesion.
describe('API de Autenticacion - Tests Unitarios de Login', () => {
    // Configuracion base de mocks para aislar el router de servicios externos.
    beforeEach(() => {
        vi.spyOn(Usuario, 'findOne').mockResolvedValue(null);
        vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
        vi.spyOn(jwt, 'sign').mockReturnValue('mock-jwt-token');
    });

    // Limpia todos los spies/mocks tras cada test para evitar contaminacion entre casos.
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Grupo de pruebas exclusivo del endpoint de login.
    describe('POST /api/auth/login', () => {
        // Verifica validacion de entrada: no se debe consultar BD si faltan credenciales.
        test('Devuelve 400 si faltan campos obligatorios', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'SoloNombre' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Por favor, rellena todos los campos obligatorios.');
            expect(Usuario.findOne).not.toHaveBeenCalled();
        });

        // Verifica validacion de entrada cuando el username solo contiene espacios.
        test('Devuelve 400 si username solo tiene espacios', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: '     ', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Por favor, rellena todos los campos obligatorios.');
            expect(Usuario.findOne).not.toHaveBeenCalled();
        });

        // Verifica autenticacion fallida cuando el usuario no existe en BD.
        test('Devuelve 401 si el usuario no existe', async () => {
            Usuario.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefNoExiste', password: 'password123' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Credenciales invalidas.');
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        // Verifica autenticacion fallida cuando la password no coincide con el hash almacenado.
        test('Devuelve 401 si la contrasena es incorrecta', async () => {
            const usuarioMock = {
                id: 'u-1',
                nombre: 'ChefValido',
                password: 'hash-real',
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(false);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'passwordErronea' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Credenciales invalidas.');
            expect(usuarioMock.save).not.toHaveBeenCalled();
        });

        // Verifica que bcrypt.compare recibe password en claro y hash persistido correctamente.
        test('Llama a bcrypt.compare con password y hash esperados', async () => {
            const usuarioMock = {
                id: 'u-1b',
                nombre: 'ChefValido',
                password: 'hash-real',
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);

            await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'password123' });

            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hash-real');
        });

        // Verifica flujo exitoso completo: emision de tokens, persistencia de refresh y cookie.
        test('Exito: devuelve access token, usuario y cookie refresh', async () => {
            const usuarioMock = {
                id: 'u-2',
                nombre: 'ChefValido',
                password: 'hash-real',
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);
            bcrypt.compare.mockResolvedValue(true);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('mensaje', 'Inicio de sesion exitoso');
            expect(res.body).toHaveProperty('accessToken', 'mock-jwt-token');
            expect(res.body).toHaveProperty('usuario');
            expect(res.body.usuario).toEqual({
                id: 'u-2',
                username: 'ChefValido'
            });
            expect(usuarioMock.save).toHaveBeenCalledTimes(1);

            const cookies = res.headers['set-cookie'];
            expect(cookies).toBeDefined();
            expect(cookies[0]).toMatch(/jwt_refresh=mock-jwt-token/);
            expect(cookies[0]).toMatch(/HttpOnly/);
        });

        // Verifica que se generan dos tokens con expiraciones distintas (access y refresh).
        test('Genera access y refresh token con expiraciones esperadas', async () => {
            const usuarioMock = {
                id: 'u-2b',
                nombre: 'ChefValido',
                password: 'hash-real',
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'password123' });

            expect(res.status).toBe(200);
            expect(jwt.sign).toHaveBeenCalledTimes(2);
            expect(jwt.sign).toHaveBeenNthCalledWith(
                1,
                { usuario: { id: 'u-2b' } },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '15m' }
            );
            expect(jwt.sign).toHaveBeenNthCalledWith(
                2,
                { usuario: { id: 'u-2b' } },
                process.env.JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );
        });

        // Verifica que el refresh token se persiste en el usuario antes de guardar sesion.
        test('Guarda el refresh token en usuario y persiste con save', async () => {
            const usuarioMock = {
                id: 'u-2c',
                nombre: 'ChefValido',
                password: 'hash-real',
                refreshToken: null,
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'password123' });

            expect(res.status).toBe(200);
            expect(usuarioMock.refreshToken).toBe('mock-jwt-token');
            expect(usuarioMock.save).toHaveBeenCalledTimes(1);
        });

        // Verifica normalizacion del username para evitar fallos por espacios accidentales.
        test('Normaliza username con espacios al inicio y final', async () => {
            const usuarioMock = {
                id: 'u-3',
                nombre: 'ChefEspacios',
                password: 'hash-real',
                save: vi.fn().mockResolvedValue(true)
            };

            Usuario.findOne.mockResolvedValue(usuarioMock);

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: '   ChefEspacios   ', password: 'password123' });

            expect(res.status).toBe(200);
            expect(Usuario.findOne).toHaveBeenCalledWith({ nombre: 'ChefEspacios' });
        });

        // Verifica manejo de excepciones inesperadas devolviendo error 500 estandar.
        test('Devuelve 500 si hay un error interno del servidor', async () => {
            Usuario.findOne.mockRejectedValue(new Error('Fallo de BD'));

            const res = await request(app)
                .post('/api/auth/login')
                .send({ username: 'ChefValido', password: 'password123' });

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor.');
        });
    });
});
