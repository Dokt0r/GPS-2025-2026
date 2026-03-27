const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

jest.setTimeout(30000);

const recetasTest = [
    {
        title: "TEST_Arroz con Leche",
        // Cambiado: nombre y cantidad (según tu error de validación)
        ingredients: [
            { nombre: "Arroz", cantidad: 100, unidad: "g" },
            { nombre: "Leche", cantidad: 200, unidad: "ml" }
        ],
        image_url: "https://via.placeholder.com/150", // Campo obligatorio añadido
        isTest: true
    },
    {
        title: "TEST_Batido de Proteina",
        ingredients: [{ nombre: "Leche", cantidad: 250, unidad: "ml" }],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Pimiento Verde Relleno",
        ingredients: [{ nombre: "Pimiento verde", cantidad: 1, unidad: "ud" }],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Zumo de Tomate",
        ingredients: [{ nombre: "Tomate", cantidad: 150, unidad: "g" }],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Harina de Trigo",
        ingredients: [{ nombre: "Harina", cantidad: 500, unidad: "g" }],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    }
];

beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    // Limpiamos solo residuos de tests anteriores
    await Receta.deleteMany({ isTest: true });
    // Insertamos el set controlado
    await Receta.insertMany(recetasTest);
});

afterAll(async () => {
    // Limpieza selectiva para no tocar producción
    await Receta.deleteMany({ isTest: true });
    await mongoose.disconnect();
});

describe('GET /api/recetas - Integración con datos controlados', () => {

    test('Devuelve 400 si no se pasan ingredientes', async () => {
        const res = await request(app).get('/api/recetas');
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
    });

    test('Devuelve array vacío con ingrediente inexistente', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=Kriptonita|1|g|');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    test('"pimiento" (genérico) encuentra "pimiento verde" (específico)', async () => {
        const res = await request(app).get('/api/recetas?ingredientes=pimiento|1|ud|');
        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Pimiento Verde Relleno");
    });

    // NUEVO TEST 1: El ingrediente específico NO debe encontrar el genérico
    test('"pimiento verde" (específico) NO encuentra una receta que pida solo "pimiento"', async () => {
        await Receta.create({
            title: "TEST_Receta Generica",
            ingredients: [{ nombre: "Pimiento", cantidad: 1, unidad: "ud" }], // Corregido aquí también
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=pimiento verde|1|ud|');
        const titulos = res.body.map(r => r.title);
        expect(titulos).not.toContain("TEST_Receta Generica");
    });

    test('kg y g equivalentes devuelven los mismos resultados', async () => {
        const conKg = await request(app).get('/api/recetas?ingredientes=Harina|0.5|kg|');
        const conG = await request(app).get('/api/recetas?ingredientes=Harina|500|g|');

        const titulosKg = conKg.body.map(r => r.title).filter(t => t.startsWith("TEST_"));
        const titulosG = conG.body.map(r => r.title).filter(t => t.startsWith("TEST_"));

        expect(titulosKg).toEqual(titulosG);
    });

    test('Equivalencia ud a g funciona correctamente', async () => {
        const conUd = await request(app).get('/api/recetas?ingredientes=Tomate|1|ud|150');
        const conG = await request(app).get('/api/recetas?ingredientes=Tomate|150|g|');

        const tUd = conUd.body.map(r => r.title).filter(t => t.startsWith("TEST_"));
        const tG = conG.body.map(r => r.title).filter(t => t.startsWith("TEST_"));

        expect(tUd).toEqual(tG);
    });

    test('El factor de conversión (equivalencia_g_ml) transforma correctamente ud a g', async () => {
        // 1. Creamos una receta que pide 120g de un ingrediente
        await Receta.create({
            title: "TEST_Receta_Conversion",
            ingredients: [{ nombre: "Huevo", cantidad: 120, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        // 2. CASO A: Enviamos 2 unidades con un factor de 60 (2 * 60 = 120g) -> DEBE ENCONTRARLA
        const resSuficiente = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|60');
        const titulosSuficiente = resSuficiente.body.map(r => r.title);
        expect(titulosSuficiente).toContain("TEST_Receta_Conversion");

        // 3. CASO B: Enviamos 2 unidades pero con un factor de 40 (2 * 40 = 80g) -> NO DEBE ENCONTRARLA
        const resInsuficiente = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|40');
        const titulosInsuficiente = resInsuficiente.body.map(r => r.title);
        expect(titulosInsuficiente).not.toContain("TEST_Receta_Conversion");
    });

    // NUEVO TEST 2: Ordenar según Match (Coincidencias)
    test('Ordena las recetas por número de coincidencias descendente', async () => {
        // "Arroz con Leche" tiene 2 ingredientes. "Batido" tiene 1.
        // Si mando Leche y Arroz, "Arroz con leche" es 2/2 (100%) y "Batido" es 1/1 (100%).
        // Pero si mando Arroz, Leche y Sal...
        const res = await request(app).get('/api/recetas?ingredientes=Arroz|200|g|,Leche|500|ml|');

        const titulos = res.body.map(r => r.title);
        const indexArroz = titulos.indexOf("TEST_Arroz con Leche");
        const indexBatido = titulos.indexOf("TEST_Batido de Proteina");

        // "Arroz con leche" debería estar arriba porque machea 2 ingredientes de la receta
        // mientras que batido solo machea 1.
        expect(indexArroz).toBeLessThan(indexBatido);
    });
    //NUEVO TEST 3: Orden alfabético en caso de empate en porcentaje
    test('Resultados con el mismo porcentaje están ordenados alfabéticamente', async () => {
        // Insertamos dos recetas que empatarán en 1/1
        await Receta.insertMany([
            {
                title: "TEST_B_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }], // nombre y cantidad
                image_url: "https://via.placeholder.com/150",             // image_url añadida
                isTest: true
            },
            {
                title: "TEST_A_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }], // nombre y cantidad
                image_url: "https://via.placeholder.com/150",             // image_url añadida
                isTest: true
            }
        ]);

        const res = await request(app).get('/api/recetas?ingredientes=Sal|10|g|');

        // Filtramos solo las de test para no interferir con datos reales de tu Atlas
        const titulosTest = res.body
            .map(r => r.title)
            .filter(t => t.startsWith("TEST_"));

        const indexA = titulosTest.indexOf("TEST_A_Receta");
        const indexB = titulosTest.indexOf("TEST_B_Receta");

        // Verificamos que existen en la respuesta
        expect(indexA).not.toBe(-1);
        expect(indexB).not.toBe(-1);

        // TEST_A_Receta debe estar antes que TEST_B_Receta (Orden A-Z)
        expect(indexA).toBeLessThan(indexB);
    });
});