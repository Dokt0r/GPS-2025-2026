import React, { useState } from 'react';

const Buscador = ({ ingredientesBase, onAñadir }) => {
  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);

  const manejarInput = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);

    if (valor.trim() !== '') {
      const filtrados = ingredientesBase.filter(ing =>
        ing.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerencias(filtrados);
    } else {
      setSugerencias([]);
    }
  };

  const seleccionar = (ing) => {
    onAñadir(ing);
    setBusqueda('');
    setSugerencias([]);
  };

  return (
    <section className="card">
      <div className="section-header">
        <div className="icon-box">🔍</div>
        <h2>Añadir Alimentos</h2>
      </div>
      <div className="buscador-wrapper">
        <input 
          type="text" 
          placeholder="Busca en tu base de datos..." 
          value={busqueda}
          onChange={manejarInput}
        />
        {sugerencias.length > 0 && (
          <div className="sugerencias-box">
            {sugerencias.map(ing => (
              <div 
                key={ing.id} 
                className="sugerencia-item" 
                onClick={() => seleccionar(ing)}
              >
                {ing.nombre} <small>({ing.categoria})</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Buscador;