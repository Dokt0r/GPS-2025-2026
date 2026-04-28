const request = require('supertest');
const express = require('express');
const Usuario = require('../src/models/usuario');
const Receta = require('../src/models/recetas');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    req.usuario = { id: 'u-mock-id' };
    next();
});

app.put('/api/recetas/completar', async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;
        const escaparRegex = (texto) => texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const tituloSeguro = escaparRegex(titulo);

        const usuario = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');

        if (!usuario) {
            return res.status(401).json({ error: "Usuario no autenticado correctamente." });
        }

        const receta = await Receta.findOne({
            title: new RegExp('^' + tituloSeguro + '$', 'i')
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada." });

        for (const ingUsado of ingredients) {
            const itemEnNevera = usuario.nevera.find(item =>
                item.ingrediente.nombre.toLowerCase() === ingUsado.nombre.toLowerCase() &&
                item.unidad.toLowerCase() === ingUsado.unidad.toLowerCase()
            );
            if (itemEnNevera) {
                itemEnNevera.cantidad -= ingUsado.cantidad;
            }
        }

        usuario.nevera = usuario.nevera.filter(item => item.cantidad > 0);
        await usuario.save();

        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;
        await receta.save();

        const usuarioActualizado = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');
        const neveraActualizada = usuarioActualizado.nevera.map(item => ({
            nombre: item?.ingrediente?.nombre?.trim() || '',
            cantidad: Number(item?.cantidad) || 0,
            unidad: (item?.unidad || '').toLowerCase().trim(),
        })).filter(item => item.nombre && item.cantidad > 0);

        res.status(200).json({
            success: true,
            nevera: neveraActualizada,
            mensaje: "Receta completada e ingredientes actualizados en tu nevera."
        });

    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor al procesar la operación." });
    }
});

describe('API de Recetas - PUT /api/recetas/completar', () => {

    beforeEach(() => {
        vi.spyOn(Usuario, 'findById');
        vi.spyOn(Receta, 'findOne');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('Devuelve 401 si el usuario no existe en la base de datos', async () => {
        Usuario.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(null)
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Tortilla',
            steps: ['Paso 1'],
            ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
        });

        expect(res.status).toBe(401);
        expect(res.body).toHaveProperty('error', 'Usuario no autenticado correctamente.');
    });

    test('Devuelve 404 si la receta no existe', async () => {
        Usuario.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue({
                nevera: [],
                save: vi.fn()
            })
        });
        Receta.findOne.mockResolvedValue(null);

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Receta Inexistente',
            steps: ['Paso 1'],
            ingredients: []
        });

        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error', 'Receta no encontrada.');
    });

    test('Resta correctamente un ingrediente de la nevera', async () => {
        const neveraMock = [
            {
                ingrediente: { nombre: 'Huevo', equivalencia_g_ml: null },
                cantidad: 6,
                unidad: 'ud'
            }
        ];

        const usuarioMock = {
            nevera: neveraMock,
            save: vi.fn()
        };

        Usuario.findById
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(usuarioMock) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ nevera: [{ ingrediente: { nombre: 'Huevo' }, cantidad: 4, unidad: 'ud' }] }) });

        Receta.findOne.mockResolvedValue({
            title: 'Tortilla',
            steps: [],
            ingredients: [],
            isCompleted: false,
            save: vi.fn()
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Tortilla',
            steps: ['Batir huevos', 'Cocinar'],
            ingredients: [{ nombre: 'Huevo', cantidad: 2, unidad: 'ud' }]
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(usuarioMock.save).toHaveBeenCalled();
        // La cantidad debería haber bajado de 6 a 4
        expect(neveraMock[0].cantidad).toBe(4);
    });

    test('Elimina de la nevera los ingredientes que quedan en 0 o negativo', async () => {
        const neveraMock = [
            {
                ingrediente: { nombre: 'Leche', equivalencia_g_ml: null },
                cantidad: 200,
                unidad: 'ml'
            }
        ];

        const usuarioMock = {
            nevera: neveraMock,
            save: vi.fn().mockImplementation(function () {
                return Promise.resolve(this);
            })
        };

        Usuario.findById
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(usuarioMock) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ nevera: [] }) });

        Receta.findOne.mockResolvedValue({
            title: 'Bechamel',
            steps: [],
            ingredients: [],
            isCompleted: false,
            save: vi.fn()
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Bechamel',
            steps: ['Mezclar'],
            ingredients: [{ nombre: 'Leche', cantidad: 200, unidad: 'ml' }]
        });

        expect(res.status).toBe(200);
        // La nevera del usuario debe haber quedado vacía (filtrado de cantidad <= 0)
        expect(usuarioMock.nevera).toHaveLength(0);
    });

    test('Ignora ingredientes de la receta que no están en la nevera', async () => {
        const usuarioMock = {
            nevera: [],
            save: vi.fn()
        };

        Usuario.findById
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(usuarioMock) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ nevera: [] }) });

        Receta.findOne.mockResolvedValue({
            title: 'Paella',
            steps: [],
            ingredients: [],
            isCompleted: false,
            save: vi.fn()
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Paella',
            steps: ['Cocinar arroz'],
            ingredients: [{ nombre: 'Arroz', cantidad: 200, unidad: 'g' }]
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        // No debe haber fallado aunque el ingrediente no estaba en la nevera
        expect(usuarioMock.save).toHaveBeenCalled();
    });

    test('Devuelve la nevera actualizada en la respuesta', async () => {
        const neveraActualizadaMock = [
            { ingrediente: { nombre: 'Tomate', equivalencia_g_ml: null }, cantidad: 150, unidad: 'g' }
        ];

        Usuario.findById
            .mockReturnValueOnce({
                populate: vi.fn().mockResolvedValue({
                    nevera: [{ ingrediente: { nombre: 'Tomate' }, cantidad: 300, unidad: 'g' }],
                    save: vi.fn()
                })
            })
            .mockReturnValueOnce({
                populate: vi.fn().mockResolvedValue({ nevera: neveraActualizadaMock })
            });

        Receta.findOne.mockResolvedValue({
            title: 'Gazpacho',
            steps: [],
            ingredients: [],
            isCompleted: false,
            save: vi.fn()
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Gazpacho',
            steps: ['Triturar'],
            ingredients: [{ nombre: 'Tomate', cantidad: 150, unidad: 'g' }]
        });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('nevera');
        expect(res.body.nevera).toHaveLength(1);
        expect(res.body.nevera[0].nombre).toBe('Tomate');
    });

    test('Marca la receta como completada al guardar', async () => {
        const recetaMock = {
            title: 'Ensalada',
            steps: [],
            ingredients: [],
            isCompleted: false,
            save: vi.fn()
        };

        Usuario.findById
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ nevera: [], save: vi.fn() }) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ nevera: [] }) });

        Receta.findOne.mockResolvedValue(recetaMock);

        await request(app).put('/api/recetas/completar').send({
            titulo: 'Ensalada',
            steps: ['Mezclar verduras'],
            ingredients: []
        });

        expect(recetaMock.isCompleted).toBe(true);
        expect(recetaMock.save).toHaveBeenCalled();
    });

    test('Devuelve 500 si ocurre un error interno', async () => {
        Usuario.findById.mockReturnValue({
            populate: vi.fn().mockRejectedValue(new Error('Fallo de BD'))
        });

        const res = await request(app).put('/api/recetas/completar').send({
            titulo: 'Tortilla',
            steps: [],
            ingredients: []
        });

        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Error interno del servidor al procesar la operación.');
    });
});