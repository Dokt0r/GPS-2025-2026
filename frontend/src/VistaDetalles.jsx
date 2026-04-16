import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const VistaDetalles = () => {
  const { titulo } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [receta, setReceta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetalleReceta = async () => {
      try {
        setCargando(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/recetas/${codificarTitulo(titulo)}`);
        

        if (!response.ok) {
          if (response.status === 404) throw new Error('Receta no encontrada.');
          throw new Error('Error al conectar con el servidor.');
        }

        const data = await response.json();
        setReceta(data);
      } catch (err) {
        console.error("Error cargando detalle:", err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    if (titulo) fetchDetalleReceta();
  }, [titulo, API_URL]);

  if (cargando) {
    return (
      <main className="receta-view-wrapper">
        <div className="loading-container" style={{ marginTop: '40vh' }}>
          <p>Preparando la receta...</p>
        </div>
      </main>
    );
  }

  if (error || !receta) {
    return (
      <main className="receta-view-wrapper">
        <button className="btn-flotante-volver" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Volver
        </button>
        <div className="error-container" style={{ marginTop: '40vh', textAlign: 'center' }}>
          <p>❌ {error || 'No se pudo cargar la receta.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="receta-view-wrapper">
      
      {/* Botón Flotante */}
      <button className="btn-flotante-volver" onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span>Volver</span>
      </button>

      {/* Hero Parallax Puro */}
      <section className="receta-hero-parallax">
        <img src={receta.image_url || receta.imagen} alt={receta.title} />
        <div className="receta-hero-overlay"></div>
      </section>

      {/* Contenido principal que solapa */}
      <article className="receta-content-card">
        <header className="receta-header">
          <h1 className="receta-titulo-principal">{receta.title}</h1>
        </header>

        <div className="receta-grid-layout">
          
          {/* Columna Ingredientes */}
           <section className="receta-seccion">
            <h3 className="receta-seccion-titulo"> Ingredientes</h3>
            <ul className="receta-lista-ing">
              {receta.ingredients && receta.ingredients.length > 0 ? (
                receta.ingredients.map((ing, i) => {
                  
                  // 1. Buscamos el ingrediente en la nevera
                  const neveraIng = ingredientesNevera.find(n =>
                    ing.nombre.toLowerCase().includes(n.nombre.toLowerCase())
                  );

                  let falta = false;
                  let mensajeError = "";

                  // 2. Evaluamos si falta totalmente o parcialmente
                  if (!neveraIng) {
                    falta = true;
                    mensajeError = "— No tienes este ingrediente";
                  } else {
                    const suficiente = tienesSuficiente(neveraIng, ing);
                    if (!suficiente) {
                      falta = true;
                      
                      // Calculamos la cantidad que falta usando tu lógica de equivalencias
                      const unidadN = (neveraIng.unidad || '').toLowerCase().trim();
                      const unidadR = (ing.unidad || '').toLowerCase().trim();
                      const factor = neveraIng.equivalencia_g_ml || 0;
                      
                      let faltaCantidad = 0;

                      if (unidadN === unidadR) {
                        faltaCantidad = ing.cantidad - neveraIng.cantidad;
                      } else if (['g', 'ml'].includes(unidadN) && unidadR === 'ud' && factor > 0) {
                        faltaCantidad = ing.cantidad - (neveraIng.cantidad / factor);
                      } else if (unidadN === 'ud' && ['g', 'ml'].includes(unidadR) && factor > 0) {
                        faltaCantidad = ing.cantidad - (neveraIng.cantidad * factor);
                      } else {
                        // Por si acaso hay un desajuste de unidades raro
                        faltaCantidad = ing.cantidad;
                      }

                      // Redondeamos a 2 decimales para evitar números muy largos
                      faltaCantidad = Math.ceil(faltaCantidad * 100) / 100;
                      mensajeError = `— Te faltan ${faltaCantidad} ${ing.unidad || ''}`.trim();
                    }
                  }

                  return (
                    <li key={i} className="receta-ing-item">
                      <span
                        className="receta-ing-badge"
                        style={falta ? {
                          background: 'rgba(255, 82, 82, 0.15)',
                          border: '1px solid rgba(255, 82, 82, 0.5)',
                          color: '#ff5252',
                        } : {}}
                      >
                        {ing.cantidad} {ing.unidad ? ing.unidad : ''}
                      </span>
                      <span
                        className="receta-ing-nombre"
                        style={falta ? { color: '#ff5252' } : {}}
                      >
                        {ing.nombre}
                        {falta && (
                          <span style={{
                            fontSize: '0.75rem',
                            marginLeft: '6px',
                            opacity: 0.8,
                          }}>
                            {mensajeError}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })
              ) : (
                <p className="receta-texto-vacio">No hay ingredientes especificados.</p>
              )}
            </ul>
          </section>

          {/* Columna Preparación */}
          <section className="receta-seccion">
            <h3 className="receta-seccion-titulo"> Preparación</h3>
            <div className="receta-timeline">
              {receta.steps && receta.steps.length > 0 ? (
                receta.steps.map((paso, i) => (
                  <div className="receta-step" key={i}>
                    <div className="receta-step-number">{i + 1}</div>
                    <div className="receta-step-text">
                      <p>{paso}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="receta-texto-vacio">No hay instrucciones disponibles.</p>
              )}
            </div>
          </section>

        </div>
      </article>
    </main>
  );
};

// Esta función fuerza la codificación de los paréntesis y otros símbolos rebeldes
const codificarTitulo = (texto) => {
  return encodeURIComponent(texto).replace(/[!'()*]/g, (c) => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
};

export default VistaDetalles;