import React, { useState } from 'react';

const Buscador = ({ ingredientesBase, onAñadir }) => {
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState(''); // Empieza vacío para que escribas lo que quieras
  const [unidad, setUnidad] = useState('u.'); // Vuelve a ser desplegable por defecto
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

  const handleConfirmar = () => {
    const encontrado = ingredientesBase.find(
      ing => ing.nombre.toLowerCase() === busqueda.toLowerCase()
    );

    if (encontrado) {
      // Si dejas la cantidad vacía, asume 1 por defecto
      const cantidadFinal = cantidad === '' ? 1 : cantidad;
      onAñadir(encontrado, cantidadFinal, unidad);
      
      // Reseteamos
      setBusqueda('');
      setCantidad('');
      setUnidad('u.');
      setSugerencias([]);
    } else {
      alert("❌ Por favor, selecciona un ingrediente válido de las sugerencias.");
    }
  };

  return (
    <section className="card add-section">
      <div className="section-header">
        <h2>Añadir a la Nevera</h2>
      </div>
      
      <div className="inputs-row">
        {/* Buscador de texto */}
        <div className="buscador-wrapper">
          <input 
            type="text" 
            placeholder="Ingrediente (ej: Arroz)" 
            value={busqueda}
            onChange={manejarInput}
            autoComplete="off"
            className="input-neon"
          />
          {sugerencias.length > 0 && (
            <div className="sugerencias-box">
              {sugerencias.map((ing, i) => (
                <div key={i} className="sugerencia-item" onClick={() => {
                  setBusqueda(ing.nombre);
                  setSugerencias([]);
                }}>
                  {ing.nombre} <small className="cat-tag">{ing.categoria}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input de Cantidad*/}
        <input 
          type="number" 
          placeholder="Cant."
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="input-neon input-cantidad"
        />

        {/* Desplegable de Unidad */}
        <select 
          value={unidad} 
          onChange={(e) => setUnidad(e.target.value)}
          className="input-neon input-unidad"
        >
          <option value="u.">u. (Unids)</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="L">Litros</option>
          <option value="ml">ml</option>
        </select>
      </div>
      
      <button className="btn-primary" onClick={handleConfirmar}>
        <span>Confirmar Selección</span>
      </button>
    </section>
  );
};

export default Buscador;