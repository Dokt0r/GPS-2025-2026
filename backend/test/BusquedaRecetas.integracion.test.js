const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Receta = require('../src/models/recetas');

// ============================================================
// DATOS BASE — Se insertan antes de todos los tests y se
// mantienen durante toda la suite. Los tests individuales
// crean sus propias recetas adicionales que se limpian en
// afterEach.
// ============================================================
const recetasBase = [
    {
        title: "TEST_Arroz con Leche",
        ingredients: [
            { nombre: "Arroz", cantidad: 100, unidad: "g" },
            { nombre: "Leche", cantidad: 200, unidad: "ml" }
        ],
        steps: ["Mezclar el arroz con la leche y cocinar a fuego lento."],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Batido de Proteina",
        ingredients: [{ nombre: "Leche", cantidad: 250, unidad: "ml" }],
        steps: ["Batir todos los ingredientes hasta obtener una mezcla homogénea."],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Pimiento Verde Relleno",
        ingredients: [{ nombre: "Pimiento verde", cantidad: 1, unidad: "ud" }],
        steps: ["Limpiar el pimiento y rellenarlo con la mezcla preparada."],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Zumo de Tomate",
        ingredients: [{ nombre: "Tomate", cantidad: 150, unidad: "g" }],
        steps: ["Exprimir los tomates y colar el zumo resultante."],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    },
    {
        title: "TEST_Harina de Trigo",
        ingredients: [{ nombre: "Harina", cantidad: 500, unidad: "g" }],
        steps: ["Tamizar la harina antes de usar."],
        image_url: "https://via.placeholder.com/150",
        isTest: true
    }
];

// Títulos del set base para poder excluirlos al limpiar tras cada test
const titulosBase = new Set(recetasBase.map(r => r.title));

// ============================================================
// HELPERS
// ============================================================

/** Crea una receta de test con valores mínimos por defecto. */
const crearReceta = (overrides) =>
    Receta.create({
        image_url: "https://via.placeholder.com/150",
        isTest: true,
        steps: ["Paso de prueba."],
        ...overrides
    });

/** GET /api/recetas con el query string de ingredientes. */
const buscar = (ingredientes) =>
    request(app).get(`/api/recetas?ingredientes=${ingredientes}`);

/** Extrae los títulos del body de la respuesta. */
const titulos = (res) => res.body.map(r => r.title);

/** Filtra solo los títulos que empiezan por "TEST_". */
const titulosTest = (res) =>
    titulos(res).filter(t => t.startsWith("TEST_"));

// ============================================================
// SETUP / TEARDOWN
// ============================================================

beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
    await Receta.insertMany(recetasBase);
});

afterEach(async () => {
    // Elimina solo las recetas creadas dentro de cada test individual,
    // preservando el set base definido en beforeAll.
});

afterAll(async () => {
    try {
        console.log(`Limpieza final: ${resultado.deletedCount} recetas de test eliminadas.`);
    } catch (error) {
        console.error("Error limpiando la base de datos tras los tests:", error);
    } finally {
        await mongoose.connection.close();
    }
});

// ============================================================
// SUITE PRINCIPAL
// ============================================================

