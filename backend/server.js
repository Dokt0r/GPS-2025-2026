// 1. Importamos dotenv para leer las variables del archivo .env
require('dotenv').config();

// 2. Importamos la lógica de la aplicación desde src/app.js
const app = require('./src/app');

// 3. Definimos el puerto
// Usará el del archivo .env o el 3000 por defecto si aquel no existe
const PORT = process.env.PORT || 3000;

// 4. Arrancamos el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor de la Nevera Virtual funcionando en: http://localhost:${PORT}`);
    console.log('Presiona CTRL+C para detener el servidor');
});
