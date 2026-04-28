import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import BotonAccion from './components/BotonAccion';
import VistaRecetas from './VistaRecetas';
import VistaDetalles from './VistaDetalles';
import { NeveraContext } from './NeveraContext';
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
        if (!res.ok) throw new Error('Error al conectar con el servidor');
        return res.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setIngredientesBase(data);
        } else {
          setIngredientesBase([]);
          mostrarMensaje('⚠️ La base de datos de ingredientes está vacía.', 'error');
        }
      })
      .catch((error) => {
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

  /**
   * Resta los ingredientes usados en una receta de la nevera.
   * Si la cantidad resultante es <= 0 elimina el item directamente.
   * Maneja conversiones de unidades (g/ml <-> ud) igual que el backend.
   */
  const restarIngredientesReceta = (ingredientesReceta) => {
    setIngredientesNevera(prev => {
      const nuevaLista = prev.map(neveraIng => ({ ...neveraIng }));

      for (const recetaIng of ingredientesReceta) {
        const unidadR = (recetaIng.unidad || '').toLowerCase().trim();

        const idx = nuevaLista.findIndex(n =>
          recetaIng.nombre.toLowerCase().includes(n.nombre.toLowerCase())
        );
        if (idx === -1) continue;

        const neveraIng = nuevaLista[idx];
        const unidadN = (neveraIng.unidad || '').toLowerCase().trim();
        const factor = neveraIng.equivalencia_g_ml || 0;

        let nuevaCantidad = neveraIng.cantidad;

        if (unidadN === unidadR) {
          // Misma unidad: resta directa
          nuevaCantidad = neveraIng.cantidad - recetaIng.cantidad;
        } else if (['g', 'ml'].includes(unidadN) && unidadR === 'ud' && factor > 0) {
          // Nevera en g/ml, receta en ud -> convertir ud a g/ml
          nuevaCantidad = neveraIng.cantidad - (recetaIng.cantidad * factor);
        } else if (unidadN === 'ud' && ['g', 'ml'].includes(unidadR) && factor > 0) {
          // Nevera en ud, receta en g/ml -> convertir g/ml a ud
          nuevaCantidad = neveraIng.cantidad - (recetaIng.cantidad / factor);
        }

        nuevaLista[idx].cantidad = Math.max(0, parseFloat(nuevaCantidad.toFixed(2)));
      }

      // Eliminar los que hayan quedado en 0
      return nuevaLista.filter(i => i.cantidad > 0);
    });
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
    <NeveraContext.Provider value={{ ingredientesNevera, restarIngredientesReceta }}>
      <div className="bg-gradient"></div>
      <main className="app-container">
        <header>
          <div className="logo-placeholder"></div>
          <h1>LazyChef</h1>
          <p>Gestiona tus alimentos con inteligencia</p>
        </header>

        <Routes>
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

          <Route path="/recetas" element={<VistaRecetas />} />
          <Route path="/receta/:titulo" element={<VistaDetalles />} />
        </Routes>
      </main>
    </NeveraContext.Provider>
  );
}

export default App;