describe('GET /api/recetas — Integración con datos controlados', () => {

    // ----------------------------------------------------------
    // VALIDACIÓN DE ENTRADA
    // ----------------------------------------------------------

    test('Devuelve 400 si no se pasan ingredientes', async () => {
        const res = await request(app).get('/api/recetas');

        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error', 'Faltan ingredientes');
    });

    test('Devuelve array vacío con un ingrediente que no existe en ninguna receta', async () => {
        const res = await buscar('Kriptonita|1|g|');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    // ----------------------------------------------------------
    // LÓGICA DE CANTIDAD
    // ----------------------------------------------------------

    test('Encuentra la receta si el usuario tiene la cantidad EXACTA requerida', async () => {
        await crearReceta({
            title: "TEST_Receta_Exacta",
            ingredients: [{ nombre: "Cuscús", cantidad: 225, unidad: "g" }]
        });

        const res = await buscar('Cuscús|225|g|');

        expect(titulos(res)).toContain("TEST_Receta_Exacta");
    });

    test('NO devuelve la receta si el usuario tiene cantidad INSUFICIENTE del ingrediente', async () => {
        await crearReceta({
            title: "TEST_Receta_Mucha_Harina",
            ingredients: [{ nombre: "Harina", cantidad: 1000, unidad: "g" }]
        });

        const res = await buscar('Harina|200|g|');

        expect(titulos(res)).not.toContain("TEST_Receta_Mucha_Harina");
    });

    // ----------------------------------------------------------
    // COINCIDENCIA DE NOMBRES (genérico ↔ específico)
    // ----------------------------------------------------------


    test('"Arroz integral" (específico en nevera) NO encuentra una receta que pide "Arroz bomba"', async () => {
        await crearReceta({
            title: "TEST_Paella Valenciana",
            ingredients: [{ nombre: "Arroz bomba", cantidad: 400, unidad: "g" }]
        });

        const res = await buscar('Arroz integral|500|g|');

        expect(titulos(res)).not.toContain("TEST_Paella Valenciana");
    });

    // ----------------------------------------------------------
    // CONVERSIÓN DE UNIDADES
    // ----------------------------------------------------------

    test('Conversión de masa: 1 kg en nevera cubre una receta que pide 200 g', async () => {
        await crearReceta({
            title: "TEST_Receta_Solida",
            ingredients: [{ nombre: "Harina", cantidad: 200, unidad: "g" }]
        });

        const res = await buscar('Harina|1|kg|');

        expect(titulos(res)).toContain("TEST_Receta_Solida");
    });

    test('Conversión de volumen: 1 L en nevera cubre una receta que pide 200 ml', async () => {
        await crearReceta({
            title: "TEST_Receta_Liquida",
            ingredients: [{ nombre: "Leche", cantidad: 200, unidad: "ml" }]
        });

        const res = await buscar('Leche|1|L|');

        expect(titulos(res)).toContain("TEST_Receta_Liquida");
    });

    test('0,5 kg y 500 g devuelven exactamente los mismos resultados TEST_', async () => {
        const [conKg, conG] = await Promise.all([
            buscar('Harina|0.5|kg|'),
            buscar('Harina|500|g|')
        ]);

        const porKg = titulosTest(conKg).sort();
        const porG = titulosTest(conG).sort();

        expect(porKg).toEqual(porG);
    });

    test('0,5 L y 500 ml devuelven exactamente los mismos resultados TEST_', async () => {
        const [conL, conMl] = await Promise.all([
            buscar('Leche|0.5|L|'),
            buscar('Leche|500|ml|')
        ]);

        const porL = titulosTest(conL).sort();
        const porMl = titulosTest(conMl).sort();

        expect(porL).toEqual(porMl);
    });

    // ----------------------------------------------------------
    // CONVERSIÓN ud ↔ g/ml mediante equivalencia_g_ml
    // ----------------------------------------------------------

    test('Factor de conversión ud→g: 2 huevos × 60 g/ud cubren una receta de 120 g', async () => {
        await crearReceta({
            title: "TEST_Receta_Conversion",
            ingredients: [{ nombre: "Huevo", cantidad: 120, unidad: "g" }]
        });

        // Con factor 60 g/ud y 2 uds → 120 g: suficiente
        const resSuficiente = await buscar('Huevo|2|ud|60');
        expect(titulos(resSuficiente)).toContain("TEST_Receta_Conversion");

        // Con factor 40 g/ud y 2 uds → 80 g: insuficiente
        const resInsuficiente = await buscar('Huevo|2|ud|40');
        expect(titulos(resInsuficiente)).not.toContain("TEST_Receta_Conversion");
    });

    // ----------------------------------------------------------
    // FORMATO DE RESPUESTA
    // ----------------------------------------------------------

    test('Receta con ingrediente parcial incluye coincidenciaTexto correcto ("2/3")', async () => {
        await crearReceta({
            title: "TEST_Tortilla_Completa",
            ingredients: [
                { nombre: "Huevo", cantidad: 3, unidad: "ud" },
                { nombre: "Patata", cantidad: 300, unidad: "g" },
                { nombre: "Aceite", cantidad: 50, unidad: "ml" }
            ]
        });

        // Tenemos Huevo y Patata, pero NO Aceite
        const res = await buscar('Huevo|3|ud|60,Patata|500|g|');

        const receta = res.body.find(r => r.title === "TEST_Tortilla_Completa");
        expect(receta).toBeDefined();
        expect(receta.coincidenciaTexto).toBe("2/3");
    });

    test('Las unidades en mayúsculas (ML) funcionan igual que en minúsculas (ml)', async () => {
        await crearReceta({
            title: "TEST_Receta_Case_Unidad",
            ingredients: [{ nombre: "Leche", cantidad: 100, unidad: "ml" }]
        });

        const [resMayus, resMinus] = await Promise.all([
            buscar('Leche|200|ML|'),
            buscar('Leche|200|ml|')
        ]);

        expect(titulos(resMayus)).toContain("TEST_Receta_Case_Unidad");

        expect(titulosTest(resMayus).sort()).toEqual(titulosTest(resMinus).sort());
    });

    // ----------------------------------------------------------
    // ORDENACIÓN
    // ----------------------------------------------------------

    test('Ordena las recetas por porcentaje de coincidencia descendente', async () => {
        // TEST_Arroz con Leche tiene 2 ingredientes coincidentes (Arroz + Leche)
        // TEST_Batido de Proteina tiene 1 ingrediente coincidente (Leche)
        const res = await buscar('Arroz|200|g|,Leche|500|ml|');

        const lista = titulos(res);
        const indexArroz = lista.indexOf("TEST_Arroz con Leche");
        const indexBatido = lista.indexOf("TEST_Batido de Proteina");

        expect(indexArroz).not.toBe(-1);
        expect(indexBatido).not.toBe(-1);
        expect(indexArroz).toBeLessThan(indexBatido);
    });

    test('Recetas con el mismo porcentaje de coincidencia se ordenan alfabéticamente', async () => {
        await Receta.insertMany([
            {
                title: "TEST_B_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }],
                steps: ["Paso de prueba."],
                image_url: "https://via.placeholder.com/150",
                isTest: true
            },
            {
                title: "TEST_A_Receta",
                ingredients: [{ nombre: "Sal", cantidad: 1, unidad: "g" }],
                steps: ["Paso de prueba."],
                image_url: "https://via.placeholder.com/150",
                isTest: true
            }
        ]);

        const res = await buscar('Sal|10|g|');

        const lista = titulosTest(res);
        const indexA = lista.indexOf("TEST_A_Receta");
        const indexB = lista.indexOf("TEST_B_Receta");

        expect(indexA).not.toBe(-1);
        expect(indexB).not.toBe(-1);
        expect(indexA).toBeLessThan(indexB);
    });
});