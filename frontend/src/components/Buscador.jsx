import React, { useState } from 'react';

const Buscador = ({ ingredientesBase, onAñadir, onError }) => {
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState(null); // ✅ guarda el objeto completo
  const [sugerencias, setSugerencias] = useState([]);

  const manejarInput = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    setIngredienteSeleccionado(null); // si escribe de nuevo, limpia la selección
    if (valor.trim() !== '') {
      const filtrados = ingredientesBase.filter(ing =>
        ing.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerencias(filtrados);
    } else {
      setSugerencias([]);
    }
  };

  const seleccionarSugerencia = (ing) => {
    setBusqueda(ing.nombre);
    setIngredienteSeleccionado(ing); // ✅ guardamos el objeto con unidad y equivalencia
    setSugerencias([]);
  };

  const handleConfirmar = () => {
    if (!ingredienteSeleccionado) {
      onError?.('❌ Por favor, selecciona un ingrediente válido de las sugerencias.');
      return;
    }

    const cantidadFinal = cantidad === '' ? 1 : parseFloat(cantidad);

    if (cantidadFinal <= 0) {
      onError?.('❌ La cantidad debe ser mayor que 0.');
      return;
    }

    onAñadir(ingredienteSeleccionado, cantidadFinal); // ✅ sin unidad, ya viene en el objeto

    setBusqueda('');
    setCantidad('');
    setIngredienteSeleccionado(null);
    setSugerencias([]);
  };

  return (
    <section className="card add-section">
      <div className="section-header">
        <h2>Añadir a la Nevera</h2>
      </div>

      <div className="inputs-row">
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
                <div key={i} className="sugerencia-item" onClick={() => seleccionarSugerencia(ing)}>
                  {ing.nombre}
                  {/* ✅ mostramos la unidad por defecto en la sugerencia */}
                  <small className="cat-tag">{ing.unidad}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="number"
          placeholder="Cant."
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="input-neon input-cantidad"
        />

        {/* ✅ Unidad fija, solo lectura, viene del ingrediente seleccionado */}
        <input
          type="text"
          value={ingredienteSeleccionado ? ingredienteSeleccionado.unidad : '—'}
          readOnly
          className="input-neon input-unidad"
        />
      </div>

      <button className="btn-primary" onClick={handleConfirmar}>
        <span>Confirmar Selección</span>
      </button>
    </section>
  );
};

export default Buscador;