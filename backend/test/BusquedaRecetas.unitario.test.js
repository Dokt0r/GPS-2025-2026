const request = require('supertest');
const app = require('../src/app');
const Receta = require('../src/models/recetas');
const Usuario = require('../src/models/usuario');
const jwt = require('jsonwebtoken');

describe('API de Recetas - Tests Unitarios Completos', () => {

    beforeEach(() => {
        vi.spyOn(Receta, 'buscarPorIngredientesYCantidades').mockResolvedValue([]);
        vi.spyOn(Receta, 'findOne').mockResolvedValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ==========================================
    // ENDPOINT: GET /api/recetas
    // ==========================================
    describe('GET /api/recetas', () => {

        test('Error 400 si no se pasan ingredientes o están vacíos', async () => {
            const res = await request(app).get('/api/recetas?ingredientes=   ');
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
            expect(Receta.buscarPorIngredientesYCantidades).not.toHaveBeenCalled();
        });

        test('Estandarización: Convierte kg a g y l a ml correctamente', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            await request(app).get('/api/recetas?ingredientes=Harina|1|kg|,Leche|2|l|');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];
            expect(llamada[0]).toMatchObject({ nombre: 'Harina', cantidad: 1000, unidad: 'g' });
            expect(llamada[1]).toMatchObject({ nombre: 'Leche', cantidad: 2000, unidad: 'ml' });
        });

        test('Casos Límite: Ingrediente sin cantidad usa 1 y sin unidad queda vacía', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            await request(app).get('/api/recetas?ingredientes=Sal||,Pimienta|5||');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];
            expect(llamada[0]).toMatchObject({ nombre: 'Sal', cantidad: 1 });
            expect(llamada[1]).toMatchObject({ nombre: 'Pimienta', cantidad: 5, unidad: '' });
        });

        test('Éxito: Devuelve recetas con formato correcto (title y coincidenciaTexto)', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([
                { _id: '1', title: 'Tortilla', coincidenciaTexto: '2/3' }
            ]);

            const res = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|');

            expect(res.status).toBe(200);
            expect(res.body[0]).toHaveProperty('title', 'Tortilla');
            expect(res.body[0]).toHaveProperty('coincidenciaTexto');
        });

        test('Éxito: Devuelve un array vacío si no hay recetas que coincidan', async () => {
            // Simulamos que la base de datos no encuentra nada (devuelve array vacío)
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            const res = await request(app).get('/api/recetas?ingredientes=IngredienteRaro|1|ud|');

            expect(res.status).toBe(200); // Sigue siendo un éxito técnico (200 OK)
            expect(res.body).toEqual([]); // Pero el cuerpo debe ser un array vacío
            expect(res.body).toHaveLength(0);
        });

        test('Manejo de error 500 en búsqueda de recetas', async () => {
            Receta.buscarPorIngredientesYCantidades.mockRejectedValue(new Error('DB error'));
            const res = await request(app).get('/api/recetas?ingredientes=Tomate|1|ud|');

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor');
        });

        test('Estandarización: Procesa correctamente la equivalencia_g_ml', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|60');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];
            expect(llamada[0]).toMatchObject({
                nombre: 'Huevo',
                cantidad: 2,
                unidad: 'ud',
                equivalencia_g_ml: 60
            });
        });

        test('Estandarización: Convierte cucharadas y cucharaditas a gramos', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            await request(app).get('/api/recetas?ingredientes=Aceite|1|cucharada|,Sal|1|cucharadita|');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];
            expect(llamada[0]).toMatchObject({ nombre: 'Aceite', cantidad: 15, unidad: 'g' });
            expect(llamada[1]).toMatchObject({ nombre: 'Sal', cantidad: 5, unidad: 'g' });
        });

        test('Estandarización: Normaliza variantes de "unidad" a "ud"', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            await request(app).get('/api/recetas?ingredientes=Limon|2|uds|,Ajo|1|u.|');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];
            expect(llamada[0].unidad).toBe('ud');
            expect(llamada[1].unidad).toBe('ud');
        });

        test('Desestructuración: Extrae correctamente nombre, cantidad, unidad y equivalencia usando el separador |', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);

            // Enviamos una cadena con los 4 campos claramente diferenciados
            await request(app).get('/api/recetas?ingredientes=Pasta|500|g|1.2');

            const llamada = Receta.buscarPorIngredientesYCantidades.mock.calls[0][0];

            // Verificamos que cada trozo del split terminó en su variable correspondiente
            expect(llamada[0].nombre).toBe('Pasta');
            expect(llamada[0].cantidad).toBe(500);
            expect(llamada[0].unidad).toBe('g');
            expect(llamada[0].equivalencia_g_ml).toBe(1.2);
        });

        test('Si no hay query pero hay token válido, usa la nevera del usuario autenticado', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);
            const secretOriginal = process.env.JWT_ACCESS_SECRET;
            process.env.JWT_ACCESS_SECRET = 'test-secret';
            vi.spyOn(jwt, 'verify').mockReturnValue({ usuario: { id: 'u-123' } });

            const populateMock = vi.fn().mockResolvedValue({
                nevera: [
                    {
                        ingrediente: { nombre: 'Tomate', equivalencia_g_ml: null },
                        cantidad: 2,
                        unidad: 'ud'
                    }
                ]
            });

            vi.spyOn(Usuario, 'findById').mockReturnValue({
                populate: populateMock
            });

            const res = await request(app)
                .get('/api/recetas')
                .set('Authorization', 'Bearer token-valido');

            process.env.JWT_ACCESS_SECRET = secretOriginal;

            expect(res.status).toBe(200);
            expect(Receta.buscarPorIngredientesYCantidades).toHaveBeenCalledWith([
                {
                    nombre: 'Tomate',
                    cantidad: 2,
                    unidad: 'ud',
                    equivalencia_g_ml: null
                }
            ]);
        });

        test('Si no hay query y el token es inválido, devuelve 400 por falta de ingredientes', async () => {
            Receta.buscarPorIngredientesYCantidades.mockResolvedValue([]);
            vi.spyOn(jwt, 'verify').mockImplementation(() => {
                throw new Error('Token inválido');
            });

            const res = await request(app)
                .get('/api/recetas')
                .set('Authorization', 'Bearer token-invalido');

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
            expect(Receta.buscarPorIngredientesYCantidades).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // ENDPOINT: GET /api/recetas/:titulo
    // ==========================================
    describe('GET /api/recetas/titulo', () => {

        // El endpoint usa /:titulo, así que sin título devuelve 404 (ruta no encontrada)
        test('Error 404 si falta el parámetro título', async () => {
            const res = await request(app).get('/api/recetas/');
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
        });

        test('Error 404 si la receta no existe', async () => {
            Receta.findOne.mockResolvedValue(null);
            const res = await request(app).get('/api/recetas/Inexistente');

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error', 'Receta no encontrada');
        });

        test('Escapa caracteres especiales en el título correctamente', async () => {
            Receta.findOne.mockResolvedValue({ title: '¿Pasta?' });
            const res = await request(app).get('/api/recetas/%3FPasta%3F'); // ¿Pasta? encodeado
            expect(res.status).toBe(200);
            expect(Receta.findOne).toHaveBeenCalledWith({
                title: expect.any(RegExp)
            });
        });

        test('Éxito: Devuelve el objeto completo de la receta', async () => {
            const mockReceta = { title: 'Pasta', ingredientes: [], instrucciones: 'Cocinar' };
            Receta.findOne.mockResolvedValue(mockReceta);

            const res = await request(app).get('/api/recetas/Pasta');

            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Pasta');
        });

        test('Manejo de error 500 en detalle', async () => {
            Receta.findOne.mockRejectedValue(new Error('DB fail'));
            const res = await request(app).get('/api/recetas/Pasta');

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error', 'Error interno del servidor');
        });
    });
});