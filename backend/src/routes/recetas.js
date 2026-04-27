const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Receta = require('../models/recetas');
const Usuario = require('../models/usuario');
const requireAuth = require('../middleware/auth');
const { guardarRecetaComoFavorita, FavoritosError } = require('../services/favoritos');
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

router.get('/', async (req, res) => {
    try {
        const queryStr = typeof req.query.ingredientes === 'string'
            ? req.query.ingredientes.trim()
            : '';

        const ingredientesNeveraEstandar = queryStr
            ? estandarizarNevera(queryStr)
            : await obtenerIngredientesDeNeveraUsuario(req);

        if (!ingredientesNeveraEstandar.length) {
            console.log("❌ Error: Faltan ingredientes en la petición.");
            console.log("=======================================\n");
            return res.status(400).json({ error: "Faltan ingredientes" });
        }

        // 2. Pasamos el array completo al Modelo
        const recetasSugeridas = await Receta.buscarPorIngredientesYCantidades(ingredientesNeveraEstandar);

        res.json(recetasSugeridas);

    } catch (error) {
        console.error("Error buscando recetas:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// =========================================================================
// ENDPOINT: Obtener recetas favoritas del usuario
// =========================================================================

router.get('/favoritos', requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id)
            .populate({
                path: 'listas.recetas',
                model: 'Receta',
                select: '_id title image_url'
            });
 
        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no autorizado.' });
        }
 
        const listaFavoritos = usuario.listas.find(
            (l) => l.nombreLista.trim().toLowerCase() === 'favoritos'
        );
 
        const recetas = listaFavoritos ? listaFavoritos.recetas : [];
 
        return res.status(200).json({ favoritos: recetas });
 
    } catch (error) {
        console.error('Error al obtener favoritos:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;

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

        // 1. Buscamos al usuario logueado y populamos su nevera
        const usuario = await Usuario.findById(req.usuario.id).populate('nevera.ingrediente');
        
        if (!usuario) {
            return res.status(401).json({ error: "Usuario no autenticado correctamente." });
        }

        // 2. Buscamos la receta
        const receta = await Receta.findOne({ 
            title: new RegExp('^' + tituloSeguro + '$', 'i') 
        });

        if (!receta) return res.status(404).json({ error: "Receta no encontrada." });

        // 3. Procesamos los ingredientes usados
        for (const ingUsado of ingredients) {
            
            // Buscamos si el ingrediente existe en la nevera
            const itemEnNevera = usuario.nevera.find(item => 
                item.ingrediente.nombre.toLowerCase() === ingUsado.nombre.toLowerCase() &&
                item.unidad.toLowerCase() === ingUsado.unidad.toLowerCase()
            );

            // REQUISITO: "Resta los que tenga, ignora los que no tenga (sin dar error)"
            // Al estar dentro de este if, si itemEnNevera es undefined (porque falta), 
            // simplemente se salta la resta y continúa, permitiendo completar la receta.
            if (itemEnNevera) {
                // Restamos la cantidad directamente (puede quedar en negativo temporalmente)
                itemEnNevera.cantidad -= ingUsado.cantidad;
            }
        }

        // REQUISITO: "Los que darían por debajo de cero que se eliminen de la nevera"
        // Filtramos la nevera para conservar ÚNICAMENTE los ingredientes con cantidad > 0.
        // Esto elimina automáticamente los que quedaron a 0 o en números negativos.
        usuario.nevera = usuario.nevera.filter(item => item.cantidad > 0);

        await usuario.save();

        // 4. Actualizamos los datos de la receta
        receta.steps = steps;
        receta.ingredients = ingredients;
        receta.isCompleted = true;

        await receta.save();

        res.status(200).json({ 
            success: true, 
            mensaje: "Receta completada e ingredientes actualizados en tu nevera." 
        }); 

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
// =========================================================================
// ENDPOINT: (Guardar receta como favorita)
// =========================================================================

router.post('/favoritos', requireAuth, async (req, res) => {
    try {
        const { recetaId } = req.body;
        const resultado = await guardarRecetaComoFavorita({
            usuarioId: req.usuario.id,
            recetaId
        });

        return res.status(200).json(resultado);

    } catch (error) {
        if (error instanceof FavoritosError) {
            return res.status(error.status).json({ error: error.message });
        }

        console.error("Error al guardar receta como favorita:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
});

// =========================================================================
// ENDPOINT: Obtener recetas favoritas del usuario
// =========================================================================

router.get('/favoritos', requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id)
            .populate({
                path: 'listas.recetas',
                model: 'Receta',
                select: '_id title image_url'
            });
 
        if (!usuario) {
            return res.status(401).json({ error: 'Usuario no autorizado.' });
        }
 
        const listaFavoritos = usuario.listas.find(
            (l) => l.nombreLista.trim().toLowerCase() === 'favoritos'
        );
 
        const recetas = listaFavoritos ? listaFavoritos.recetas : [];
 
        return res.status(200).json({ favoritos: recetas });
 
    } catch (error) {
        console.error('Error al obtener favoritos:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;