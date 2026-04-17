const mongoose = require('mongoose');

const inventarioItemSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'usuario',
      required: true,
      index: true
    },
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0
    },
    unidad: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    collection: 'inventario',
    timestamps: true
  }
);

inventarioItemSchema.index({ usuario: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.model('InventarioItem', inventarioItemSchema);
