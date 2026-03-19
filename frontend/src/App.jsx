import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import BotonAccion from './components/BotonAccion';
import VistaRecetas from './VistaRecetas';
import './App.css';

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });

const navigate = useNavigate();

  // Si existe VITE_API_URL la usa, si no, usa por defecto http://localhost:3000
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  //Función para mostrar mensajes
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

 const buscarRecetas = () => {
    if (ingredientesNevera.length === 0) {
      mostrarMensaje('❌ Tu nevera está vacía. Añade algo primero.', 'error');
      return;
    }

    const partes = ingredientesNevera.map(ing => {
      return `${ing.nombre.trim().toLowerCase()}:${ing.cantidad}:${ing.unidad.trim()}`;
    });

    const queryEnBruto = partes.join(',');
    const querySegura = encodeURIComponent(queryEnBruto);
    
    // EN LUGAR DE CAMBIAR UN ESTADO, NAVEGAMOS A LA URL REAL
    navigate(`/recetas?ingredientes=${querySegura}`);
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

        {/* DEFINIMOS LAS RUTAS DE LA APLICACIÓN */}
        <Routes>
          {/* RUTA PRINCIPAL: LA NEVERA */}
          <Route path="/" element={
            <section className="split-layout">
              <div className="left-panel">
                <Buscador
                  ingredientesBase={ingredientesBase}
                  onAñadir={añadirAInventario}
                  onError={(msg) => mostrarMensaje(msg, 'error')}
                />

                <div className="actions-nevera" style={{ marginTop: '20px', textAlign: 'center' }}>
                  <BotonAccion 
                    texto="Buscar Recetas" 
                    alHacerClic={buscarRecetas} 
                  />
                </div>

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
          } />

          {/* RUTA DE RECETAS */}
          <Route path="/recetas" element={<VistaRecetas />} />
        </Routes>

      </main>
    </>
  );
}

export default App;