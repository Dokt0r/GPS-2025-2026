const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Receta = require('../models/recetas');
const Usuario = require('../models/usuario');
const requireAuth = require('../middleware/auth');

const estandarizarNevera = (queryStr) => {
    if (!queryStr) return [];

    const items = queryStr.split(',');
    return items.map(item => {
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

const obtenerUsuarioIdDesdeBearer = (req) => {
    const authHeader = req.header('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null;

    if (!token) return null;

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) return null;

    try {
        const decoded = jwt.verify(token, secret);
        return decoded?.usuario?.id || null;
    } catch {
        return null;
    }
};

const mapNeveraUsuario = (nevera = []) => nevera
    .map((item) => ({
        nombre: item?.ingrediente?.nombre?.trim() || '',
        cantidad: Number(item?.cantidad) || 0,
        unidad: (item?.unidad || '').toLowerCase().trim(),
        equivalencia_g_ml: Number(item?.ingrediente?.equivalencia_g_ml) || null
    }))
    .filter((item) => item.nombre && item.cantidad > 0);

const obtenerIngredientesDeNeveraUsuario = async (req) => {
    const usuarioId = obtenerUsuarioIdDesdeBearer(req);
    if (!usuarioId) return [];

    const usuario = await Usuario.findById(usuarioId).populate('nevera.ingrediente');
    if (!usuario) return [];

    return mapNeveraUsuario(usuario.nevera);
};

// GET / - Buscar recetas por ingredientes
router.get('/', async (req, res) => {
    try {
        const queryStr = typeof req.query.ingredientes === 'string'
            ? req.query.ingredientes.trim()
            : '';

        const ingredientesNeveraEstandar = queryStr
            ? estandarizarNevera(queryStr)
            : await obtenerIngredientesDeNeveraUsuario(req);

        if (!ingredientesNeveraEstandar.length) {
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        const recetasSugeridas = await Receta.buscarPorIngredientesYCantidades(ingredientesNeveraEstandar);
        res.json(recetasSugeridas);

    } catch (error) {
        console.error("Error buscando recetas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// GET /:titulo - Obtener detalle de una receta
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

// PUT /completar - Completar receta y restar ingredientes de la nevera
router.put('/completar', requireAuth, async (req, res) => {
    try {
        const { titulo, steps, ingredients } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        const usuario = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');

        if (!usuario) {
            return res.status(401).json({ error: "Usuario no autenticado correctamente." });
        }

        const receta = await Receta.findOne({
            title: new RegExp('^' + tituloSeguro + '$', 'i')
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada." });

        // ── RESTA DE INGREDIENTES ──────────────────────────────────────────
        // Usamos .includes() igual que el frontend para mayor tolerancia en nombres
        for (const ingUsado of ingredients) {
            const nombreReceta = ingUsado.nombre.toLowerCase().trim();

            const itemEnNevera = usuario.nevera.find(item => {
                const nombreNevera = (item.ingrediente?.nombre || '').toLowerCase().trim();
                // Coincidencia flexible: el nombre de la receta contiene el de la nevera
                return nombreReceta.includes(nombreNevera) || nombreNevera.includes(nombreReceta);
            });

            console.log(`[COMPLETAR] "${ingUsado.nombre}" → ${itemEnNevera ? `encontrado (${itemEnNevera.ingrediente.nombre}: ${itemEnNevera.cantidad})` : 'NO encontrado'}`);

            if (itemEnNevera) {
                itemEnNevera.cantidad -= ingUsado.cantidad;
            }
        }

        // Eliminamos los que quedaron en 0 o negativo
        usuario.nevera = usuario.nevera.filter(item => item.cantidad > 0);

        await usuario.save();

        // Actualizamos la receta
        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;
        await receta.save();

        const usuarioActualizado = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');
        const neveraActualizada = mapNeveraUsuario(usuarioActualizado.nevera);

        res.status(200).json({
            success: true,
            nevera: neveraActualizada,
            mensaje: "Receta completada e ingredientes actualizados en tu nevera."
        });

    } catch (error) {
        console.error("Error al completar receta:", error);
        res.status(500).json({ error: "Error interno del servidor al procesar la operación." });
    }
});

// DELETE /ingrediente - Eliminar un ingrediente de una receta
router.delete('/ingrediente', async (req, res) => {
    try {
        const { titulo, nombreIngrediente } = req.body;
        const tituloSeguro = escaparRegex(titulo);

        const receta = await Receta.findOneAndUpdate(
            { title: new RegExp('^' + tituloSeguro + '$', 'i') },
            { $pull: { ingredients: { nombre: nombreIngrediente } } },
            { returnDocument: 'after' }
        );

        if (!receta) return res.status(404).json({ error: "Receta no encontrada" });

        res.json(receta);
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar ingrediente" });
    }
});

module.exports = router;