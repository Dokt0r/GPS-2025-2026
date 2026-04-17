const express = require('express');
const router = express.Router();
const InventarioItem = require('../models/InventarioItem');
const auth = require('../middleware/auth');

router.use(auth);

// GET /api/inventario - obtener el inventario
router.get('/', async (req, res) => {
    try {
        const items = await InventarioItem.find({ usuario: req.usuario.id }).sort({ nombre: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// PUT /api/inventario - guardar el inventario completo
router.put('/', async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'El campo items debe ser un array.' });
        }

        const usuarioId = req.usuario.id;
        const itemsNormalizados = items.map((item) => ({
            usuario: usuarioId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            unidad: item.unidad
        }));

        // Borramos todo y volvemos a insertar
        await InventarioItem.deleteMany({ usuario: usuarioId });
        if (itemsNormalizados.length > 0) {
            await InventarioItem.insertMany(itemsNormalizados);
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar el inventario' });
    }
});

module.exports = router;