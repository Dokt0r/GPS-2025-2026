const express = require('express');
const router = express.Router();
const Receta = require('../models/recetas');
const Usuario = require('../models/usuario');
const requireAuth = require('../middleware/auth');
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

        if (!queryStr) {
            console.log("❌ Error: Faltan ingredientes en la petición.");
            console.log("=======================================\n");
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        const ingredientesNeveraEstandar = estandarizarNevera(queryStr);
        // 2. Pasamos el array completo al Modelo
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
        // 2. Buscamos usando una Expresión Regular (Regex)
        // La 'i' final hace que la búsqueda sea case-insensitive (ignora mayúsculas/minúsculas)
        // El ^ y el $ aseguran que sea exactamente ese título y no solo una parte.
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

// ENDPOINT 3: Completar una receta y RESTAR ingredientes de la nevera del USUARIO

router.put('/completar', requireAuth, async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        // 1. Buscamos al usuario logueado y "populamos" las referencias de su nevera
        // para poder comparar por nombre fácilmente.
        const usuario = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');
        
        if (!usuario) {
            return res.status(401).json({ error: "Usuario no autenticado correctamente." });
        }

        // 2. Buscamos la receta que se va a completar
        const receta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada." });

        
        // Recorremos los ingredientes que el frontend nos dice que se han usado
        for (const ingUsado of ingredients) {
            
            // Buscamos si ese ingrediente existe en la nevera del usuario
            // Usamos una comparación segura (escaparRegex y toLowerCase)
            const itemEnNevera = usuario.nevera.find(item => 
                escaparRegex(item.ingrediente.nombre.toLowerCase()) === escaparRegex(ingUsado.nombre.toLowerCase()) &&
                item.unidad.toLowerCase() === ingUsado.unidad.toLowerCase()
            );

            // "Resta los que tenga, ignora los que no tenga"
            if (itemEnNevera) {
                // Restamos la cantidad asegurándonos de que no baje de 0
                itemEnNevera.cantidad = Math.max(0, itemEnNevera.cantidad - ingUsado.cantidad);
                
               
            }
            // Si itemEnNevera es null, el código simplemente sigue (ignora)
        }

       
        await usuario.save();

        // 4. Actualizamos los datos de la receta
        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;

        await receta.save();

        res.status(200).json({ success: true, mensaje: "Receta completada e ingredientes restados de tu nevera." }); 

    } catch (error) {
        console.error("Error al completar receta y restar ingredientes:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la operación." });
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