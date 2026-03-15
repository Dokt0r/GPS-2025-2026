const mongoose = require('mongoose');

const inventarioItemSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      unique: true
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

module.exports = mongoose.model('InventarioItem', inventarioItemSchema);
