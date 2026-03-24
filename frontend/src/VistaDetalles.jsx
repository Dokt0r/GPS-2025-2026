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
        const response = await fetch(`${API_URL}/api/recetas/${encodeURIComponent(titulo)}`);

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
      <main className="detalle-pantalla-completa">
        <div className="loading-container" style={{ marginTop: '40vh' }}>
          <p>Preparando la receta...</p>
        </div>
      </main>
    );
  }

  if (error || !receta) {
    return (
      <main className="detalle-pantalla-completa">
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
    <main className="detalle-pantalla-completa">
      
      {/* Botón flotante estilo Glassmorphism */}
      <button className="btn-flotante-volver" onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        <span>Volver</span>
      </button>

      {/* Sección Hero: Imagen de borde a borde */}
      <div className="hero-section-modern">
        <img src={receta.image_url || receta.imagen} alt={receta.title} className="hero-image-modern" />
        <div className="hero-gradient-overlay"></div>
      </div>

      {/* Contenedor principal con efecto de tarjeta superpuesta */}
      <div className="contenido-superpuesto-modern">
        <div className="header-receta-modern">
          <h1 className="titulo-neon-modern">{receta.title}</h1>
        </div>

        <div className="grid-info-modern">
          
          {/* Ingredientes */}
          <div className="seccion-moderna">
            <h3 className="titulo-seccion-modern">
              <span className="icono-seccion">🛒</span> Ingredientes
            </h3>
            <ul className="lista-ingredientes-modern">
              {receta.ingredients && receta.ingredients.length > 0 ? (
                receta.ingredients.map((ing, i) => (
                  <li key={i} className="item-ingrediente">
                    <span className="ing-pildora">
                      {ing.cantidad} {ing.unidad ? ing.unidad : ''}
                    </span>
                    <span className="ing-nombre">{ing.nombre}</span>
                  </li>
                ))
              ) : (
                <p className="texto-vacio">No hay ingredientes especificados.</p>
              )}
            </ul>
          </div>

          {/* Preparación (Timeline) */}
          <div className="seccion-moderna">
            <h3 className="titulo-seccion-modern">
              <span className="icono-seccion">👩‍🍳</span> Preparación
            </h3>
            <div className="timeline-preparacion">
              {receta.steps && receta.steps.length > 0 ? (
                receta.steps.map((paso, i) => (
                  <div className="timeline-item" key={i}>
                    <div className="timeline-marker">{i + 1}</div>
                    <div className="timeline-content">
                      <p>{paso}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="texto-vacio">No hay instrucciones disponibles.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
};

export default VistaDetalles;