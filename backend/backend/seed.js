require('dotenv').config();
const mongoose = require('mongoose');
const Ingrediente = require('./src/models/ingredientes');
const ingredientes = require('./data/ingredientes.json');

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    await Ingrediente.deleteMany({});
    console.log('🗑️ Colección limpiada');

    const docs = ingredientes.map(nombre => ({ nombre }));
    await Ingrediente.insertMany(docs);
    console.log(`✅ ${docs.length} ingredientes insertados`);

    await mongoose.disconnect();
    console.log('👋 Desconectado');
}

seed().catch(console.error);
