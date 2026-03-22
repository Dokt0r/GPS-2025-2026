import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Componente que muestra los resultados de las recetas encontradas.
 * Incluye un sistema de paginación frontal para no sobrecargar la vista
 * cuando hay muchas coincidencias.
 */
const VistaRecetas = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('ingredientes');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Estados principales de datos
  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Estados para la paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const recetasPorPagina = 18; // Cantidad de recetas a mostrar por página

  /**
   * Hook que se dispara cuando la URL cambia (nueva búsqueda).
   * Hace la petición al backend y resetea la paginación a la página 1.
   */
  useEffect(() => {
    if (!query) return;

    console.log("Haciendo fetch con la query desde la URL:", query);

    const fetchRecetasReales = async () => {
      try {
        setCargando(true);
        setError(null);
        
        const response = await fetch(`${API_URL}/api/recetas?ingredientes=${encodeURIComponent(query)}`);

        if (!response.ok) throw new Error('Error al conectar con el servidor');

        const data = await response.json();
        console.log("👉 RESPUESTA DEL BACKEND:", data);

        setRecetas(data);
        setPaginaActual(1); // Importante: volver a la página 1 en cada nueva búsqueda

      } catch (err) {
        console.error(err);
        setError('Hubo un problema al buscar las recetas.');
      } finally {
        setCargando(false);
      }
    };

    fetchRecetasReales();
  }, [query]);

  // ==========================================
  // LÓGICA DE PAGINACIÓN
  // ==========================================
  
  // 1. Calculamos los índices para recortar el array principal
  const indiceUltimaReceta = paginaActual * recetasPorPagina;
  const indicePrimeraReceta = indiceUltimaReceta - recetasPorPagina;
  
  // 2. Extraemos solo las recetas de la página actual
  const recetasActuales = recetas.slice(indicePrimeraReceta, indiceUltimaReceta);
  
  // 3. Calculamos el total de páginas necesarias
  const totalPaginas = Math.ceil(recetas.length / recetasPorPagina);

  // Funciones de navegación de la paginación
  const paginaSiguiente = () => {
    if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1);
  };

  const paginaAnterior = () => {
    if (paginaActual > 1) setPaginaActual(paginaActual - 1);
  };

  const irAPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  return (
    <section className="vista-recetas-container">
      <div className="header-recetas-clean">
        <button className="btn-back-minimal" onClick={() => navigate(-1)}>
          ← <span>Volver a la Nevera</span>
        </button>
        <h2>Recetas sugeridas</h2>
      </div>

      {cargando && (
        <div className="loading-container">
          <p>Buscando en tu base de datos...</p>
        </div>
      )}

      {error && (
        <div className="error-container" style={{ textAlign: 'center', color: 'red', marginTop: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && recetas.length === 0 && (
        <div className="empty-container" style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>No encontramos recetas con esos ingredientes 😔</p>
        </div>
      )}

      {!cargando && recetas.length > 0 && (
        <>
          <div className="recetas-grid">
            {/* Renderizamos 'recetasActuales' en lugar del array completo 'recetas' */}
            {recetasActuales.map(r => (
              <div
                key={r._id}
                className="receta-card card"
                onClick={() => navigate(`/receta/${encodeURIComponent(r.title)}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="receta-img-container">
                  <img src={r.image_url} alt={r.title} className="receta-img" />
                  <span className="receta-coincidentes">Match: {r.coincidenciaTexto}</span>
                </div>
                <div className="receta-info">
                  <h3>{r.title}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* CONTROLES DE PAGINACIÓN */}
          {totalPaginas > 1 && (
            <div className="pagination-container">
              <button 
                className="btn-pagination" 
                onClick={paginaAnterior} 
                disabled={paginaActual === 1}
              >
                Anterior
              </button>
              
              <div className="pagination-numbers">
                {/* Genera un array visual de números de página */}
                {[...Array(totalPaginas)].map((_, index) => {
                  const numeroPagina = index + 1;
                  return (
                    <button
                      key={numeroPagina}
                      className={`btn-page-number ${paginaActual === numeroPagina ? 'active' : ''}`}
                      onClick={() => irAPagina(numeroPagina)}
                    >
                      {numeroPagina}
                    </button>
                  );
                })}
              </div>

              <button 
                className="btn-pagination" 
                onClick={paginaSiguiente} 
                disabled={paginaActual === totalPaginas}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default VistaRecetas;