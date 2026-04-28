const mongoose = require('mongoose');

const ingredienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true,
        unique: true // Recomendado para evitar ingredientes duplicados
    },
    unidad: {
        type: String,
        required: true,
        trim: true
    },
    equivalencia_g_ml: {
        type: Number,
        required: false, // Es opcional ya que no todos los ingredientes lo tienen
        default: null    // Opcional: puedes poner un valor por defecto
    }
}, {
    timestamps: false // Opcional: añade createdAt y updatedAt si lo necesitas
});

module.exports = mongoose.model('ingrediente', ingredienteSchema);