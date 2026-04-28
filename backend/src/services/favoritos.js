const mongoose = require('mongoose');
const Receta = require('../models/recetas');
const Usuario = require('../models/usuario');

const NOMBRE_LISTA_FAVORITOS = 'favoritos';

class FavoritosError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'FavoritosError';
        this.status = status;
    }
}

const normalizarNombreLista = (nombreLista = '') =>
    String(nombreLista).trim().toLowerCase();

const obtenerListaFavoritos = (usuario) => usuario.listas.find(
    (lista) => normalizarNombreLista(lista.nombreLista) === NOMBRE_LISTA_FAVORITOS
);

const obtenerOCrearListaFavoritos = (usuario) => {
    let listaFavoritos = obtenerListaFavoritos(usuario);

    if (!listaFavoritos) {
        usuario.listas.push({ nombreLista: 'Favoritos', recetas: [] });
        listaFavoritos = usuario.listas[usuario.listas.length - 1];
    }

    return listaFavoritos;
};

const validarRecetaId = (recetaId) => {
    if (!recetaId) {
        throw new FavoritosError(400, 'Falta el ID de la receta.');
    }

    if (!mongoose.Types.ObjectId.isValid(recetaId)) {
        throw new FavoritosError(400, 'El ID de la receta no es valido.');
    }
};

const guardarRecetaComoFavorita = async ({ usuarioId, recetaId }) => {
    validarRecetaId(recetaId);

    const receta = await Receta.findById(recetaId).select('_id');
    if (!receta) {
        throw new FavoritosError(404, 'La receta no existe.');
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
        throw new FavoritosError(401, 'Usuario no autorizado.');
    }

    const listaFavoritos = obtenerOCrearListaFavoritos(usuario);

    const recetaYaGuardada = listaFavoritos.recetas.some(
        (idGuardado) => idGuardado.toString() === receta._id.toString()
    );

    if (recetaYaGuardada) {
        throw new FavoritosError(400, 'La receta ya está en tu lista de favoritos.');
    }

    listaFavoritos.recetas.push(receta._id);
    await usuario.save();

    return {
        success: true,
        mensaje: 'Receta añadida a tu lista de favoritos correctamente.'
    };
};

module.exports = {
    guardarRecetaComoFavorita,
    FavoritosError
};
