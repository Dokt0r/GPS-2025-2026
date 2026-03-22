import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VistaRecetas = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('ingredientes');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query) return;

    console.log("Haciendo fetch con la query desde la URL:", query);

    const fetchRecetasReales = async () => {
      try {
        setCargando(true);
        // Hacemos la petición real al backend
        // ✅ re-encodea por si acaso el router de React ya decodificó la URL
        const response = await fetch(`${API_URL}/api/recetas?ingredientes=${encodeURIComponent(query)}`);

        if (!response.ok) throw new Error('Error al conectar con el servidor');

        const data = await response.json();
        console.log("👉 RESPUESTA DEL BACKEND:", data); // Para que lo veas en consola

        setRecetas(data);
      } catch (err) {
        console.error(err);
        setError('Hubo un problema al buscar las recetas.');
      } finally {
        setCargando(false);
      }
    };

    fetchRecetasReales();
  }, [query]);

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
        <div className="recetas-grid">
          {recetas.map(r => (
            <div
              key={r._id}
              className="receta-card card"
              // Al hacer clic, vamos a la pantalla de detalle de esa receta
              onClick={() => navigate(`/receta/${encodeURIComponent(r.title)}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="receta-img-container">
                <img src={r.image_url} alt={r.title} className="receta-img" />
                {/* Mostramos la coincidencia que calculó el backend (ej: 3/5) */}
                <span className="receta-coincidentes">Match: {r.coincidenciaTexto}</span>
              </div>
              <div className="receta-info">
                <h3>{r.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default VistaRecetas;