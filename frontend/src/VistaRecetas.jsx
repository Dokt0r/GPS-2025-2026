import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const VistaRecetas = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const query = searchParams.get('ingredientes');

  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!query) return;
    
    console.log("Haciendo fetch con la query desde la URL:", query);
    
    setTimeout(() => {
      setRecetas([
        { 
          id: 1, 
          titulo: 'Revuelto salvavidas', 
          tiempo: '15 min',
          imagen: 'https://images.unsplash.com/photo-1621288143244-9c869273c38b?auto=format&fit=crop&w=400&q=80' 
        },
        { 
          id: 2, 
          titulo: 'Guiso de lo que sobró', 
          tiempo: '45 min',
          imagen: 'https://images.unsplash.com/photo-1548943487-a2e4b4461a52?auto=format&fit=crop&w=400&q=80' 
        },
        {
          id: 3, 
          titulo: 'Arroz frito rápido', 
          tiempo: '20 min',
          imagen: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=400&q=80'
        }
      ]);
      setCargando(false);
    }, 2000);
  }, [query]);

  return (
    <section className="vista-recetas-container">
      {/* Cabecera superior mejorada */}
      <div className="header-recetas-clean">
        <button className="btn-back-minimal" onClick={() => navigate(-1)}>
          ← <span>Volver a la Nevera</span>
        </button>
        <h2>Recetas sugeridas</h2>
      </div>

      {cargando ? (
        <div className="loading-container">
          <p>Pensando recetas...</p>
        </div>
      ) : (
        <div className="recetas-grid">
          {recetas.map(r => (
            <div key={r.id} className="receta-card card">
              <div className="receta-img-container">
                <img src={r.imagen} alt={r.titulo} className="receta-img" />
                <span className="receta-tiempo">⏱️ {r.tiempo}</span>
              </div>
              <div className="receta-info">
                <h3>{r.titulo}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default VistaRecetas;