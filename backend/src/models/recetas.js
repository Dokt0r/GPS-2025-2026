const mongoose = require('mongoose');

const recetaSchema = new mongoose.Schema({
    title: { type: String, required: true },
    steps: [String],
    nutritions: Object,
    tags: [String],
    image_url: String,
    ingredients: [{
        nombre: String,
        cantidad: Number,
        unidad: String
    }]
});

// MÉTODO: Compara Nombres Y Cantidades
recetaSchema.statics.buscarPorIngredientesYCantidades = async function(neveraArray) {
    return this.aggregate([
        {
            $addFields: {
                // Filtramos los ingredientes de la receta que sí podemos cocinar
                ingredientesCumplidos: {
                    $filter: {
                        input: "$ingredients",
                        as: "recetaIng", // Ingrediente de la receta actual
                        cond: {
                            // Comprueba si CUALQUIERA de los ingredientes de la nevera cumple la condición
                            $anyElementTrue: {
                                $map: {
                                    input: neveraArray, // La nevera que pasamos desde Node.js
                                    as: "neveraIng",
                                    in: {
                                        $and: [
                                            // 1. Que el nombre coincida (ignorando mayúsculas/minúsculas)
                                            { $eq: [{ $toLower: "$$recetaIng.nombre" }, { $toLower: "$$neveraIng.nombre" }] },
                                            // 2. Que tengamos en la nevera más o igual cantidad que la que pide la receta
                                            { $gte: ["$$neveraIng.cantidad", "$$recetaIng.cantidad"] }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                totalIngredientesReceta: { $size: "$ingredients" }
            }
        },
        { 
            // Contamos cuántos ingredientes cumplieron la regla (Nombre igual + Cantidad suficiente)
            $addFields: { 
                cantidadCoincidencias: { $size: "$ingredientesCumplidos" } 
            } 
        },
        // Filtrar: Que la receta tenga al menos 1 ingrediente cumplido (o puedes poner 2, 3...)
        { $match: { cantidadCoincidencias: { $gt: 0 } } },
        // Ordenar: Las que podemos hacer con más facilidad salen primero
        { $sort: { cantidadCoincidencias: -1 } },
        {
            $project: {
                _id: 1,
                title: 1,
                image_url: 1,
                // Opcional: Esto devolverá un texto tipo "5/8" para saber cuántos ingredientes tienes listos
                coincidenciaTexto: { 
                    $concat: [ 
                        { $toString: "$cantidadCoincidencias" }, "/", { $toString: "$totalIngredientesReceta" } 
                    ] 
                }
            }
        }
    ]);
};

module.exports = mongoose.model('Receta', recetaSchema);