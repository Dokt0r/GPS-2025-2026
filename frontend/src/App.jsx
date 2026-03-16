import React, { useState, useEffect } from 'react';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import './App.css';

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  // NUEVO: Estado para las notificaciones
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });

  // Si existe VITE_API_URL la usa, si no, usa por defecto http://localhost:3000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // NUEVO: Función para mostrar mensajes
  const mostrarMensaje = (mensaje, tipo) => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast({ visible: false, mensaje: '', tipo: '' }), 3000);
  };

  useEffect(() => {
    fetch(`${API_URL}/api/ingredientes`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
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
        // Fallback si la API no responde
        setIngredientesBase([
          { nombre: 'Pollo', categoria: 'Proteína' },
          { nombre: 'Tomate', categoria: 'Vegetal' },
          { nombre: 'Arroz', categoria: 'Cereales' }
        ]);
      });
  }, []);

  /*
  useEffect(() => {
    fetch(`${API_URL}/api/inventario`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setIngredientesNevera(data);
      })
      .catch(() => {
        mostrarMensaje('⚠️ No se pudo cargar el inventario.', 'error');
      });
  }, []);
  */
  /*
   const guardarInventario = async (listaActualizada) => {
     try {
       const response = await fetch(`${API_URL}/api/inventario`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ items: listaActualizada })
       });
       if (!response.ok) throw new Error();
     } catch {
       mostrarMensaje('⚠️ Error al sincronizar con el servidor.', 'error');
     }
   };
   */

  const añadirAInventario = (ingrediente, cantidadAñadida, unidadElegida) => {
    const cantidadNumerica = parseFloat(cantidadAñadida) || 1;
    const index = ingredientesNevera.findIndex(i => i.nombre === ingrediente.nombre);

    let nuevaLista;
    if (index !== -1) {
      // Si ya existe, le sumamos la cantidad
      nuevaLista = [...ingredientesNevera];
      nuevaLista[index].cantidad = (nuevaLista[index].cantidad || 0) + cantidadNumerica;
      nuevaLista[index].unidad = unidadElegida;
    } else {
      // Si es nuevo, lo añadimos al final (sin la 'q' que había antes)
      nuevaLista = [...ingredientesNevera, { ...ingrediente, cantidad: cantidadNumerica, unidad: unidadElegida }];
    }

    setIngredientesNevera(nuevaLista);
    //guardarInventario(nuevaLista);
    mostrarMensaje(`Añadido: ${ingrediente.nombre}`, 'success');
  };

  const eliminarDeInventario = (nombre) => {
    const nuevaLista = ingredientesNevera.filter(i => i.nombre !== nombre);
    setIngredientesNevera(nuevaLista);
    //guardarInventario(nuevaLista);
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

            <div className="messages-under-add">
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