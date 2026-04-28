const mongoose = require('mongoose');

// =========================================================================
// ESQUEMAS (Schemas)
// =========================================================================

/**
 * 1. Sub-esquema para los ingredientes.
 * Se desactiva la generación automática de _id para mantener los documentos 
 * más limpios y ligeros, ya que los ingredientes siempre se consultan 
 * en el contexto de una receta.
 */
const ingredienteSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    cantidad: { type: Number, required: true },
    unidad: { type: String, default: null }
}, { _id: false });

/**
 * 2. Esquema principal de la Receta.
 * Define la estructura de los datos almacenados en la colección 'recetas'.
 */
const recetaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'El título es obligatorio para completar la receta'],
        trim: true
    },
    steps: {
        type: [String],
        required: true
    },
    nutritions: {
        calories: { type: Number },
        carbohydrateContent: { type: Number },
        fatContent: { type: Number },
        proteinContent: { type: Number }
    },
    tags: {
        type: [String],
        default: []
    },
    image_url: {
        type: String,
        required: true
    },
    ingredients: {
        type: [ingredienteSchema],
        required: true
    },
    isTest: {
        type: Boolean,
        default: false,
        index: true // Opcional: ayuda a que el borrado sea más rápido
    }, isCompleted: {
        type: Boolean,
        default: false
    }
}, {
    collection: 'recetas', // Fuerza el nombre de la colección en la base de datos
    timestamps: true       // Añade campos createdAt y updatedAt automáticamente
});


// =========================================================================
// MÉTODOS ESTÁTICOS
// =========================================================================

/**
 * Busca recetas basadas en un inventario de ingredientes (la "nevera" del usuario).
 * Utiliza el framework de agregación de MongoDB para filtrar, convertir unidades
 * y calcular el nivel de coincidencia de cada receta.
 * * @param {Array} neveraArray - Array de objetos con los ingredientes del usuario.
 * Formato esperado: [{ nombre, cantidad, unidad, equivalencia_g_ml }]
 * @returns {Promise<Array>}  - Array de recetas ordenadas por porcentaje de coincidencia.
 */
recetaSchema.statics.buscarPorIngredientesYCantidades = async function (neveraArray) {
    console.log("🕵️‍♂️ MODELO: Procesando búsqueda de recetas con los siguientes ingredientes:");
    console.log(JSON.stringify(neveraArray, null, 2));

    const pipeline = [
        // ---------------------------------------------------------------------
        // FASE 1: Filtrado profundo de ingredientes
        // Iteramos sobre los ingredientes de cada receta y comprobamos si el 
        // usuario tiene cantidad suficiente en su nevera, manejando conversiones.
        // ---------------------------------------------------------------------
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
                                                nombreOk: {
                                                    $eq: [{ $toLower: "$$recetaIng.nombre" }, { $toLower: "$$neveraIng.nombre" }]
                                                },
                                                unidadNevera: { $toLower: "$$neveraIng.unidad" },
                                                unidadReceta: { $toLower: "$$recetaIng.unidad" },
                                                factor: "$$neveraIng.equivalencia_g_ml",
                                                cantNevera: "$$neveraIng.cantidad",
                                                cantReceta: "$$recetaIng.cantidad"
                                            },
                                            in: {
                                                $and: [
                                                    "$$nombreOk",
                                                    {
                                                        $switch: {
                                                            branches: [
                                                                {
                                                                    case: { $eq: ["$$unidadNevera", "$$unidadReceta"] },
                                                                    then: { $gte: ["$$cantNevera", "$$cantReceta"] }
                                                                },
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

        // ---------------------------------------------------------------------
        // FASE 2: Cálculo de métricas de coincidencia
        // Obtenemos los valores absolutos y el porcentaje para poder ordenar bien.
        // ---------------------------------------------------------------------
        {
            $addFields: {
                cantidadCoincidencias: { $size: "$ingredientesCumplidos" },
                porcentajeCoincidencia: {
                    $cond: {
                        if: { $gt: ["$totalIngredientesReceta", 0] },
                        then: {
                            $divide: [
                                { $size: "$ingredientesCumplidos" },
                                "$totalIngredientesReceta"
                            ]
                        },
                        else: 0
                    }
                }
            }
        },

        // ---------------------------------------------------------------------
        // FASE 3: Filtrado final
        // Descartamos las recetas donde el usuario no tiene ni un solo ingrediente.
        // ---------------------------------------------------------------------
        { $match: { cantidadCoincidencias: { $gt: 0 } } },

        // ---------------------------------------------------------------------
        // FASE 4: Ordenación (Sorting)
        // 1º Por porcentaje de compleción (las más viables primero).
        // 2º Por cantidad absoluta de ingredientes coincidentes (desempate).
        // 3º Por título alfabético (desempate final).
        // ---------------------------------------------------------------------
        {
            $sort: {
                porcentajeCoincidencia: -1,
                cantidadCoincidencias: -1,
                title: 1
            }
        },

        // ---------------------------------------------------------------------
        // FASE 5: Proyección (Formateo de salida)
        // Seleccionamos solo los campos necesarios para la vista del frontend 
        // y formateamos la etiqueta de coincidencia (ej: "3/5").
        // ---------------------------------------------------------------------
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

// =========================================================================
// LÓGICA DE NEGOCIO (Validaciones antes de guardar)
// =========================================================================

recetaSchema.pre('save', function () {
    // Si la receta tiene ingredientes, comprobamos que las cantidades sean lógicas
    if (this.ingredients && this.ingredients.length > 0) {
        const tieneErrores = this.ingredients.some(ing => ing.cantidad <= 0);
        if (tieneErrores) {
            // USAMOS THROW para que la petición asíncrona lo detecte como error 400
            throw new Error('Lógica de Negocio: No se pueden guardar ingredientes con cantidad 0 o negativa.');
        }
    }

    // Comprobamos que tenga al menos un paso de preparación
    if (!this.steps || this.steps.length === 0) {
        throw new Error('Lógica de Negocio: Una receta debe tener al menos un paso para estar completada.');
    }
});

module.exports = mongoose.models.Receta || mongoose.model('Receta', recetaSchema);