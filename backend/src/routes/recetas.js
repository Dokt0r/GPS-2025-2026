const express = require('express');
const router = express.Router();
const Receta = require('../models/recetas');

// Función para estandarizar lo que viene del frontend a g, ml o ud de forma SEGURA
const estandarizarNevera = (queryStr) => {
    if (!queryStr) return [];

    const items = queryStr.split(',');
    return items.map(item => {
        // separar por | en vez de :
        let [nombre = "", cantidad = "1", unidad = "", equivalencia = ""] = item.split('|');

        cantidad = parseFloat(cantidad) || 1;
        unidad = unidad.toLowerCase().trim();
        const equivalencia_g_ml = parseFloat(equivalencia) || null;

        if (unidad === 'kg') { cantidad *= 1000; unidad = 'g'; }
        else if (['l', 'litro', 'litros'].includes(unidad)) { cantidad *= 1000; unidad = 'ml'; }
        else if (unidad === 'cucharada') { cantidad *= 15; unidad = 'g'; }
        else if (unidad === 'cucharadita') { cantidad *= 5; unidad = 'g'; }
        else if (['u.', 'u', 'uds', 'unidad'].includes(unidad)) { unidad = 'ud'; }

        return { nombre: nombre.trim(), cantidad, unidad, equivalencia_g_ml };
    });
};

router.get('/', async (req, res) => {
    try {
        // CORRECCIÓN: Primero capturamos lo que viene de la URL
        const queryStr = req.query.ingredientes;

        console.log("\n=======================================");
        console.log("📥 1. RAW QUERY DEL FRONTEND:", queryStr);

        if (!queryStr) {
            console.log("❌ Error: Faltan ingredientes en la petición.");
            console.log("=======================================\n");
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        // 1. Convertimos el string a un array de objetos listos para comparar
        const ingredientesNeveraEstandar = estandarizarNevera(queryStr);

        console.log("🧠 2. INGREDIENTES PROCESADOS PARA MONGO:");
        console.log(JSON.stringify(ingredientesNeveraEstandar, null, 2));
        console.log("🚀 3. Buscando en la base de datos...");

        // 2. Pasamos el array completo al Modelo
        const recetasSugeridas = await Receta.buscarPorIngredientesYCantidades(ingredientesNeveraEstandar);

        // 3. Imprimimos el resultado de la búsqueda
        console.log(`✅ 4. RESULTADO: Mongo encontró ${recetasSugeridas.length} recetas.`);
        if (recetasSugeridas.length > 0) {
            console.log(`   (Ejemplo de la primera: "${recetasSugeridas[0].title}")`);
        }
        console.log("=======================================\n");

        res.json(recetasSugeridas);
    } catch (error) {
        console.error("Error buscando recetas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
// ENDPOINT 2: Obtener el detalle completo de una receta
router.get('/detalle', async (req, res) => {
    try {
        const tituloReceta = req.query.titulo;
        if (!tituloReceta) return res.status(400).json({ error: "Falta el título" });

        const recetaCompleta = await Receta.findOne({ title: tituloReceta });
        if (!recetaCompleta) return res.status(404).json({ error: "Receta no encontrada" });

        res.json(recetaCompleta);
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;