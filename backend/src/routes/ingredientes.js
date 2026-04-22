const express = require('express');
const router = express.Router();
const Ingrediente = require('../models/ingredientes');
const Usuario = require('../models/usuario');
const requireAuth = require('../middleware/auth');

const mapNeveraParaRespuesta = (nevera) => nevera.map((item) => ({
    nombre: item.ingrediente.nombre,
    unidad: item.unidad,
    cantidad: item.cantidad,
    equivalencia_g_ml: item.ingrediente.equivalencia_g_ml
}));

const textoSeguro = (valor) => (typeof valor === 'string' ? valor.trim() : '');

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validarRegistroIngrediente = ({ nombre, unidad, cantidad }) => {
    if (!nombre || !unidad) return false;
    if (!Number.isFinite(cantidad) || cantidad <= 0) return false;
    return true;
};

// GET /api/ingredientes/nevera
router.get('/nevera', requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        await usuario.populate('nevera.ingrediente');

        return res.json({
            nevera: mapNeveraParaRespuesta(usuario.nevera)
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al cargar la nevera del usuario.' });
    }
});

// POST /api/ingredientes/nevera
router.post('/nevera', requireAuth, async (req, res) => {
    try {
        const nombre = textoSeguro(req.body?.nombre);
        const unidad = textoSeguro(req.body?.unidad).toLowerCase();
        const cantidad = Number(req.body?.cantidad ?? 1);
        const equivalencia_g_ml = Number.isFinite(Number(req.body?.equivalencia_g_ml))
            ? Number(req.body?.equivalencia_g_ml)
            : null;

        if (!validarRegistroIngrediente({ nombre, unidad, cantidad })) {
            return res.status(400).json({ error: 'Datos de ingrediente no validos.' });
        }

        const nombreSeguro = escaparRegex(nombre);

        let ingrediente = await Ingrediente.findOne({
            nombre: new RegExp(`^${nombreSeguro}$`, 'i')
        });

        if (!ingrediente) {
            ingrediente = await Ingrediente.create({
                nombre,
                unidad,
                equivalencia_g_ml
            });
        }

        const usuario = await Usuario.findById(req.usuario.id);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        await usuario.populate('nevera.ingrediente');

        const itemNevera = usuario.nevera.find((item) => (
            String(item.ingrediente._id) === String(ingrediente._id)
            && item.unidad.toLowerCase() === unidad
        ));

        if (itemNevera) {
            itemNevera.cantidad += cantidad;
        } else {
            usuario.nevera.push({
                ingrediente: ingrediente._id,
                cantidad,
                unidad
            });
        }

        await usuario.save();
        await usuario.populate('nevera.ingrediente');

        return res.status(201).json({
            mensaje: 'Ingrediente registrado en la nevera correctamente.',
            nevera: mapNeveraParaRespuesta(usuario.nevera)
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error al registrar el ingrediente en la BBDD.' });
    }
});

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