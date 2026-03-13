import React, { useState, useEffect } from 'react';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import './App.css';

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const API_URL = 'http://localhost:3000';

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
      const nuevaLista = [...ingredientesNevera];
      const cantidadActual = nuevaLista[index].cantidad || 1;
      nuevaLista[index].cantidad = cantidadActual + cantidadNumerica;
      nuevaLista[index].unidad = unidadElegida;

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
      </main >
    </>
  );
}


export default App;