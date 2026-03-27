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

const escaparRegex = (texto) => {
    return texto.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
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
// ENDPOINT 2: Obtener el detalle completo de una receta por su título
// Cambiamos '/detalle' por '/:titulo' para capturar la variable directamente de la URL
router.get('/:titulo', async (req, res) => {
    try {
        // 1. Usamos req.params en lugar de req.query
        // Y decodificamos por si vienen espacios como %20
        const tituloReceta = decodeURIComponent(req.params.titulo).trim();
        
        if (!tituloReceta) return res.status(400).json({ error: "Falta el título en la URL" });

        console.log(`\n🔍 Buscando detalles de la receta: "${tituloReceta}"`);
        const tituloSeguro = escaparRegex(tituloReceta);
        // 2. Buscamos usando una Expresión Regular (Regex)
        // La 'i' final hace que la búsqueda sea case-insensitive (ignora mayúsculas/minúsculas)
        // El ^ y el $ aseguran que sea exactamente ese título y no solo una parte.
        const recetaCompleta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!recetaCompleta) {
            console.log(`❌ No se encontró: "${tituloSeguro}"`);
            return res.status(404).json({ error: "Receta no encontrada" });
        }

        console.log(`✅ Detalles enviados correctamente.`);
        res.json(recetaCompleta);
        
    } catch (error) {
        console.error("❌ Error interno al buscar detalles:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});
// ENDPOINT 3: Completar una receta (Actualizar pasos e ingredientes)
router.put('/completar', async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;

        // Buscamos y actualizamos. {new: true} devuelve la receta ya cambiada
        // Aquí es donde saltarán las validaciones que pusimos en el Modelo (LC-49)
        const recetaActualizada = await Receta.findOneAndUpdate(
            { title: new RegExp('^' + escaparRegex(titulo) + '$', 'i') },
            { $set: { steps, ingredients, isCompleted: true } },
            { new: true, runValidators: true } 
        );

        if (!recetaActualizada) return res.status(404).json({ error: "Receta no encontrada" });

        res.json(recetaActualizada);
    } catch (error) {
        // Si falla la validación del modelo (ej: cantidad 0), enviamos error 400
        res.status(400).json({ error: error.message });
    }
});

// ENDPOINT 4: Eliminar un ingrediente de una receta
router.delete('/ingrediente', async (req, res) => {
    try {
        const { titulo, nombreIngrediente } = req.body;

        const receta = await Receta.findOneAndUpdate(
            { title: new RegExp('^' + escaparRegex(titulo) + '$', 'i') },
            { $pull: { ingredients: { nombre: nombreIngrediente } } }, // $pull borra del array
            { new: true }
        );

        if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

        res.json(receta);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar ingrediente" });
    }
});
module.exports = router;