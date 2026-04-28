const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        default: null
    },
    nevera: [{
        ingrediente: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ingrediente',
            required: true
        },
        cantidad: {
            type: Number,
            default: 1
        },
        unidad: {
            type: String,
            required: true
        }
    }],
    listas: [{
        nombreLista: {
            type: String,
            required: true,
            trim: true
        },
        recetas: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'receta'
        }]
    }],
    alergias: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

module.exports = mongoose.models.usuario || mongoose.model('usuario', usuarioSchema);