const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const authRoutes = require('./routes/auth');
const ingredientesRoutes = require('./routes/ingredientes');
const inventarioRoutes = require('./routes/inventario');
const recetasRoutes = require('./routes/recetas.js');

// Esto hay que cambiarlo en un futuro en produccion
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/inventario', inventarioRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error conectando a MongoDB:', err));


app.get('/', (req, res) => {
    res.json({ mensaje: '🚀 API de la Nevera Virtual funcionando correctamente' });
});

module.exports = app;
