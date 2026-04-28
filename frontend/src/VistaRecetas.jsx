import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * COMPONENTE: VistaRecetas
 * Muestra la cuadrícula de recetas sugeridas basadas en los ingredientes buscados.
 * Incluye paginación que se guarda en la URL y códigos de color según la coincidencia.
 */
const VistaRecetas = () => {
  const { fetchConAuth } = useAuth();
  // Hooks de React Router para leer/escribir la URL y navegar
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ==========================================
  // 1. LECTURA DE LA URL
  // ==========================================
  // Extraemos los ingredientes que el usuario buscó
  const query = searchParams.get('ingredientes');

  // Extraemos la página en la que estábamos. Si no hay, por defecto es la 1.
  // Esto es vital para que al darle a "Volver" desde los detalles de receta, 
  // recordemos en qué página de la paginación nos habíamos quedado.
  const paginaUrl = parseInt(searchParams.get('pagina')) || 1;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // ==========================================
  // 2. ESTADOS DEL COMPONENTE
  // ==========================================
  const [recetas, setRecetas] = useState([]);      // Array con todas las recetas que devuelve el backend
  const [cargando, setCargando] = useState(true);  // Controla si mostramos el texto de "Cargando..."
  const [error, setError] = useState(null);        // Guarda el mensaje si falla la petición al servidor

  // El estado de la página actual se inicializa con lo que haya en la URL
  const [paginaActual, setPaginaActual] = useState(paginaUrl);
  const recetasPorPagina = 12; // Cuántas recetas mostramos a la vez

  // ==========================================
  // 3. EFECTOS (Peticiones y Sincronización)
  // ==========================================

  // Efecto A: Petición al backend cuando cambian los ingredientes
  useEffect(() => {
    if (!query) return;

    const fetchRecetasReales = async () => {
      try {
        setCargando(true);
        setError(null);

        // Llamada a la API codificando la URL por seguridad
        const response = await fetchConAuth(`${API_URL}/api/recetas?ingredientes=${encodeURIComponent(query)}`);

        if (!response.ok) throw new Error('Error al conectar con el servidor');

        const data = await response.json();
        setRecetas(data); // Guardamos todas las recetas de golpe

      } catch (err) {
        console.error("Error en fetchRecetasReales:", err);
        setError('Hubo un problema al buscar las recetas.');
      } finally {
        setCargando(false);
      }
    };

    fetchRecetasReales();
  }, [query, API_URL]);

  // Efecto B: Sincronizar el estado de la página con la URL
  // Cada vez que el usuario cambia de página, actualizamos la URL (ej: ?ingredientes=x&pagina=3)
  // Usamos { replace: true } para no llenar el historial del navegador de "páginas basura"
  useEffect(() => {
    if (query) {
      setSearchParams({ ingredientes: query, pagina: paginaActual }, { replace: true });
    }
  }, [paginaActual, query, setSearchParams]);


  // ==========================================
  // 4. LÓGICA DE COLORES PARA EL MATCH
  // ==========================================
  /**
   * Calcula el porcentaje de coincidencia y devuelve una clase CSS
   * @param {string} coincidenciaTexto - Ejemplo: "3/5" (tengo 3 de 5 ingredientes)
   */
  const obtenerColorMatch = (coincidenciaTexto) => {
    if (!coincidenciaTexto || !coincidenciaTexto.includes('/')) return 'match-neutral';

    // Separamos el string "3/5" en dos números: 3 y 5
    const partes = coincidenciaTexto.split('/');
    const tienen = parseInt(partes[0]);
    const total = parseInt(partes[1]);

    // Evitamos dividir por cero por si acaso
    if (total === 0) return 'match-neutral';

    const porcentaje = tienen / total;

    // Reglas de negocio para los colores:
    if (porcentaje >= 0.75 || tienen === total) return 'match-verde';    // +75% o todos
    if (porcentaje >= 0.40) return 'match-amarillo';                     // Entre 40% y 74%
    return 'match-rojo';                                                 // Menos del 40%
  };


  // ==========================================
  // 5. LÓGICA DE PAGINACIÓN (Frontend Slice)
  // ==========================================

  // Averiguamos qué trozo del array general nos toca mostrar en esta página
  const indiceUltimaReceta = paginaActual * recetasPorPagina;
  const indicePrimeraReceta = indiceUltimaReceta - recetasPorPagina;
  const recetasActuales = recetas.slice(indicePrimeraReceta, indiceUltimaReceta);

  const totalPaginas = Math.ceil(recetas.length / recetasPorPagina);

  // Funciones de navegación de páginas
  const irAPagina = (numero) => setPaginaActual(numero);
  const paginaAnterior = () => { if (paginaActual > 1) setPaginaActual(paginaActual - 1); };
  const paginaSiguiente = () => { if (paginaActual < totalPaginas) setPaginaActual(paginaActual + 1); };

  /**
   * Calcula qué números de página mostrar en los botones.
   * Crea una "ventana deslizante" de 5 botones como máximo para no romper el diseño.
   */
  const obtenerPaginasVisibles = () => {
    const MAX_VISIBLES = 5;
    let paginas = [];

    if (totalPaginas <= MAX_VISIBLES) {
      // Si hay pocas páginas, las mostramos todas
      for (let i = 1; i <= totalPaginas; i++) paginas.push(i);
    } else {
      // Si hay muchas, centramos la página actual dejando 2 a cada lado
      let inicio = Math.max(1, paginaActual - 2);
      let fin = Math.min(totalPaginas, paginaActual + 2);

      // Ajustes para los extremos (principio y final)
      if (paginaActual <= 3) fin = MAX_VISIBLES;
      if (paginaActual >= totalPaginas - 2) inicio = totalPaginas - 4;

      for (let i = inicio; i <= fin; i++) paginas.push(i);
    }
    return paginas;
  };

  const paginasVisibles = obtenerPaginasVisibles();


  // ==========================================
  // 6. RENDERIZADO DEL HTML (JSX)
  // ==========================================
  return (
    <section className="vista-recetas-container">

      {/* --- CABECERA --- */}
      <div className="header-recetas-clean">
        {/* Mandamos al usuario a la raíz (la nevera) para no liarnos con el historial */}
        <button className="btn-back-minimal" onClick={() => navigate('/')}>
          ← <span>Volver a la Nevera</span>
        </button>
        <h2>Recetas sugeridas</h2>
      </div>

      {/* --- ESTADOS DE CARGA Y ERROR --- */}
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

      {/* --- LISTADO DE RECETAS --- */}
      {!cargando && recetas.length > 0 && (
        <>
          <div className="recetas-grid">
            {recetasActuales.map(r => (
              <div
                key={r._id}
                className="receta-card card"
                // Al hacer clic, navegamos al detalle de la receta
                onClick={() => navigate(`/receta/${encodeURIComponent(r.title)}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="receta-img-container">
                  <img src={r.image_url} alt={r.title} className="receta-img" />

                  {/* Etiqueta dinámica: Calculamos su color con la función creada arriba */}
                  <span className={`receta-coincidentes ${obtenerColorMatch(r.coincidenciaTexto)}`}>
                    Match: {r.coincidenciaTexto}
                  </span>
                </div>

                <div className="receta-info">
                  <h3>{r.title}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* --- CONTROLES DE PAGINACIÓN --- */}
          {/* Solo se muestran si hay más de una página de resultados */}
          {totalPaginas > 1 && (
            <div className="pagination-container">

              <button
                className="btn-pagination-icon"
                onClick={() => irAPagina(1)}
                disabled={paginaActual === 1}
                title="Ir a la primera página"
              >
                «
              </button>

              <button
                className="btn-pagination"
                onClick={paginaAnterior}
                disabled={paginaActual === 1}
              >
                ‹ Anterior
              </button>

              {/* Botones numéricos generados por nuestra ventana deslizante */}
              <div className="pagination-numbers">
                {paginasVisibles.map(num => (
                  <button
                    key={num}
                    className={`btn-page-number ${paginaActual === num ? 'active' : ''}`}
                    onClick={() => irAPagina(num)}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                className="btn-pagination"
                onClick={paginaSiguiente}
                disabled={paginaActual === totalPaginas}
              >
                Siguiente ›
              </button>

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