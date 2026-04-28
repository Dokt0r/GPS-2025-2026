require('dotenv').config();
const mongoose = require('mongoose');
const Ingrediente = require('./src/models/ingredientes');
const ingredientes = require('./data/ingredientes.json');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Limpiar la colección para evitar duplicados si re-ejecutas el script
        await Ingrediente.deleteMany({});
        console.log('🗑️ Colección limpiada');

        // Modificamos el map para que tome el objeto completo
        // Si el objeto tiene equivalencia_g_ml, se incluirá; si no, Mongoose lo ignorará
        const docs = ingredientes.map(item => ({
            nombre: item.nombre,
            unidad: item.unidad,
            equivalencia_g_ml: item.equivalencia_g_ml // Si no existe en el JSON, será undefined
        }));

        await Ingrediente.insertMany(docs);
        console.log(`✅ ${docs.length} ingredientes insertados con sus unidades y equivalencias`);

    } catch (error) {
        console.error('❌ Error durante la siembra de datos:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Desconectado');
    }
}

seed();