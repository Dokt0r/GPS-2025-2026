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
    
    // Simulamos la carga (solo nombre, duración e imagen)
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
    <section style={{ width: '100%' }}>
      {/* Cabecera superior estructurada */}
      <div className="card header-recetas">
        <button className="btn-secundario" onClick={() => navigate(-1)}>
          ⬅ Volver a la Nevera
        </button>
        <div className="header-recetas-text">
            <h2>Recetas sugeridas</h2>
            <p>Ingredientes: <strong>{query}</strong></p>
        </div>
      </div>

      {cargando ? (
        <div className="card loading-card">
          <p>Pensando recetas... 🍳</p>
        </div>
      ) : (
        <div className="recetas-grid">
          {recetas.map(r => (
            <div key={r.id} className="receta-card card">
              <div className="receta-img-container">
                <img src={r.imagen} alt={r.titulo} className="receta-img" />
                {/* El tiempo ahora es un badge sobre la imagen */}
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