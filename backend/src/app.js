const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const ingredientesRoutes = require('./routes/ingredientes');

app.use(cors());
app.use(express.json());

app.use('/api/ingredientes', ingredientesRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error conectando a MongoDB:', err));


app.get('/', (req, res) => {
    res.json({ mensaje: '🚀 API de la Nevera Virtual funcionando correctamente' });
});

module.exports = app;
