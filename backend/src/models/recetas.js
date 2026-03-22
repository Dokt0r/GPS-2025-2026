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
    console.log("🕵️‍♂️ MODELO: ingredientes recibidos:");
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
                                        $let: {
                                            vars: {
                                                // ¿Coincide el nombre? (nevera contenida en receta)
                                                nombreOk: {
                                                    $gte: [
                                                        {
                                                            $indexOfCP: [
                                                                { $toLower: "$$recetaIng.nombre" },
                                                                { $toLower: "$$neveraIng.nombre" }
                                                            ]
                                                        },
                                                        0
                                                    ]
                                                },
                                                // Unidad de la nevera (ya estandarizada)
                                                unidadNevera: { $toLower: "$$neveraIng.unidad" },
                                                // Unidad de la receta (estandarizar también)
                                                unidadReceta: { $toLower: "$$recetaIng.unidad" },
                                                // Factor de conversión (puede ser null)
                                                factor: "$$neveraIng.equivalencia_g_ml",
                                                // Cantidades
                                                cantNevera: "$$neveraIng.cantidad",
                                                cantReceta: "$$recetaIng.cantidad"
                                            },
                                            in: {
                                                $and: [
                                                    "$$nombreOk",
                                                    {
                                                        $switch: {
                                                            branches: [
                                                                // CASO 1: misma unidad → comparación directa
                                                                {
                                                                    case: { $eq: ["$$unidadNevera", "$$unidadReceta"] },
                                                                    then: { $gte: ["$$cantNevera", "$$cantReceta"] }
                                                                },
                                                                // CASO 2: nevera en g/ml, receta en ud
                                                                // → convertir g a ud: cantNevera / factor >= cantReceta
                                                                {
                                                                    case: {
                                                                        $and: [
                                                                            { $in: ["$$unidadNevera", ["g", "ml"]] },
                                                                            { $eq: ["$$unidadReceta", "ud"] },
                                                                            { $gt: ["$$factor", 0] }
                                                                        ]
                                                                    },
                                                                    then: {
                                                                        $gte: [
                                                                            { $divide: ["$$cantNevera", "$$factor"] },
                                                                            "$$cantReceta"
                                                                        ]
                                                                    }
                                                                },
                                                                // CASO 3: nevera en ud, receta en g/ml
                                                                // → convertir ud a g: cantNevera * factor >= cantReceta
                                                                {
                                                                    case: {
                                                                        $and: [
                                                                            { $eq: ["$$unidadNevera", "ud"] },
                                                                            { $in: ["$$unidadReceta", ["g", "ml"]] },
                                                                            { $gt: ["$$factor", 0] }
                                                                        ]
                                                                    },
                                                                    then: {
                                                                        $gte: [
                                                                            { $multiply: ["$$cantNevera", "$$factor"] },
                                                                            "$$cantReceta"
                                                                        ]
                                                                    }
                                                                }
                                                            ],
                                                            // CASO DEFAULT: unidades incompatibles sin factor
                                                            // → solo se acepta si el nombre coincide (sin validar cantidad)
                                                            default: false
                                                        }
                                                    }
                                                ]
                                            }
                                        }
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
                        { $toString: "$cantidadCoincidencias" },
                        "/",
                        { $toString: "$totalIngredientesReceta" }
                    ]
                }
            }
        }
    ];

    return this.aggregate(pipeline);
};

module.exports = mongoose.model('Receta', recetaSchema);
