const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

jest.setTimeout(30000);

const recetasTest = [
    {
        title: "TEST_Arroz con Leche",
        ingredients: [
            { nombre: "Arroz", cantidad: 100, unidad: "g" },
            { nombre: "Leche", cantidad: 200, unidad: "ml" }
        ],
        image_url: "https://via.placeholder.com/150",
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

const titulosBase = new Set(recetasTest.map(r => r.title));

beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    // Limpiamos TODO lo que diga isTest antes de empezar CUALQUIER test
    await Receta.deleteMany({ isTest: true });
    await Receta.insertMany(recetasTest);
});

afterEach(async () => {
    // Borra solo los documentos creados dentro de cada test individual,
    // preservando el set base del beforeAll
    await Receta.deleteMany({
        isTest: true,
        title: { $nin: Array.from(titulosBase) }
    });
});

afterAll(async () => {
    try {
        // 1. Forzamos el borrado de TODO lo que tenga isTest: true
        const resultado = await Receta.deleteMany({ isTest: true });
        console.log(`Limpieza final: ${resultado.deletedCount} recetas de test eliminadas.`);
    } catch (error) {
        console.error("Error limpiando la base de datos tras los tests:", error);
    } finally {
        // 2. Cerramos la conexión SOLO después de intentar borrar
        await mongoose.connection.close();
    }
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

    test('Límite: Encuentra la receta si tengo la cantidad EXACTA requerida', async () => {
        await Receta.create({
            title: "TEST_Receta_Exacta",
            ingredients: [{ nombre: "Cuscús", cantidad: 225, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Cuscús|225|g|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Receta_Exacta");
    });

    test('NO devuelve la receta si el usuario tiene cantidad INSUFICIENTE del ingrediente', async () => {
        await Receta.create({
            title: "TEST_Receta_Mucha_Harina",
            ingredients: [{ nombre: "Harina", cantidad: 1000, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Harina|200|g|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).not.toContain("TEST_Receta_Mucha_Harina");
    });

    test('"Arroz" (genérico) encuentra "Arroz Integral" (específico)', async () => {
        await Receta.create({
            title: "TEST_Bowl Saludable",
            ingredients: [{ nombre: "Arroz integral", cantidad: 100, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Arroz|500|g|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Bowl Saludable");
    });

    test('"Arroz Integral" (específico) NO encuentra una receta que pida "Arroz Bomba"', async () => {
        await Receta.create({
            title: "TEST_Paella Valenciana",
            ingredients: [{ nombre: "Arroz bomba", cantidad: 400, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Arroz integral|500|g|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).not.toContain("TEST_Paella Valenciana");
    });

    test('"Arroz Integral" (específico) en nevera encuentra "Arroz" (genérico) en receta', async () => {
        await Receta.create({
            title: "TEST_Arroz Blanco Basico",
            ingredients: [{ nombre: "Arroz", cantidad: 200, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Arroz integral|500|g|1');

        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Arroz Blanco Basico");
    });

    test('Conversión de masa: 1 kg en nevera cubre una receta de 200 g', async () => {
        await Receta.create({
            title: "TEST_Receta_Solida",
            ingredients: [{ nombre: "Harina", cantidad: 200, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Harina|1|kg|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Receta_Solida");
    });

    test('Conversión de volumen: 1 L en nevera cubre una receta de 200 ml', async () => {
        await Receta.create({
            title: "TEST_Receta_Liquida",
            ingredients: [{ nombre: "Leche", cantidad: 200, unidad: "ml" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const res = await request(app).get('/api/recetas?ingredientes=Leche|1|L|');

        const titulos = res.body.map(r => r.title);
        expect(titulos).toContain("TEST_Receta_Liquida");
    });

    test('kg y g equivalentes devuelven los mismos resultados', async () => {
        const conKg = await request(app).get('/api/recetas?ingredientes=Harina|0.5|kg|');
        const conG = await request(app).get('/api/recetas?ingredientes=Harina|500|g|');

        const titulosKg = conKg.body.map(r => r.title).filter(t => t.startsWith("TEST_"));
        const titulosG = conG.body.map(r => r.title).filter(t => t.startsWith("TEST_"));

        expect(titulosKg).toEqual(titulosG);
    });

    test('L y ml equivalentes devuelven los mismos resultados', async () => {
        const conL = await request(app).get('/api/recetas?ingredientes=Leche|0.5|L|');
        const conMl = await request(app).get('/api/recetas?ingredientes=Leche|500|ml|');

        const titulosL = conL.body.map(r => r.title).filter(t => t.startsWith("TEST_"));
        const titulosMl = conMl.body.map(r => r.title).filter(t => t.startsWith("TEST_"));

        expect(titulosL).toEqual(titulosMl);
    });

    test('El factor de conversión (equivalencia_g_ml) transforma correctamente ud a g', async () => {
        await Receta.create({
            title: "TEST_Receta_Conversion",
            ingredients: [{ nombre: "Huevo", cantidad: 120, unidad: "g" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const resSuficiente = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|60');
        const titulosSuficiente = resSuficiente.body.map(r => r.title);
        expect(titulosSuficiente).toContain("TEST_Receta_Conversion");

        const resInsuficiente = await request(app).get('/api/recetas?ingredientes=Huevo|2|ud|40');
        const titulosInsuficiente = resInsuficiente.body.map(r => r.title);
        expect(titulosInsuficiente).not.toContain("TEST_Receta_Conversion");
    });

    test('Receta con ingrediente parcial aparece con coincidenciaTexto correcto', async () => {
        await Receta.create({
            title: "TEST_Tortilla_Completa",
            ingredients: [
                { nombre: "Huevo", cantidad: 3, unidad: "ud" },
                { nombre: "Patata", cantidad: 300, unidad: "g" },
                { nombre: "Aceite", cantidad: 50, unidad: "ml" }
            ],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        // Solo tenemos Huevo y Patata — falta Aceite
        const res = await request(app)
            .get('/api/recetas?ingredientes=Huevo|3|ud|60,Patata|500|g|');

        const receta = res.body.find(r => r.title === "TEST_Tortilla_Completa");

        expect(receta).toBeDefined();
        expect(receta.coincidenciaTexto).toBe("2/3");
    });

    test('Las unidades en mayúsculas funcionan igual que en minúsculas', async () => {
        await Receta.create({
            title: "TEST_Receta_Case_Unidad",
            ingredients: [{ nombre: "Leche", cantidad: 100, unidad: "ml" }],
            image_url: "https://via.placeholder.com/150",
            isTest: true
        });

        const resMayus = await request(app).get('/api/recetas?ingredientes=Leche|200|ML|');
        const resMinus = await request(app).get('/api/recetas?ingredientes=Leche|200|ml|');

        expect(resMayus.body.map(r => r.title)).toContain("TEST_Receta_Case_Unidad");
        expect(
            resMayus.body.map(r => r.title).filter(t => t.startsWith("TEST_")).sort()
        ).toEqual(
            resMinus.body.map(r => r.title).filter(t => t.startsWith("TEST_")).sort()
        );
    });

    test('Ordena las recetas por número de coincidencias descendente', async () => {
        const res = await request(app)
            .get('/api/recetas?ingredientes=Arroz|200|g|,Leche|500|ml|');

        const titulos = res.body.map(r => r.title);
        const indexArroz = titulos.indexOf("TEST_Arroz con Leche");
        const indexBatido = titulos.indexOf("TEST_Batido de Proteina");

        expect(indexArroz).toBeLessThan(indexBatido);
    });

    test('Resultados con el mismo porcentaje están ordenados alfabéticamente', async () => {
        await Receta.insertMany([
            {
                title: "TEST_B_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }],
                image_url: "https://via.placeholder.com/150",
                isTest: true
            },
            {
                title: "TEST_A_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }],
                image_url: "https://via.placeholder.com/150",
                isTest: true
            }
        ]);

        const res = await request(app).get('/api/recetas?ingredientes=Sal|10|g|');

        const titulosTest = res.body
            .map(r => r.title)
            .filter(t => t.startsWith("TEST_"));

        const indexA = titulosTest.indexOf("TEST_A_Receta");
        const indexB = titulosTest.indexOf("TEST_B_Receta");

        expect(indexA).not.toBe(-1);
        expect(indexB).not.toBe(-1);
        expect(indexA).toBeLessThan(indexB);
    });
});