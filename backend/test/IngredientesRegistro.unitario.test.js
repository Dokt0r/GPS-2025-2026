const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const ingredientesRouter = require('../src/routes/ingredientes');
const Ingrediente = require('../src/models/ingredientes');
const Usuario = require('../src/models/usuario');

const app = express();
app.use(express.json());
app.use('/api/ingredientes', ingredientesRouter);

const buildToken = () => jwt.sign(
    { usuario: { id: 'usuario-123' } },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
);

describe('API Ingredientes - Registro en nevera (unitario)', () => {
    beforeEach(() => {
        process.env.JWT_ACCESS_SECRET = 'test-secret';
        vi.restoreAllMocks();
    });

    test('GET /api/ingredientes/nevera devuelve la nevera del usuario', async () => {
        const usuarioMock = {
            nevera: [{
                ingrediente: {
                    _id: 'ing-1',
                    nombre: 'Arroz',
                    equivalencia_g_ml: null
                },
                cantidad: 2,
                unidad: 'kg'
            }],
            populate: vi.fn().mockResolvedValue(true)
        };

        vi.spyOn(Usuario, 'findById').mockResolvedValue(usuarioMock);

        const res = await request(app)
            .get('/api/ingredientes/nevera')
            .set('Authorization', `Bearer ${buildToken()}`);

        expect(res.status).toBe(200);
        expect(res.body.nevera).toEqual([
            {
                nombre: 'Arroz',
                unidad: 'kg',
                cantidad: 2,
                equivalencia_g_ml: null
            }
        ]);
        expect(usuarioMock.populate).toHaveBeenCalledWith('nevera.ingrediente');
    });

    test('POST /api/ingredientes/nevera crea ingrediente y lo añade a nevera', async () => {
        const ingredienteCreado = {
            _id: 'ing-2',
            nombre: 'Tomate',
            unidad: 'ud',
            equivalencia_g_ml: null
        };

        const usuarioMock = {
            nevera: [],
            populate: vi.fn().mockResolvedValue(true),
            save: vi.fn().mockResolvedValue(true)
        };

        vi.spyOn(Ingrediente, 'findOne').mockResolvedValue(null);
        vi.spyOn(Ingrediente, 'create').mockResolvedValue(ingredienteCreado);
        vi.spyOn(Usuario, 'findById').mockResolvedValue(usuarioMock);

        const res = await request(app)
            .post('/api/ingredientes/nevera')
            .set('Authorization', `Bearer ${buildToken()}`)
            .send({
                nombre: 'Tomate',
                cantidad: 3,
                unidad: 'ud'
            });

        expect(res.status).toBe(201);
        expect(Ingrediente.create).toHaveBeenCalledWith({
            nombre: 'Tomate',
            unidad: 'ud',
            equivalencia_g_ml: null
        });
        expect(usuarioMock.save).toHaveBeenCalledTimes(1);
        expect(usuarioMock.nevera).toHaveLength(1);
        expect(usuarioMock.nevera[0]).toMatchObject({
            ingrediente: 'ing-2',
            cantidad: 3,
            unidad: 'ud'
        });
    });

    test('POST /api/ingredientes/nevera acumula cantidad si ya existe en nevera', async () => {
        const ingredienteExistente = {
            _id: 'ing-3',
            nombre: 'Leche',
            unidad: 'ml',
            equivalencia_g_ml: null
        };

        const itemExistente = {
            ingrediente: {
                _id: 'ing-3',
                nombre: 'Leche',
                equivalencia_g_ml: null
            },
            cantidad: 500,
            unidad: 'ml'
        };

        const usuarioMock = {
            nevera: [itemExistente],
            populate: vi.fn().mockResolvedValue(true),
            save: vi.fn().mockResolvedValue(true)
        };

        vi.spyOn(Ingrediente, 'findOne').mockResolvedValue(ingredienteExistente);
        vi.spyOn(Ingrediente, 'create').mockResolvedValue(null);
        vi.spyOn(Usuario, 'findById').mockResolvedValue(usuarioMock);

        const res = await request(app)
            .post('/api/ingredientes/nevera')
            .set('Authorization', `Bearer ${buildToken()}`)
            .send({
                nombre: 'Leche',
                cantidad: 200,
                unidad: 'ml'
            });

        expect(res.status).toBe(201);
        expect(Ingrediente.create).not.toHaveBeenCalled();
        expect(usuarioMock.nevera).toHaveLength(1);
        expect(usuarioMock.nevera[0].cantidad).toBe(700);
        expect(usuarioMock.save).toHaveBeenCalledTimes(1);
    });

    test('POST /api/ingredientes/nevera devuelve 400 con datos inválidos', async () => {
        const res = await request(app)
            .post('/api/ingredientes/nevera')
            .set('Authorization', `Bearer ${buildToken()}`)
            .send({
                nombre: '',
                cantidad: 0,
                unidad: ''
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Datos de ingrediente no validos.');
    });
});
