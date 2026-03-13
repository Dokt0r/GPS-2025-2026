const mongoose = require('mongoose');

const ingredienteSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    }
});

module.exports = mongoose.model('ingrediente', ingredienteSchema);