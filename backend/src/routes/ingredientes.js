const express = require('express');
const router = express.Router();
const Ingrediente = require('../models/ingredientes');

// GET /api/ingredientes?nombre=ace
router.get('/', async (req, res) => {
    try {
        const { nombre } = req.query;
        const filtro = nombre
            ? { nombre: { $regex: nombre, $options: 'i' } }
            : {};

        const ingredientes = await Ingrediente.find(filtro).limit(nombre ? 20 : 0);
        res.json(ingredientes);
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar ingredientes' });
    }
});

module.exports = router;