const mongoose = require('mongoose');
const Receta = require('../src/models/recetas');

// =========================================================================
// MOCKS DE BASE DE DATOS (Estilo del equipo)
// =========================================================================

// Bloqueamos la conexión real para que no intente ir a Atlas ni pida librerías extra
jest.mock('mongoose', () => {
    const actualMongoose = jest.requireActual('mongoose');
    return {
        ...actualMongoose, // Mantenemos la lógica de esquemas y modelos
        connect: jest.fn().mockResolvedValue(true),
        disconnect: jest.fn().mockResolvedValue(true)
    };
});

// =========================================================================
// PRUEBAS UNITARIAS DEL DAO (Lógica de Esquema y Validación)
// =========================================================================

describe('DAO - Pruebas Unitarias de Recetas (Sin Base de Datos)', () => {

    /**
     * Test 1: Validación de Schema exitosa.
     * Probamos que un objeto bien formado no da errores de validación.
     */
    test('debería validar correctamente una receta con todos los campos obligatorios', () => {
        const recetaValida = new Receta({
            title: 'Arroz con leche',
            steps: ['Hervir leche', 'Añadir arroz', 'Endulzar'],
            image_url: 'http://lazychef.com/arroz.jpg',
            ingredients: [
                { nombre: 'Arroz', cantidad: 200, unidad: 'g' }
            ]
        });

        // validateSync es una función de Mongoose que comprueba las reglas del Schema sin usar la DB
        const error = recetaValida.validateSync();
        expect(error).toBeUndefined();
    });

    /**
     * Test 2: Título obligatorio.
     * Verificamos que tu mensaje de error personalizado se dispare.
     */
    test('debería devolver error si el título está vacío', () => {
        const recetaSinTitulo = new Receta({
            steps: ['Paso 1'],
            image_url: 'test.jpg',
            ingredients: [{ nombre: 'Agua', cantidad: 1, unidad: 'l' }]
        });

        const error = recetaSinTitulo.validateSync();
        
        expect(error).toBeDefined();
        // Comprobamos el mensaje exacto que definiste en tu modelo
        expect(error.errors.title.message).toBe('El título es obligatorio para completar la receta');
    });

    /**
     * Test 3: Pasos obligatorios.
     * El campo 'steps' es un array que marcaste como 'required: true'.
     */
    test('debería fallar si no se envían los pasos de la receta', () => {
        const recetaSinPasos = new Receta({
            title: 'Pasta',
            image_url: 'pasta.jpg',
            ingredients: [{ nombre: 'Macarrones', cantidad: 100, unidad: 'g' }],
            steps: null
        });

        const error = recetaSinPasos.validateSync();
        expect(error).toBeDefined();
        expect(error.errors.steps).toBeDefined();
    });

    /**
     * Test 4: Tipos de datos (Nutritions).
     * Comprobamos que si enviamos datos nutricionales, respeten el tipo 'Number'.
     */
    test('debería fallar si las calorías no son un número', () => {
        const recetaErrorNutricion = new Receta({
            title: 'Test',
            steps: ['Paso'],
            image_url: 'test.jpg',
            ingredients: [{ nombre: 'X', cantidad: 1, unidad: 'ud' }],
            nutritions: {
                calories: "MUCHAS" // Esto debería causar un error de tipo
            }
        });

        const error = recetaErrorNutricion.validateSync();
        expect(error).toBeDefined();
        expect(error.errors['nutritions.calories']).toBeDefined();
    });
});