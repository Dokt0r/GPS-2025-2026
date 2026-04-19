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

// Componente para proteger rutas
const ProtectedRoute = ({ children }) => {
  const { usuario } = useAuth();
  // Si no hay usuario, redirigimos a registro
  if (!usuario) {
    return <Navigate to="/registro" replace />;
  }
  return children;
};

function App() {
  // DESPUÉS
  const { usuario, cargando, fetchConAuth } = useAuth();
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });
  const [isBuscadorOpen, setIsBuscadorOpen] = useState(false);

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const mostrarMensaje = (mensaje, tipo) => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast({ visible: false, mensaje: '', tipo: '' }), 3000);
  };

  // DESPUÉS
  useEffect(() => {
    if (!usuario) return;

    fetchConAuth(`${API_URL}/api/ingredientes`)
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
        mostrarMensaje('❌ No se pudo conectar con el servidor.', 'error');
      });
  }, [API_URL, usuario]);

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
  };

  const eliminarDeInventario = (nombre) => {
    setIngredientesNevera(ingredientesNevera.filter(i => i.nombre !== nombre));
  };

  const restarIngredientesReceta = (ingredientesReceta) => {
    setIngredientesNevera(prev => {
      const nuevaLista = prev.map(neveraIng => ({ ...neveraIng }));
      for (const recetaIng of ingredientesReceta) {
        const idx = nuevaLista.findIndex(n =>
          recetaIng.nombre.toLowerCase().includes(n.nombre.toLowerCase())
        );
        if (idx === -1) continue;

        const neveraIng = nuevaLista[idx];
        const factor = neveraIng.equivalencia_g_ml || 0;
        let nuevaCantidad = neveraIng.cantidad - recetaIng.cantidad;
        // (Aquí iría tu lógica de conversión de unidades simplificada para el ejemplo)

        nuevaLista[idx].cantidad = Math.max(0, parseFloat(nuevaCantidad.toFixed(2)));
      }
      return nuevaLista.filter(i => i.cantidad > 0);
    });
  };

  const buscarRecetas = () => {
    if (ingredientesNevera.length === 0) {
      mostrarMensaje('❌ Tu nevera está vacía.', 'error');
      return;
    }
    const partes = ingredientesNevera.map(ing =>
      `${ing.nombre.trim().toLowerCase()}|${ing.cantidad}|${ing.unidad ?? ''}|${ing.equivalencia_g_ml ?? ''}`
    );
    navigate(`/recetas?ingredientes=${encodeURIComponent(partes.join(','))}`);
  };

  if (cargando) return null;

  return (
    <NeveraContext.Provider value={{ ingredientesNevera, restarIngredientesReceta }}>
      <div className="bg-gradient"></div>
      <main className="app-container">
        <Routes>
          {/* RUTA PRINCIPAL PROTEGIDA */}
          <Route path="/" element={
            <ProtectedRoute>
              <section className="vista-principal-unica">
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
                  {toast.visible && !isBuscadorOpen && (
                    <div className={`toast-notification ${toast.tipo}`}>{toast.mensaje}</div>
                  )}
                </div>

                <button className="fab-añadir" onClick={() => setIsBuscadorOpen(true)}>+</button>

                {isBuscadorOpen && (
                  <div className="modal-overlay" onClick={() => setIsBuscadorOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <div className="buscador-normalizer">
                        <button className="btn-cerrar-modal" onClick={() => setIsBuscadorOpen(false)}>✕</button>
                        <Buscador ingredientesBase={ingredientesBase} onAñadir={añadirAInventario} />
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </ProtectedRoute>
          } />

          {/* OTRAS RUTAS PROTEGIDAS */}
          <Route path="/recetas" element={
            <ProtectedRoute><VistaRecetas /></ProtectedRoute>
          } />

          <Route path="/receta/:titulo" element={
            <ProtectedRoute><VistaDetalles /></ProtectedRoute>
          } />

          {/* RUTA DE REGISTRO (Pública, pero redirige si ya estás logueado) */}
          <Route path="/registro" element={
            usuario ? <Navigate to="/" /> : <Registro />
          } />
        </Routes>
      </main>
    </NeveraContext.Provider>
  );
}

export default App;