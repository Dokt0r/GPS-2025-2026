import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const VistaDetalles = () => {
  const { titulo } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [receta, setReceta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recetaCompletada, setRecetaCompletada] = useState(false);

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

  const handleCompletarReceta = () => {
    setRecetaCompletada(true);
  };

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
                receta.ingredients.map((ing, i) => (
                  <li key={i} className="receta-ing-item">
                    <span className="receta-ing-badge">
                      {ing.cantidad} {ing.unidad ? ing.unidad : ''}
                    </span>
                    <span className="receta-ing-nombre">{ing.nombre}</span>
                  </li>
                ))
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
                <>
                  {receta.steps.map((paso, i) => (
                    <div className="receta-step" key={i}>
                      <div className="receta-step-number">{i + 1}</div>
                      <div className="receta-step-text">
                        <p>{paso}</p>
                      </div>
                    </div>
                  ))}

                  {/* Nodo final: Botón Completar Receta */}
                  <div className="receta-step receta-step-completar">
                    <div
                      className="receta-step-number"
                      style={{
                        background: recetaCompletada
                          ? 'linear-gradient(135deg, #00e676, #00c853)'
                          : 'transparent',
                        border: '2px solid #00e676',
                        color: recetaCompletada ? '#0d1117' : '#00e676',
                        fontSize: '1.2rem',
                        flexShrink: 0,
                      }}
                    >
                      {recetaCompletada ? '✓' : ''}
                    </div>
                    <div className="receta-step-text" style={{ display: 'flex', alignItems: 'center' }}>
                      {recetaCompletada ? (
                        <span style={{
                          color: '#00e676',
                          fontWeight: '600',
                          fontSize: '1rem',
                        }}>
                          ¡Receta completada! Buen provecho
                        </span>
                      ) : (
                        <button
                          className="btn-completar-receta"
                          onClick={handleCompletarReceta}
                          style={{
                            background: 'transparent',
                            border: '2px solid #00e676',
                            color: '#00e676',
                            padding: '10px 24px',
                            borderRadius: '50px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            letterSpacing: '0.05em',
                            transition: 'all 0.25s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = '#00e676';
                            e.currentTarget.style.color = '#0d1117';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#00e676';
                          }}
                        >
                          <span>Completar Receta</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </>
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
