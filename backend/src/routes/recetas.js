const express = require('express');
const router = express.Router();
const Receta = require('../models/recetas');
const InventarioItem = require('../models/InventarioItem'); // Asegúrate de que la ruta sea correcta
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
        const queryStr = req.query.ingredientes;

        console.log("\n=======================================");
        console.log("📥 1. RAW QUERY DEL FRONTEND:", queryStr);

        if (!queryStr) {
            console.log("❌ Error: Faltan ingredientes en la petición.");
            console.log("=======================================\n");
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        const ingredientesNeveraEstandar = estandarizarNevera(queryStr);
        const recetasSugeridas = await Receta.buscarPorIngredientesYCantidades(ingredientesNeveraEstandar);

        res.json(recetasSugeridas);
    } catch (error) {
        console.error("Error buscando recetas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

router.get('/:titulo', async (req, res) => {
    try {
        const tituloReceta = decodeURIComponent(req.params.titulo).trim();
        
        if (!tituloReceta) return res.status(400).json({ error: "Falta el título en la URL" });

        const tituloSeguro = escaparRegex(tituloReceta);
        const recetaCompleta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!recetaCompleta) {
            return res.status(404).json({ error: "Receta no encontrada" });
        }

        res.json(recetaCompleta);
    } catch (error) {
        console.error("❌ Error interno al buscar detalles:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ENDPOINT 3: Completar una receta (Actualizar pasos e ingredientes)
/*router.put('/completar', async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        // 1. Buscamos la receta
        const receta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

        // 2. Actualizamos los datos
        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;

        // 3. Guardamos (Esto activa tu lógica de negocio LC-49)
        const recetaActualizada = await receta.save();

        res.json(recetaActualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});*/
// ENDPOINT 3: Completar una receta y RESTAR ingredientes del inventario
router.put('/completar', async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        // 1. Buscamos la receta
        const receta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

        // 2. LÓGICA DE RESTA: Recorremos los ingredientes que nos envía el frontend
        // Usamos for...of para poder usar 'await' dentro del bucle
        for (const ing of ingredients) {
            // Buscamos el ingrediente en la colección 'inventario'
            const itemEnInventario = await InventarioItem.findOne({
                nombre: { $regex: new RegExp(`^${escaparRegex(ing.nombre)}$`, 'i') }
            });

            // "Resta los que tenga, ignora los que no tenga"
            if (itemEnInventario) {
                // Restamos la cantidad asegurándonos de que no baje de 0
                itemEnInventario.cantidad = Math.max(0, itemEnInventario.cantidad - ing.cantidad);
                await itemEnInventario.save();
            }
            // Si itemEnInventario es null, el código simplemente sigue al siguiente (ignora)
        }

        // 3. Actualizamos los datos de la receta
        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;

        await receta.save();

        // 4. "Eliminar el mensaje": Respondemos con éxito pero sin textos de alerta
        res.status(200).json({ success: true }); 

    } catch (error) {
        // En caso de error, enviamos un estado 400 pero minimalista
        res.status(400).send();
    }
});

// ENDPOINT 4: Eliminar un ingrediente de una receta
router.delete('/ingrediente', async (req, res) => {
    try {
        const { titulo, nombreIngrediente } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        const receta = await Receta.findOneAndUpdate(
            { title: new RegExp('^' + tituloSeguro + '$', 'i') },
            { $pull: { ingredients: { nombre: nombreIngrediente } } }, 
            { returnDocument: 'after' } // Fix del Warning de Mongoose
        );

        if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

        res.json(receta);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar ingrediente" });
    }
});

module.exports = router;