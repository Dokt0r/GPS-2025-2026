import React from 'react';

const ListaNevera = ({ ingredientes, onEliminar }) => {
  return (
    <section className="card inventory-section">
      <div className="section-header">
        <h2>Mi Nevera Virtual</h2>
      </div>

      <div className="lista-container-scroll">
        {ingredientes.length === 0 ? (
          <div id="empty-state" className="empty-state">
            <div className="image-placeholder"></div>
            <p>Tu nevera está vacía.</p>
          </div>
        ) : (
          <ul id="mi-nevera">
            {ingredientes.map((ing, index) => (
              <li key={index} className="ingrediente-item-anim">
                <span>{ing.nombre}</span>
                <button onClick={() => onEliminar(ing.nombre)} className="btn-delete">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ListaNevera;