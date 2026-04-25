import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNevera } from './NeveraContext';
import { useAuth } from './AuthContext';

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
  const [guardandoFavorito, setGuardandoFavorito] = useState(false);
  const [favoritoGuardado, setFavoritoGuardado] = useState(false);
  const [mensajeFavorito, setMensajeFavorito] = useState('');

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

  // ── LÓGICA PRINCIPAL: COMPLETAR RECETA ──────
  const handleCompletarReceta = async () => {
    if (!receta?.ingredients) return;

    const faltantes = calcularFaltantes(receta.ingredients, ingredientesNevera);

    /*if (faltantes.length > 0) {
      setErrorCompletar(faltantes);
      return;
    } */

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

      restarIngredientesReceta(receta.ingredients);
      setErrorCompletar(null);
      setRecetaCompletada(true);
      setTimeout(() => navigate('/'), 3500);
    } catch {
      setErrorCompletar([{ nombre: 'No se pudo conectar con el servidor.', motivo: '' }]);
    }
  };

  const handleGuardarFavorito = async () => {
    const recetaId = receta?._id || receta?.id;
    if (!recetaId || guardandoFavorito) return;

    setGuardandoFavorito(true);
    setMensajeFavorito('');

    try {
      const response = await fetchConAuth(`${API_URL}/api/recetas/favoritos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recetaId })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMensajeFavorito(data.error || 'No se pudo guardar en favoritos.');
        return;
      }

      setFavoritoGuardado(true);
      setMensajeFavorito(data.mensaje || 'Receta añadida a favoritos.');
    } catch {
      setMensajeFavorito('No se pudo conectar con el servidor.');
    } finally {
      setGuardandoFavorito(false);
    }
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        <span>Volver</span>
      </button>

      <section className="receta-hero-parallax">
        <img src={receta.image_url || receta.imagen} alt={receta.title} />
        <div className="receta-hero-overlay"></div>
      </section>

      <article className="receta-content-card">
        <header className="receta-header">
          <div className="titulo-con-favorito">
            <h1 className="receta-titulo-principal">{receta.title}</h1>
            
            <button
              className="btn-favorito"
              aria-label="Favorito"
              aria-pressed={favoritoGuardado}
              onClick={handleGuardarFavorito}
              disabled={guardandoFavorito}
            >
              <svg 
                viewBox="0 0 24 24" 
                width="26" 
                height="26" 
                stroke="currentColor" 
                strokeWidth="2" 
                fill={favoritoGuardado ? 'currentColor' : 'none'}
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          {mensajeFavorito && (
            <p role="status" className="receta-texto-vacio">{mensajeFavorito}</p>
          )}
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