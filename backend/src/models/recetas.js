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

// MÉTODO: Compara Nombres Y Cantidades con Búsqueda Flexible
recetaSchema.statics.buscarPorIngredientesYCantidades = async function(neveraArray) {
    
    // 🔍 LOG 1: Vemos qué recibe el modelo exactamente
    console.log("-----------------------------------------");
    console.log("🕵️‍♂️ MODELO: Recibidos estos ingredientes de la nevera:");
    console.log(JSON.stringify(neveraArray, null, 2));

    const pipeline = [
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
                                            // 1. Que el nombre sea "similar" (uno contenga al otro)
                                            {
                                                $or: [
                                                    // Caso A: "romero seco" (receta) contiene "romero" (nevera)
                                                    { $gte: [{ $indexOfCP: [{ $toLower: "$$recetaIng.nombre" }, { $toLower: "$$neveraIng.nombre" }] }, 0] },
                                                    
                                                    // Caso B: "tomate frito" (nevera) contiene "tomate" (receta)
                                                    { $gte: [{ $indexOfCP: [{ $toLower: "$$neveraIng.nombre" }, { $toLower: "$$recetaIng.nombre" }] }, 0] }
                                                ]
                                            },
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
            // Contamos cuántos ingredientes cumplieron la regla
            $addFields: { 
                cantidadCoincidencias: { $size: "$ingredientesCumplidos" } 
            } 
        },
        // Filtrar: Que la receta tenga al menos 1 ingrediente cumplido
        { $match: { cantidadCoincidencias: { $gt: 0 } } },
        // Ordenar: Las que podemos hacer con más facilidad salen primero
        { $sort: { cantidadCoincidencias: -1 } },
        {
            $project: {
                _id: 1,
                title: 1,
                image_url: 1,
                coincidenciaTexto: { 
                    $concat: [ 
                        { $toString: "$cantidadCoincidencias" }, "/", { $toString: "$totalIngredientesReceta" } 
                    ] 
                }
            }
        }
    ];

    // 🔍 LOG 2: Vemos la "tubería" completa en formato JSON
    console.log("⚙️ MODELO: Ejecutando este Pipeline en MongoDB:");
    // Hacemos un stringify con espaciado 2 para que sea legible en la terminal
    console.log(JSON.stringify(pipeline, null, 2));
    console.log("-----------------------------------------");

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Receta', recetaSchema);