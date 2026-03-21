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
recetaSchema.statics.buscarPorIngredientesYCantidades = async function (neveraArray) {
    console.log("-----------------------------------------");
    console.log("🕵️‍♂️ MODELO: Recibidos estos ingredientes de la nevera:");
    console.log(JSON.stringify(neveraArray, null, 2));

    const pipeline = [
        {
            $addFields: {
                ingredientesCumplidos: {
                    $filter: {
                        input: "$ingredients",
                        as: "recetaIng",
                        cond: {
                            $anyElementTrue: {
                                $map: {
                                    input: neveraArray,
                                    as: "neveraIng",
                                    in: {
                                        $and: [
                                            // Solo un sentido: lo que tengo en nevera está contenido en la receta
                                            {
                                                $gte: [
                                                    {
                                                        $indexOfCP: [
                                                            { $toLower: "$$recetaIng.nombre" }, // donde busco
                                                            { $toLower: "$$neveraIng.nombre" }  // qué busco
                                                        ]
                                                    },
                                                    0
                                                ]
                                            },
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
            $addFields: {
                cantidadCoincidencias: { $size: "$ingredientesCumplidos" }
            }
        },
        { $match: { cantidadCoincidencias: { $gt: 0 } } },
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

    console.log("⚙️ MODELO: Ejecutando este Pipeline en MongoDB:");
    console.log(JSON.stringify(pipeline, null, 2));
    console.log("-----------------------------------------");

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Receta', recetaSchema);
