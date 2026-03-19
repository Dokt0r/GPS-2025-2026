const express = require('express');
const router = express.Router();
const Receta = require('../models/Receta'); 

// Función para estandarizar lo que viene del frontend a g, ml o ud
const estandarizarNevera = (queryStr) => {
    const items = queryStr.split(',');
    return items.map(item => {
        let [nombre, cantidad, unidad] = item.split(':');
        cantidad = parseFloat(cantidad);
        unidad = unidad.toLowerCase();

        // Conversiones clave
        if (unidad === 'kg') { cantidad *= 1000; unidad = 'g'; }
        else if (unidad === 'l' || unidad === 'litro' || unidad === 'litros') { cantidad *= 1000; unidad = 'ml'; }
        else if (unidad === 'cucharada') { cantidad *= 15; }
        else if (unidad === 'cucharadita') { cantidad *= 5; }

        return { nombre: nombre.trim(), cantidad, unidad };
    });
};

router.get('/', async (req, res) => {
    try {
        if (!req.query.ingredientes) {
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        // 1. Convertimos el string a un array de objetos listos para comparar
        // Ej: [{ nombre: "harina", cantidad: 1000, unidad: "g" }, ...]
        const ingredientesNeveraEstandar = estandarizarNevera(req.query.ingredientes);

        // 2. Pasamos el array completo al Modelo
        const recetasSugeridas = await Receta.buscarPorIngredientesYCantidades(ingredientesNeveraEstandar);

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