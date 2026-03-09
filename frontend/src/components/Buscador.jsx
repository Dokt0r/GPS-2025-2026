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

  const intentarAñadir = () => {
    // Validación estricta: solo si el nombre existe en la base de datos
    const ingredienteValido = ingredientesBase.find(
      (ing) => ing.nombre.toLowerCase() === busqueda.toLowerCase()
    );

    if (ingredienteValido) {
      onAñadir(ingredienteValido);
      setBusqueda('');
      setSugerencias([]);
    } else {
      alert("Por favor, selecciona un ingrediente válido de la lista.");
    }
  };

  return (
    <section className="card add-section">
      <div className="section-header">
        <h2>Añadir a la Nevera</h2>
      </div>
      
      <div className="buscador-wrapper">
        <input 
          type="text" 
          placeholder="Busca un ingrediente..." 
          value={busqueda}
          onChange={manejarInput}
          autoComplete="off"
        />
        {sugerencias.length > 0 && (
          <div className="sugerencias-box">
            {sugerencias.map((ing, i) => (
              <div key={i} className="sugerencia-item" onClick={() => {
                setBusqueda(ing.nombre);
                setSugerencias([]);
              }}>
                {ing.nombre}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button className="btn-primary" onClick={intentarAñadir}>
        <span>Confirmar Selección</span>
        <i className="plus-icon">+</i>
      </button>
    </section>
  );
};

export default Buscador;