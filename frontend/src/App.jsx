import React, { useState, useEffect } from 'react';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import './App.css';

// 1. DICCIONARIO DE TIPOS DE UNIDADES
const tiposUnidades = {
  'kg': 'masa',
  'g': 'masa',
  'L': 'volumen',
  'ml': 'volumen',
  'u.': 'unidad'
};

// 2. FUNCIÓN DE CONVERSIÓN
const convertirCantidad = (cantidad, unidadOrigen, unidadDestino) => {
  // Si son la misma unidad, no hay que convertir nada
  if (unidadOrigen === unidadDestino) return parseFloat(cantidad);

  // Si intentan mezclar masa con volumen o unidades (ej: kg con Litros)
  if (tiposUnidades[unidadOrigen] !== tiposUnidades[unidadDestino]) {
    return null; // Devuelve null para indicar error de compatibilidad
  }

  const cant = parseFloat(cantidad);

  // Conversiones de Masa
  if (unidadOrigen === 'kg' && unidadDestino === 'g') return cant * 1000;
  if (unidadOrigen === 'g' && unidadDestino === 'kg') return cant / 1000;

  // Conversiones de Volumen
  if (unidadOrigen === 'L' && unidadDestino === 'ml') return cant * 1000;
  if (unidadOrigen === 'ml' && unidadDestino === 'L') return cant / 1000;

  return null;
};

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const API_URL = 'http://localhost:3000';

//Estado para nuestro mensaje Toast
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });

  //Función para mostrar el mensaje y ocultarlo a los 3 segundos
  const mostrarMensaje = (mensaje, tipo = 'error') => {
    setToast({ visible: true, mensaje, tipo });
    
    // El temporizador que lo hace desaparecer
    setTimeout(() => {
      setToast({ visible: false, mensaje: '', tipo: '' });
    }, 3500); // 3.5 segundos
  };


  useEffect(() => {
    fetch(`${API_URL}/api/ingredientes`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          setIngredientesBase(data);
        } else {
          setIngredientesBase([
            { nombre: 'Pollo', categoria: 'Proteína' },
            { nombre: 'Tomate', categoria: 'Vegetal' },
            { nombre: 'Arroz', categoria: 'Cereales' },
            { nombre: 'Leche', categoria: 'Lácteo' },
            { nombre: 'Huevo', categoria: 'Proteína' },
            { nombre: 'Panceta', categoria: 'Proteína' }
          ]);
        }
      })
      .catch(() => {
        setIngredientesBase([
          { nombre: 'Pollo', categoria: 'Proteína' },
            { nombre: 'Tomate', categoria: 'Vegetal' },
            { nombre: 'Arroz', categoria: 'Cereales' },
            { nombre: 'Leche', categoria: 'Lácteo' },
            { nombre: 'Huevo', categoria: 'Proteína' },
            { nombre: 'Panceta', categoria: 'Proteína' }
        ]);
      });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/inventario`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setIngredientesNevera(data);
        }
      })
      .catch(() => {
        mostrarMensaje('⚠️ No se pudo cargar el inventario guardado.', 'error');
      });
  }, []);

  const guardarInventario = async (listaActualizada) => {
    try {
      const response = await fetch(`${API_URL}/api/inventario`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: listaActualizada })
      });

      if (!response.ok) {
        throw new Error('Error guardando inventario');
      }
    } catch {
      mostrarMensaje('⚠️ No se pudo guardar en la base de datos.', 'error');
    }
  };

  // 3. LOGICA DE ANADIDO
  const añadirAInventario = (ingrediente, cantidadAñadida, unidadElegida) => {
    const cantidadNumerica = parseFloat(cantidadAñadida) || 1;
    
    const index = ingredientesNevera.findIndex(i => i.nombre === ingrediente.nombre);

    if (index !== -1) {
      // El ingrediente YA EXISTE en la nevera
      const itemActual = ingredientesNevera[index];
      const unidadActual = itemActual.unidad;
      const cantidadActual = parseFloat(itemActual.cantidad);

      // Intentamos convertir la nueva cantidad a la unidad que ya esta en la nevera
      const cantidadConvertida = convertirCantidad(cantidadNumerica, unidadElegida, unidadActual);

      // Si la conversión falla (son de distinto tipo)
      if (cantidadConvertida === null) {
        mostrarMensaje(`❌ Incompatibilidad: No puedes mezclar "${unidadElegida}" con "${unidadActual}".`);
        return; // Cortamos la ejecución, no se anade nada
      }

      // Si la conversión es exitosa, sumamos
      const nuevaLista = [...ingredientesNevera];
      let sumaTotal = cantidadActual + cantidadConvertida;
      
      // Redondeamos a un máximo de 2 decimales para que no salgan nmeros raros como 1.300000001
      sumaTotal = Math.round(sumaTotal * 100) / 100;

      nuevaLista[index].cantidad = sumaTotal;
      setIngredientesNevera(nuevaLista);
      guardarInventario(nuevaLista);

    } else {
      // Es un ingrediente NUEVO, se anade tal cual
      const nuevaLista = [
        ...ingredientesNevera, 
        { ...ingrediente, cantidad: cantidadNumerica, unidad: unidadElegida }
      ];
      setIngredientesNevera(nuevaLista);
      guardarInventario(nuevaLista);
    }
    mostrarMensaje(`✅ "${ingrediente.nombre}" añadido a tu nevera: ${cantidadNumerica} ${unidadElegida}.`, 'success'); // Feedback visual al usuario
  };

  const eliminarDeInventario = (nombre) => {
    const nuevaLista = ingredientesNevera.filter(i => i.nombre !== nombre);
    setIngredientesNevera(nuevaLista);
    guardarInventario(nuevaLista);
  };

 return (
    <>
      <div className="bg-gradient"></div>
      <main className="app-container">
        <header>
          <div className="logo-placeholder"></div>
          <h1>LazyChef</h1>
          <p>Gestiona tus alimentos con inteligencia</p>
        </header>

        <section className="split-layout">
          <div className="left-panel">
          <Buscador 
            ingredientesBase={ingredientesBase} 
            onAñadir={añadirAInventario} 
            onError={(msg) => mostrarMensaje(msg, 'error')} 
          />

          <div className="messages-under-add" aria-live="polite">
            {toast.visible && (
              <div className={`toast-notification ${toast.tipo}`}>
                {toast.mensaje}
              </div>
            )}
          </div>
          </div>

          <div className="right-panel">
          <ListaNevera 
            ingredientes={ingredientesNevera} 
            onEliminar={eliminarDeInventario} 
          />
          </div>
        </section>
      </main>
    </>
  );
}

export default App;