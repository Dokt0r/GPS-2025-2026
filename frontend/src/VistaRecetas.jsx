import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * Componente VistaRecetas
 * * Se encarga de recibir los ingredientes enviados por URL, hacer la petición 
 * al backend para obtener las recetas coincidentes y mostrarlas en una cuadrícula.
 * Implementa un sistema de paginación frontal con una "ventana deslizante" 
 * (estilo Amazon) para gestionar grandes volúmenes de resultados sin saturar la vista.
 */
const VistaRecetas = () => {
  // Hooks de enrutamiento de React Router
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extraemos la cadena de ingredientes de la URL (ej: ?ingredientes=pollo|200|g|...)
  const query = searchParams.get('ingredientes');
  
  // URL base del backend, priorizando la variable de entorno para producción
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ==========================================
  // ESTADOS PRINCIPALES
  // ==========================================
  const [recetas, setRecetas] = useState([]);      // Almacena el array completo de recetas recibidas
  const [cargando, setCargando] = useState(true);  // Controla el estado del spinner o mensaje de carga
  const [error, setError] = useState(null);        // Almacena mensajes de error de la API

  // ==========================================
  // ESTADOS DE PAGINACIÓN
  // ==========================================
  const [paginaActual, setPaginaActual] = useState(1);
  const recetasPorPagina = 12; // Número fijo de elementos a mostrar por cada vista

  /**
   * Efecto Secundario (useEffect) para la obtención de datos.
   * Se dispara cada vez que cambia la 'query' en la URL.
   */
  useEffect(() => {
    // Si no hay ingredientes en la URL, no hacemos la petición
    if (!query) return;

    const fetchRecetasReales = async () => {
      try {
        // Reseteamos estados antes de la nueva petición
        setCargando(true);
        setError(null);
        
        // Petición al backend asegurando que la query esté correctamente codificada (URL-safe)
        const response = await fetch(`${API_URL}/api/recetas?ingredientes=${encodeURIComponent(query)}`);

        if (!response.ok) throw new Error('Error al conectar con el servidor');

        const data = await response.json();
        
        // Guardamos las recetas devueltas en el estado principal
        setRecetas(data);
        
        // CRÍTICO: Si el usuario hace una nueva búsqueda, debemos devolverlo a la página 1
        setPaginaActual(1); 

      } catch (err) {
        console.error("Error en fetchRecetasReales:", err);
        setError('Hubo un problema al buscar las recetas.');
      } finally {
        // Independientemente de si falla o acierta, quitamos el estado de carga
        setCargando(false);
      }
    };

    fetchRecetasReales();
  }, [query, API_URL]);

  // ==========================================
  // LÓGICA DE RECORTES (SLICE) PARA PAGINACIÓN
  // ==========================================
  
  // 1. Calculamos qué porción del array total corresponde a la página actual
  const indiceUltimaReceta = paginaActual * recetasPorPagina;
  const indicePrimeraReceta = indiceUltimaReceta - recetasPorPagina;
  
  // 2. Extraemos solo las recetas que tocan en esta página
  const recetasActuales = recetas.slice(indicePrimeraReceta, indiceUltimaReceta);
  
  // 3. Calculamos el total de páginas necesarias redondeando hacia arriba
  const totalPaginas = Math.ceil(recetas.length / recetasPorPagina);

  // Funciones básicas de navegación
  const irAPagina = (numero) => setPaginaActual(numero);
  const paginaAnterior = () => { if (paginaActual > 1) setPaginaActual(paginaActual - 1); };
  const paginaSiguiente = () => { if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1); };

  /**
   * Calcula una "ventana deslizante" de botones de paginación.
   * Garantiza que el usuario vea un máximo de 5 botones numéricos a la vez.
   * Se ajusta dinámicamente si el usuario está cerca del principio o del final.
   * * @returns {Array<number>} Array con los números de página que deben renderizarse.
   */
  const obtenerPaginasVisibles = () => {
    const MAX_VISIBLES = 5;
    let paginas = [];

    // Caso A: Hay menos páginas en total que el máximo visible (ej: solo hay 3 páginas)
    if (totalPaginas <= MAX_VISIBLES) {
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } 
    // Caso B: Hay muchas páginas, necesitamos calcular la ventana
    else {
      // Por defecto, centramos la página actual (2 páginas atrás, 2 adelante)
      let inicio = Math.max(1, paginaActual - 2);
      let fin = Math.min(totalPaginas, paginaActual + 2);

      // Ajuste si estamos al principio: forzamos que el final llegue a 5
      // Ej: Si estamos en la pag 1, mostraría [1,2,3], forzamos a [1,2,3,4,5]
      if (paginaActual <= 3) {
        fin = MAX_VISIBLES;
      }
      
      // Ajuste si estamos al final: forzamos que el inicio retroceda para mantener 5 botones
      // Ej: Si hay 20 pags y estamos en la 19, mostraría [17,18,19,20], forzamos a [16,17,18,19,20]
      if (paginaActual >= totalPaginas - 2) {
        inicio = totalPaginas - 4;
      }

      // Rellenamos el array con los números calculados
      for (let i = inicio; i <= fin; i++) {
        paginas.push(i);
      }
    }
    return paginas;
  };

  const paginasVisibles = obtenerPaginasVisibles();

  // ==========================================
  // RENDERIZADO DEL COMPONENTE (JSX)
  // ==========================================
  return (
    <section className="vista-recetas-container">
      
      {/* CABECERA */}
      <div className="header-recetas-clean">
        <button className="btn-back-minimal" onClick={() => navigate(-1)}>
          ← <span>Volver a la Nevera</span>
        </button>
        <h2>Recetas sugeridas</h2>
      </div>

      {/* ESTADO 1: CARGANDO */}
      {cargando && (
        <div className="loading-container">
          <p>Buscando en tu base de datos...</p>
        </div>
      )}

      {/* ESTADO 2: ERROR */}
      {error && (
        <div className="error-container" style={{ textAlign: 'center', color: 'red', marginTop: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      {/* ESTADO 3: SIN RESULTADOS (Datos cargados, pero array vacío) */}
      {!cargando && !error && recetas.length === 0 && (
        <div className="empty-container" style={{ textAlign: 'center', marginTop: '20px' }}>
          <p>No encontramos recetas con esos ingredientes 😔</p>
        </div>
      )}

      {/* ESTADO 4: CON RESULTADOS */}
      {!cargando && recetas.length > 0 && (
        <>
          {/* CUADRÍCULA DE RECETAS */}
          <div className="recetas-grid">
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

          {/* CONTROLES DE PAGINACIÓN (Solo visibles si hay más de 1 página) */}
          {totalPaginas > 1 && (
            <div className="pagination-container">
              
              {/* Botón: Ir a la Primera Página (Estilo: « ) */}
              <button 
                className="btn-pagination-icon" 
                onClick={() => irAPagina(1)} 
                disabled={paginaActual === 1}
                title="Ir a la primera página"
              >
                «
              </button>

              {/* Botón: Anterior (Estilo: ‹ Anterior ) */}
              <button 
                className="btn-pagination" 
                onClick={paginaAnterior} 
                disabled={paginaActual === 1}
              >
                ‹ Anterior
              </button>
              
              {/* Números de página interactivos (Ventana de 5) */}
              <div className="pagination-numbers">
                {paginasVisibles.map(num => (
                  <button
                    key={num}
                    // Aplicamos la clase 'active' si es la página en la que estamos
                    className={`btn-page-number ${paginaActual === num ? 'active' : ''}`}
                    onClick={() => irAPagina(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Botón: Siguiente (Estilo: Siguiente › ) */}
              <button 
                className="btn-pagination" 
                onClick={paginaSiguiente} 
                disabled={paginaActual === totalPaginas}
              >
                Siguiente ›
              </button>

              {/* Botón: Ir a la Última Página (Estilo: » ) */}
              <button 
                className="btn-pagination-icon" 
                onClick={() => irAPagina(totalPaginas)} 
                disabled={paginaActual === totalPaginas}
                title={`Ir a la última página (${totalPaginas})`}
              >
                »
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default VistaRecetas;