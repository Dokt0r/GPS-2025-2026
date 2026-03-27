import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNevera } from './NeveraContext';

// ─────────────────────────────────────────────
// HELPERS DE UNIDADES (espejo del backend)
// ─────────────────────────────────────────────

const tienesSuficiente = (neveraIng, recetaIng) => {
  const unidadN = (neveraIng.unidad || '').toLowerCase().trim();
  const unidadR = (recetaIng.unidad || '').toLowerCase().trim();
  const factor = neveraIng.equivalencia_g_ml || 0;

  if (unidadN === unidadR) {
    return neveraIng.cantidad >= recetaIng.cantidad;
  }
  if (['g', 'ml'].includes(unidadN) && unidadR === 'ud' && factor > 0) {
    return (neveraIng.cantidad / factor) >= recetaIng.cantidad;
  }
  if (unidadN === 'ud' && ['g', 'ml'].includes(unidadR) && factor > 0) {
    return (neveraIng.cantidad * factor) >= recetaIng.cantidad;
  }
  return false;
};

const calcularFaltantes = (ingredientesReceta, ingredientesNevera) => {
  const faltantes = [];

  for (const recetaIng of ingredientesReceta) {
    const neveraIng = ingredientesNevera.find(n =>
      recetaIng.nombre.toLowerCase().includes(n.nombre.toLowerCase())
    );

    if (!neveraIng) {
      faltantes.push({
        nombre: recetaIng.nombre,
        cantidadNecesaria: recetaIng.cantidad,
        unidad: recetaIng.unidad || '',
        motivo: 'no disponible en tu nevera',
      });
    } else if (!tienesSuficiente(neveraIng, recetaIng)) {
      faltantes.push({
        nombre: recetaIng.nombre,
        cantidadNecesaria: recetaIng.cantidad,
        unidad: recetaIng.unidad || '',
        motivo: `solo tienes ${neveraIng.cantidad} ${neveraIng.unidad}`,
      });
    }
  }

  return faltantes;
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

const VistaDetalles = () => {
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

  // ── LÓGICA PRINCIPAL: COMPLETAR RECETA ──────
  const handleCompletarReceta = () => {
    if (!receta?.ingredients) return;

    const faltantes = calcularFaltantes(receta.ingredients, ingredientesNevera);

    if (faltantes.length > 0) {
      setErrorCompletar(faltantes);
      return;
    }

    restarIngredientesReceta(receta.ingredients);
    setErrorCompletar(null);
    setRecetaCompletada(true);
    setTimeout(() => navigate('/'), 3500);
  };

  // ── RENDERS DE ESTADO ───────────────────────

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
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

                  {/* ── NODO FINAL: COMPLETAR RECETA ── */}
                  <div className="receta-step receta-step-completar">
                    {recetaCompletada ? (
                      <>
                        <div className="receta-step-number receta-step-number-completado">
                          ✓
                        </div>
                        <span className="texto-exito">
                          ¡Receta completada! Buen provecho
                        </span>
                      </>
                    ) : (
                      <button className="btn-completar-receta" onClick={handleCompletarReceta}>
                        <span>Completar Receta</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    )}
                  </div>

                </>
              ) : (
                <p className="receta-texto-vacio">No hay instrucciones disponibles.</p>
              )}
            </div>

            {/* Error de ingredientes faltantes integrado en el flujo visual */}
            {!recetaCompletada && errorCompletar && errorCompletar.length > 0 && (
              <div className="alerta-faltantes-container">
                <p className="alerta-faltantes-titulo">
                  No tienes suficientes ingredientes:
                </p>
                <ul className="alerta-faltantes-lista">
                  {errorCompletar.map((f, i) => (
                    <li key={i} className="alerta-faltantes-item">
                      <span className="alerta-bullet">•</span>
                      <span>
                        <strong className="alerta-ingrediente-nombre">{f.nombre}</strong>
                        {' '}— necesitas {f.cantidadNecesaria} {f.unidad}, {f.motivo}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

        </div>
      </article>
    </main>
  );
};

const codificarTitulo = (texto) => {
  return encodeURIComponent(texto).replace(/[!'()*]/g, (c) => {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
};

export default VistaDetalles;