const express = require('express');
const router = express.Router();
const Ingrediente = require('../models/ingredientes');

// GET /api/ingredientes?nombre=arroz
router.get('/', async (req, res) => {
    try {
        const { nombre } = req.query;
        if (!nombre) {
            const ingredientes = await Ingrediente.find({}).limit(40);
            return res.json(ingredientes);
        }

        const busqueda = nombre.toLowerCase();

        // Aumentamos el límite a 100 para asegurar que el "Pollo" esté en el set de datos
        const ingredientes = await Ingrediente.find({
            nombre: { $regex: busqueda, $options: 'i' }
        }).limit(100);

        const ordenados = ingredientes.sort((a, b) => {
            const nA = a.nombre.toLowerCase();
            const nB = b.nombre.toLowerCase();

            // 1. Prioridad Máxima: Empieza exactamente con la búsqueda
            const empiezaA = nA.startsWith(busqueda);
            const empiezaB = nB.startsWith(busqueda);

            if (empiezaA && !empiezaB) return -1;
            if (!empiezaA && empiezaB) return 1;

            // 2. Si ambos empiezan igual, el más corto primero (Pollo vs Pollo asado)
            if (empiezaA && empiezaB) {
                return nA.length - nB.length;
            }

            // 3. Prioridad por posición de la palabra
            const posA = nA.indexOf(busqueda);
            const posB = nB.indexOf(busqueda);
            if (posA !== posB) return posA - posB;

            return nA.localeCompare(nB);
        });

        // Ahora que están ordenados, devolvemos solo los 15 mejores
        res.json(ordenados.slice(0, 15));
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar ingredientes' });
    }
});

module.exports = router;