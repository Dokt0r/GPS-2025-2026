const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const authRoutes = require('./routes/auth');
const ingredientesRoutes = require('./routes/ingredientes');
const recetasRoutes = require('./routes/recetas.js');

app.use(cors({
  // Especifica quién puede hacer peticiones. Mete tu localhost para desarrollo y el vercel para producción.
  origin: [
    'http://localhost:5173', // O el puerto que uses en local para el front
    'https://gps-2025-2026.vercel.app' // ¡TU DOMINIO DE VERCEL SIN BARRAS AL FINAL!
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // IMPORTANTÍSIMO si estás enviando tokens JWT en los headers o cookies
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/ingredientes', ingredientesRoutes);
app.use('/api/recetas', recetasRoutes);

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error conectando a MongoDB:', err));


app.get('/', (req, res) => {
    res.json({ mensaje: '🚀 API de la Nevera Virtual funcionando correctamente' });
});

module.exports = app;
