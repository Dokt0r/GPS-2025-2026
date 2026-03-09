import React from 'react';

const ListaNevera = ({ ingredientes, onEliminar }) => {
  return (
    <section className="card">
      <div className="section-header">
        <div className="icon-box">🧊</div>
        <h2>Mi Inventario</h2>
      </div>
      
      {ingredientes.length === 0 ? (
        <div className="empty-state">
          <p>No hay nada por aquí...</p>
        </div>
      ) : (
        <ul className="nevera-list">
          {ingredientes.map(ing => (
            <li key={ing.id} className="ingrediente-item">
              <span>{ing.nombre}</span>
              <button 
                className="btn-delete" 
                onClick={() => onEliminar(ing.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default ListaNevera;