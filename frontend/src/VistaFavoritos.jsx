import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const VistaFavoritos = () => {
  const { fetchConAuth } = useAuth();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFavoritos = async () => {
      try {
        setCargando(true);
        setError(null);

        const res = await fetchConAuth(`${API_URL}/api/recetas/favoritos`);

        if (!res.ok) throw new Error('No se pudieron cargar tus favoritos.');

        const data = await res.json();
        setFavoritos(data.favoritos || []);
      } catch (err) {
        console.error('Error cargando favoritos:', err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchFavoritos();
  }, [API_URL, fetchConAuth]);

  return (
    <section className="vista-recetas-container">
      <div className="header-recetas-clean">
        <button className="btn-back-minimal" onClick={() => navigate('/')}>
          ← <span>Volver</span>
        </button>
        <h2>Mis Favoritos</h2>
      </div>

      {cargando && (
        <div className="loading-container">
          <p>Cargando tus recetas favoritas...</p>
        </div>
      )}

      {error && (
        <div className="error-container" style={{ textAlign: 'center', color: 'red', marginTop: '20px' }}>
          <p>{error}</p>
        </div>
      )}

      {!cargando && !error && favoritos.length === 0 && (
        <div className="empty-container" style={{ textAlign: 'center', marginTop: '40px' }}>
          <p style={{ color: 'var(--text-muted)' }}>
            Aún no tienes recetas favoritas. Guarda alguna desde el detalle de una receta.
          </p>
        </div>
      )}

      {!cargando && favoritos.length > 0 && (
        <div className="recetas-grid">
          {favoritos.map((r) => (
            <div
              key={r._id}
              className="receta-card card"
              onClick={() => navigate(`/receta/${encodeURIComponent(r.title)}`)}
              style={{ cursor: 'pointer' }}
            >
              <div className="receta-img-container">
                <img src={r.image_url} alt={r.title} className="receta-img" />
                <span
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    color: '#e53935',
                    fontSize: '1.2rem',
                  }}
                >
                  ♥
                </span>
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

export default VistaFavoritos;
