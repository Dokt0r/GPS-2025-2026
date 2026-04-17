const mongoose = require('mongoose');

const ingredienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true
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

module.exports = mongoose.model('usuario', usuarioSchema);