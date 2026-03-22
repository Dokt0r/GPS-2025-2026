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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const mostrarMensaje = (mensaje, tipo) => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast({ visible: false, mensaje: '', tipo: '' }), 3000);
  };

  useEffect(() => {
    fetch(`${API_URL}/api/ingredientes`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Error al conectar con el servidor');
        }
        return res.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setIngredientesBase(data);
        } else {
          // Si el servidor responde pero la base de datos está vacía
          setIngredientesBase([]);
          mostrarMensaje('⚠️ La base de datos de ingredientes está vacía.', 'error');
        }
      })
      .catch((error) => {
        // Si hay un error de conexión (ej. backend caído)
        console.error("Error cargando ingredientes:", error);
        setIngredientesBase([]);
        mostrarMensaje('❌ No se pudo conectar con el servidor para cargar los ingredientes.', 'error');
      });
  }, []);

  const añadirAInventario = (ingrediente, cantidadAñadida) => {
    const cantidadNumerica = parseFloat(cantidadAñadida) || 1;
    const index = ingredientesNevera.findIndex(i => i.nombre === ingrediente.nombre);

    let nuevaLista;
    if (index !== -1) {
      nuevaLista = [...ingredientesNevera];
      nuevaLista[index].cantidad = (nuevaLista[index].cantidad || 0) + cantidadNumerica;
    } else {
      nuevaLista = [...ingredientesNevera, { ...ingrediente, cantidad: cantidadNumerica }];
    }

    setIngredientesNevera(nuevaLista);
    mostrarMensaje(`Añadido: ${ingrediente.nombre}`, 'success');
  };
  
  const eliminarDeInventario = (nombre) => {
    const nuevaLista = ingredientesNevera.filter(i => i.nombre !== nombre);
    setIngredientesNevera(nuevaLista);
  };

  const buscarRecetas = () => {
    if (ingredientesNevera.length === 0) {
      mostrarMensaje('❌ Tu nevera está vacía. Añade algo primero.', 'error');
      return;
    }

    const partes = ingredientesNevera.map(ing => {
      const unidad = (ing.unidad ?? '').trim();
      const equivalencia = ing.equivalencia_g_ml ?? '';
      return `${ing.nombre.trim().toLowerCase()}|${ing.cantidad}|${unidad}|${equivalencia}`;
    });

    const queryEnBruto = partes.join(',');
    const querySegura = encodeURIComponent(queryEnBruto);
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

        <Routes>
          {/* RUTA 1: LA NEVERA */}
          <Route path="/" element={
            <section className="split-layout">
              <div className="left-panel">
                <Buscador
                  ingredientesBase={ingredientesBase}
                  onAñadir={añadirAInventario}
                  onError={(msg) => mostrarMensaje(msg, 'error')}
                />
                <div className="actions-nevera" style={{ marginTop: '20px', textAlign: 'center' }}>
                  <BotonAccion texto="Buscar Recetas" alHacerClic={buscarRecetas} />
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
                <ListaNevera ingredientes={ingredientesNevera} onEliminar={eliminarDeInventario} />
              </div>
            </section>
          } />

          {/* RUTA 2: LA LISTA DE RECETAS */}
          <Route path="/recetas" element={<VistaRecetas />} />

        </Routes>
      </main>
    </>
  );
}

export default App;