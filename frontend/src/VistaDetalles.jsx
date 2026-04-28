import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNevera } from './NeveraContext';
import { useAuth } from './AuthContext';

const tienesSuficiente = (neveraIng, recetaIng) => {
  const unidadN = (neveraIng.unidad || '').toLowerCase().trim();
  const unidadR = (recetaIng.unidad || '').toLowerCase().trim();
  const factor = neveraIng.equivalencia_g_ml || 0;

  if (unidadN === unidadR) return neveraIng.cantidad >= recetaIng.cantidad;
  if (['g', 'ml'].includes(unidadN) && unidadR === 'ud' && factor > 0)
    return (neveraIng.cantidad / factor) >= recetaIng.cantidad;
  if (unidadN === 'ud' && ['g', 'ml'].includes(unidadR) && factor > 0)
    return (neveraIng.cantidad * factor) >= recetaIng.cantidad;
  return false;
};

const codificarTitulo = (texto) =>
  encodeURIComponent(texto).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

const VistaDetalles = () => {
  const { fetchConAuth } = useAuth();
  const { titulo } = useParams();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { ingredientesNevera, restarIngredientesReceta } = useNevera();

  const [receta, setReceta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recetaCompletada, setRecetaCompletada] = useState(false);
  const [errorCompletar, setErrorCompletar] = useState(null);

  useEffect(() => {
    const fetchDetalleReceta = async () => {
      try {
        setCargando(true);
        setError(null);
        const response = await fetchConAuth(`${API_URL}/api/recetas/${codificarTitulo(titulo)}`);
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

  const handleCompletarReceta = async () => {
    if (!receta?.ingredients) return;

    try {
      const response = await fetchConAuth(`${API_URL}/api/recetas/completar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: receta.title,
          steps: receta.steps,
          ingredients: receta.ingredients,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorCompletar([{ nombre: data.error || 'Error al completar la receta.', motivo: '' }]);
        return;
      }

      const data = await response.json().catch(() => ({}));
      await restarIngredientesReceta(receta.ingredients, data.nevera);
      setErrorCompletar(null);
      setRecetaCompletada(true);
      setTimeout(() => navigate('/'), 3500);
    } catch {
      setErrorCompletar([{ nombre: 'No se pudo conectar con el servidor.', motivo: '' }]);
    }
  };

  if (cargando) {
    return (
      <main className="receta-view-wrapper">
        <div className="loading-container centrado-vertical">
          <p>Preparando la receta...</p>
        </div>
      </main>
    );
  }

  if (error || !receta) {
    return (
      <main className="receta-view-wrapper">
        <button className="btn-flotante-volver" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver
        </button>
        <div className="error-container centrado-vertical">
          <p>❌ {error || 'No se pudo cargar la receta.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="receta-view-wrapper">

      <button className="btn-flotante-volver" onClick={() => navigate(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        <span>Volver</span>
      </button>

      <section className="receta-hero-parallax">
        <img src={receta.image_url || receta.imagen} alt={receta.title} />
        <div className="receta-hero-overlay"></div>
      </section>

      <article className="receta-content-card">
        <header className="receta-header">
          <h1 className="receta-titulo-principal">{receta.title}</h1>
        </header>

        <div className="receta-grid-layout">

          {/* Columna Ingredientes */}
          <section className="receta-seccion">
            <h3 className="receta-seccion-titulo">Ingredientes</h3>
            <ul className="receta-lista-ing">
              {receta.ingredients && receta.ingredients.length > 0 ? (
                receta.ingredients.map((ing, i) => {
                  const neveraIng = ingredientesNevera.find(n =>
                    ing.nombre.toLowerCase().includes(n.nombre.toLowerCase())
                  );

                  let falta = false;
                  let mensajeError = "";

                  if (!neveraIng) {
                    falta = true;
                    mensajeError = "— No tienes este ingrediente";
                  } else {
                    const suficiente = tienesSuficiente(neveraIng, ing);
                    if (!suficiente) {
                      falta = true;
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
                        faltaCantidad = ing.cantidad;
                      }

                      faltaCantidad = Math.ceil(faltaCantidad * 100) / 100;
                      mensajeError = `— Faltan ${faltaCantidad} ${ing.unidad || ''}`.trim();
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
                        {ing.cantidad} {ing.unidad || ''}
                      </span>
                      <span
                        className="receta-ing-nombre"
                        style={falta ? { color: '#ff5252' } : {}}
                      >
                        {ing.nombre}
                        {falta && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '6px', opacity: 0.8 }}>
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
            <h3 className="receta-seccion-titulo">Preparación</h3>
            <div className="receta-timeline">
              {receta.steps && receta.steps.length > 0 ? (
                <>
                  {receta.steps.map((paso, i) => (
                    <div className="receta-step" key={i}>
                      <div className="receta-step-number">{i + 1}</div>
                      <div className="receta-step-text"><p>{paso}</p></div>
                    </div>
                  ))}

                  <div className="receta-step receta-step-completar">
                    {recetaCompletada ? (
                      <>
                        <div className="receta-step-number receta-step-number-completado">✓</div>
                        <span className="texto-exito">¡Receta completada! Buen provecho</span>
                      </>
                    ) : (
                      <button className="btn-completar-receta" onClick={handleCompletarReceta}>
                        <span>Completar Receta</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                    )}
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

export default VistaDetalles;