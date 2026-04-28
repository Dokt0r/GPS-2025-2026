const request = require('supertest');
const express = require('express');
const Usuario = require('../src/models/usuario');

// App limpia con middleware de auth mockeado directamente
const app = express();
app.use(express.json());

// Sustituye requireAuth inyectando el usuario sin token
app.use((req, res, next) => {
    req.usuario = { id: 'u-mock-id' };
    next();
});

// Copiamos el endpoint exacto del router
app.get('/api/recetas/favoritos', async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id)
            .populate({
                path: 'listas.recetas',
                model: 'Receta',
                select: '_id title image_url'
            });

        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no autorizado.' });
        }

        const listaFavoritos = usuario.listas.find(
            (l) => l.nombreLista.trim().toLowerCase() === 'favoritos'
        );

        const recetas = listaFavoritos ? listaFavoritos.recetas : [];

        return res.status(200).json({ favoritos: recetas });

    } catch (error) {
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

describe('API de Favoritos - Tests Unitarios', () => {

    beforeEach(() => {
        vi.spyOn(Usuario, 'findById').mockReturnValue({
            populate: vi.fn().mockResolvedValue(null)
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /api/recetas/favoritos', () => {

        test('Devuelve 401 si el usuario no existe en la base de datos', async () => {
            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue(null)
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error', 'Usuario no autorizado.');
        });

        test('Llama a populate con la configuración correcta de Receta', async () => {
            const populateMock = vi.fn().mockResolvedValue({ listas: [] });
            Usuario.findById.mockReturnValue({ populate: populateMock });

            await request(app).get('/api/recetas/favoritos');

            expect(populateMock).toHaveBeenCalledWith({
                path: 'listas.recetas',
                model: 'Receta',
                select: '_id title image_url'
            });
        });

        test('Devuelve favoritos vacíos si no existe lista "favoritos"', async () => {
            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({
                    listas: [
                        { nombreLista: 'Pendientes', recetas: [] },
                        { nombreLista: 'Desayunos', recetas: [] }
                    ]
                })
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('favoritos');
            expect(res.body.favoritos).toEqual([]);
        });

        test('Devuelve las recetas de la lista "favoritos" correctamente', async () => {
            const recetasMock = [
                { _id: 'r-1', title: 'Tortilla', image_url: 'https://img.com/tortilla.jpg' },
                { _id: 'r-2', title: 'Paella', image_url: 'https://img.com/paella.jpg' }
            ];

            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({
                    listas: [{ nombreLista: 'favoritos', recetas: recetasMock }]
                })
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(200);
            expect(res.body.favoritos).toHaveLength(2);
            expect(res.body.favoritos[0].title).toBe('Tortilla');
            expect(res.body.favoritos[1].title).toBe('Paella');
        });

        test('Encuentra la lista "favoritos" con variaciones de mayúsculas y espacios', async () => {
            const recetasMock = [
                { _id: 'r-3', title: 'Gazpacho', image_url: 'https://img.com/gazpacho.jpg' }
            ];

            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({
                    listas: [{ nombreLista: '  Favoritos  ', recetas: recetasMock }]
                })
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(200);
            expect(res.body.favoritos).toHaveLength(1);
            expect(res.body.favoritos[0].title).toBe('Gazpacho');
        });

        test('Devuelve array vacío si la lista "favoritos" existe pero está vacía', async () => {
            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({
                    listas: [{ nombreLista: 'favoritos', recetas: [] }]
                })
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(200);
            expect(res.body.favoritos).toEqual([]);
        });

        test('Devuelve 500 si hay un error interno del servidor', async () => {
            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockRejectedValue(new Error('Fallo de BD'))
            });

            const res = await request(app).get('/api/recetas/favoritos');

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor.');
        });

        test('Llama a findById con el ID de usuario del token', async () => {
            Usuario.findById.mockReturnValue({
                populate: vi.fn().mockResolvedValue({ listas: [] })
            });

            await request(app).get('/api/recetas/favoritos');

            expect(Usuario.findById).toHaveBeenCalledWith('u-mock-id');
        });
    });
});