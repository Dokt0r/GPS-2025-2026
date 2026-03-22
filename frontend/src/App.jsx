import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import BotonAccion from './components/BotonAccion';
import VistaRecetas from './VistaRecetas';
import './App.css';

/**
 * Componente principal de la aplicación LazyChef.
 * Gestiona el estado global del inventario del usuario (la nevera), la conexión
 * inicial con la base de datos para obtener los ingredientes disponibles, 
 * y el sistema global de notificaciones (toast).
 */
function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);
  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });

  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  /**
   * Muestra una notificación temporal (toast) en la interfaz de usuario.
   * Útil para dar feedback visual de éxito o error en las operaciones.
   * La notificación desaparece automáticamente tras 3 segundos.
   */
  const mostrarMensaje = (mensaje, tipo) => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast({ visible: false, mensaje: '', tipo: '' }), 3000);
  };

  /**
   * Hook de inicialización. Se ejecuta una única vez al montar el componente.
   * Realiza una petición GET al backend para cargar el catálogo completo de 
   * ingredientes. Maneja estados de error y de base de datos vacía.
   */
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
          // El servidor responde correctamente, pero la colección está vacía
          setIngredientesBase([]);
          mostrarMensaje('⚠️ La base de datos de ingredientes está vacía.', 'error');
        }
      })
      .catch((error) => {
        // Fallo de red o servidor caído
        console.error("Error cargando ingredientes:", error);
        setIngredientesBase([]);
        mostrarMensaje('❌ No se pudo conectar con el servidor para cargar los ingredientes.', 'error');
      });
  }, []);

  /**
   * Añade un ingrediente al inventario del usuario.
   * Si el ingrediente ya existe en la nevera, suma la nueva cantidad a la existente.
   * Si es nuevo, lo inserta en el array manteniendo sus propiedades originales (unidad, equivalencia).
   */
  const añadirAInventario = (ingrediente, cantidadAñadida) => {
    const cantidadNumerica = parseFloat(cantidadAñadida) || 1;
    const index = ingredientesNevera.findIndex(i => i.nombre === ingrediente.nombre);

    let nuevaLista;
    if (index !== -1) {
      // Clona el array y suma la cantidad al elemento existente
      nuevaLista = [...ingredientesNevera];
      nuevaLista[index].cantidad = (nuevaLista[index].cantidad || 0) + cantidadNumerica;
    } else {
      // Añade el nuevo objeto ingrediente al final del array
      nuevaLista = [...ingredientesNevera, { ...ingrediente, cantidad: cantidadNumerica }];
    }

    setIngredientesNevera(nuevaLista);
    mostrarMensaje(`Añadido: ${ingrediente.nombre}`, 'success');
  };
  
  /**
   * Elimina completamente un ingrediente del inventario del usuario
   * utilizando su nombre como identificador único.
   */
  const eliminarDeInventario = (nombre) => {
    const nuevaLista = ingredientesNevera.filter(i => i.nombre !== nombre);
    setIngredientesNevera(nuevaLista);
  };

  /**
   * Procesa los ingredientes actuales de la nevera y redirige al usuario a la vista de recetas.
   * Transforma el array de objetos en un string formateado (nombre|cantidad|unidad|equivalencia)
   * que se envía de forma segura a través de los parámetros de la URL (Query Params).
   */
  const buscarRecetas = () => {
    if (ingredientesNevera.length === 0) {
      mostrarMensaje('❌ Tu nevera está vacía. Añade algo primero.', 'error');
      return;
    }

    // Formatear los datos para enviarlos por URL
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
          {/* RUTA 1: VISTA PRINCIPAL (LA NEVERA) */}
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

          {/* RUTA 2: RESULTADOS DE BÚSQUEDA (RECETAS) */}
          <Route path="/recetas" element={<VistaRecetas />} />

        </Routes>
      </main>
    </>
  );
}

export default App;