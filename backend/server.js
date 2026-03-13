// 1. Primero dotenv, antes de todo
require('dotenv').config();

// 2. Luego importamos la app
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor de la Nevera Virtual funcionando en: http://localhost:${PORT}`);
    console.log('Presiona CTRL+C para detener el servidor');
});