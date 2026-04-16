import React from 'react';

const ListaNevera = ({ ingredientes, onEliminar }) => {
  const ingredientesOrdenados = [...ingredientes].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  return (
    <section className="card inventory-section">
      <div className="section-header">
        <h2>Mi Nevera Virtual</h2>
      </div>

      <div className="lista-container-scroll">
        {ingredientes.length === 0 ? (
          <div className="empty-state">
            <div className="image-placeholder"></div>
            <p>Tu nevera está vacía. Añade algo arriba.</p>
          </div>
        ) : (
          <ul id="mi-nevera">
            {ingredientesOrdenados.map((ing, index) => (
              <li key={index} className="ingrediente-item">
                <div className="item-info">
                  <span className="item-nombre">{ing.nombre}</span>
                  <span className="badge-cantidad">
                    {ing.cantidad} {ing.unidad}
                  </span>
                </div>
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