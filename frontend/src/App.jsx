import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import BotonAccion from './components/BotonAccion';
import Registro from './components/Registro';
import VistaRecetas from './VistaRecetas';
import VistaDetalles from './VistaDetalles';
import { NeveraContext } from './NeveraContext';
import { useAuth } from './AuthContext';
import './App.css';

function App() {
  const { usuario } = useAuth();
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });
  
  // NUEVO ESTADO: Controla si el modal del buscador está abierto
  const [isBuscadorOpen, setIsBuscadorOpen] = useState(false);

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
    // Opcional: puedes descomentar la siguiente línea si quieres que el modal se cierre automáticamente tras añadir
    // setIsBuscadorOpen(false); 
  };

  const eliminarDeInventario = (nombre) => {
    const nuevaLista = ingredientesNevera.filter(i => i.nombre !== nombre);
    setIngredientesNevera(nuevaLista);
  };

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
          nuevaCantidad = neveraIng.cantidad - recetaIng.cantidad;
        } else if (['g', 'ml'].includes(unidadN) && unidadR === 'ud' && factor > 0) {
          nuevaCantidad = neveraIng.cantidad - (recetaIng.cantidad * factor);
        } else if (unidadN === 'ud' && ['g', 'ml'].includes(unidadR) && factor > 0) {
          nuevaCantidad = neveraIng.cantidad - (recetaIng.cantidad / factor);
        }

        nuevaLista[idx].cantidad = Math.max(0, parseFloat(nuevaCantidad.toFixed(2)));
      }

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

        <Routes>
          <Route path="/" element={
            usuario ? (
            <section className="vista-principal-unica">
              
              {/* --- 1. CONTENIDO PRINCIPAL: LA NEVERA --- */}

              <header>
                <div className="logo-placeholder"></div>
                <h1>LazyChef</h1>
                <p>Gestiona tus alimentos con inteligencia</p>
              </header>

              <div className="actions-nevera">
                  <BotonAccion texto="Buscar Recetas" alHacerClic={buscarRecetas} />
                </div>

              <div className="nevera-container">
                <ListaNevera ingredientes={ingredientesNevera} onEliminar={eliminarDeInventario} />
                
                {/* Fluye debajo de la lista y no requiere "position: fixed" */}
                {toast.visible && !isBuscadorOpen && (
                  <div className={`toast-notification ${toast.tipo}`} style={{ marginTop: '15px', textAlign: 'center' }}>
                    {toast.mensaje}
                  </div>
                )}

              </div>

              {/* --- 2. BOTÓN FLOTANTE ESTILO GOOGLE DRIVE --- */}
              <button 
                className="fab-añadir" 
                onClick={() => setIsBuscadorOpen(true)}
                aria-label="Añadir ingrediente"
              >
                +
              </button>

              {/* --- 3. MODAL DEL BUSCADOR --- */}
             {isBuscadorOpen && (
                <div className="modal-overlay" onClick={() => setIsBuscadorOpen(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    
                    {/* NUEVO CONTENEDOR ENVOLVENTE */}
                    <div className="buscador-normalizer">
                      <button className="btn-cerrar-modal" onClick={() => setIsBuscadorOpen(false)}>✕</button>
                      
                      <Buscador
                        ingredientesBase={ingredientesBase}
                        onAñadir={añadirAInventario}
                      />
                    </div>

                    {toast.visible && !isBuscadorOpen && (
                    <div className={`toast-notification ${toast.tipo}`} style={{ marginTop: '15px', textAlign: 'center' }}>
                      {toast.mensaje}
                    </div>
                )}
                  </div>
                </div>
              )}
              
            </section>
            ) : (
              <Registro />
            )
          } />

          <Route path="/recetas" element={<VistaRecetas />} />
          <Route path="/receta/:titulo" element={<VistaDetalles />} />
          <Route path="/registro" element={usuario ? <Navigate to="/" /> : <Registro />} />
        </Routes>
      </main>
    </NeveraContext.Provider>
  );
}

export default App;