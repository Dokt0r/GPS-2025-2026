const express = require('express');
const router = express.Router();
const InventarioItem = require('../models/InventarioItem');

// GET /api/inventario - obtener el inventario
router.get('/', async (req, res) => {
    try {
        const items = await InventarioItem.find();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// PUT /api/inventario - guardar el inventario completo
router.put('/', async (req, res) => {
    try {
        const { items } = req.body;

        // Borramos todo y volvemos a insertar
        await InventarioItem.deleteMany({});
        if (items && items.length > 0) {
            await InventarioItem.insertMany(items);
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el inventario' });
    }
});

module.exports = router;