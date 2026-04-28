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
        
        // LC-20-1: Ordenamos las recetas alfabéticamente por el título
        const favoritosOrdenados = (data.favoritos || []).sort((a, b) => 
          a.title.localeCompare(b.title)
        );
        
        setFavoritos(favoritosOrdenados);
      } catch (err) {
        console.error('Error cargando favoritos:', err);
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    fetchFavoritos();
  }, [API_URL, fetchConAuth]);

  //  Lógica para eliminar un elemento de la lista
  const eliminarFavorito = async (e, recetaId) => {
    e.stopPropagation();

    try {
      // Hacemos la llamada DELETE al backend
      const res = await fetchConAuth(`${API_URL}/api/recetas/favoritos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recetaId })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar la receta');
      }

      // Si el backend borró con éxito, actualizamos el estado de React 
      // filtrando la receta eliminada para que desaparezca al instante (sin recargar la página)
      setFavoritos(prevFavoritos => prevFavoritos.filter(r => r._id !== recetaId));

    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('No se pudo quitar la receta de favoritos. ' + err.message);
    }
  };

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
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <div className="receta-img-container">
                <img src={r.image_url} alt={r.title} className="receta-img" />
                
                {/* Botón de eliminación reemplazando al span del corazón estático */}
                <button
                  onClick={(e) => eliminarFavorito(e, r._id)}
                  title="Quitar de favoritos"
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#e53935',
                    fontSize: '1.2rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'transform 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  ✖
                </button>
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