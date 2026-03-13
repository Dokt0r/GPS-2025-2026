const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const InventarioItem = require('./models/InventarioItem');

const app = express();
let inventarioMemoria = [];

const ingredientesBase = [
    { nombre: 'Pollo', categoria: 'Proteína' },
    { nombre: 'Tomate', categoria: 'Vegetal' },
    { nombre: 'Arroz', categoria: 'Cereales' },
    { nombre: 'Leche', categoria: 'Lácteo' },
    { nombre: 'Huevo', categoria: 'Proteína' },
    { nombre: 'Panceta', categoria: 'Proteína' }
];

app.use(cors());
app.use(express.json());

const connectMongo = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        return;
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ Conexión a MongoDB Atlas establecida');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB Atlas:', error.message);
    }
};

connectMongo();

app.get('/api/health', (req, res) => {
    res.json({ ok: true, mongo: mongoose.connection.readyState === 1 });
});

app.get('/api/ingredientes', (req, res) => {
    res.json(ingredientesBase);
});

app.get('/api/inventario', async (req, res) => {
    if (mongoose.connection.readyState !== 1) {
        return res.json(inventarioMemoria);
    }

    try {
        const items = await InventarioItem.find().sort({ nombre: 1 }).lean();
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: 'No se pudo obtener el inventario.' });
    }
});

app.put('/api/inventario', async (req, res) => {
    const { items } = req.body;

    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'El campo items debe ser un array.' });
    }

    if (mongoose.connection.readyState !== 1) {
        inventarioMemoria = items.map((item) => ({
            nombre: item.nombre,
            categoria: item.categoria || 'General',
            cantidad: Number(item.cantidad),
            unidad: item.unidad
        }));
        return res.json(inventarioMemoria);
    }

    try {
        await InventarioItem.deleteMany({});

        if (items.length > 0) {
            const payload = items.map((item) => ({
                nombre: item.nombre,
                categoria: item.categoria || 'General',
                cantidad: Number(item.cantidad),
                unidad: item.unidad
            }));

            await InventarioItem.insertMany(payload);
        }

        const inventarioActualizado = await InventarioItem.find().sort({ nombre: 1 }).lean();
        return res.json(inventarioActualizado);
    } catch (error) {
        return res.status(500).json({ error: 'No se pudo guardar el inventario.' });
    }
});

module.exports = app;
