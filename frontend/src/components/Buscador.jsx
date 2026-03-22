import React, { useState } from 'react';

const Buscador = ({ ingredientesBase, onAñadir, onError }) => {
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);

  const manejarInput = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    setIngredienteSeleccionado(null);
    
    // Si ingredientesBase está vacío, no hacemos nada
    if (valor.trim() !== '' && ingredientesBase.length > 0) {
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
    setIngredienteSeleccionado(ing);
    setSugerencias([]);
  };

  const handleConfirmar = () => {
    // Si la base de datos no cargó, mostramos error
    if (ingredientesBase.length === 0) {
        onError?.('❌ No se pueden buscar ingredientes porque no hay conexión con la base de datos.');
        return;
    }

    if (!ingredienteSeleccionado) {
      onError?.('❌ Por favor, selecciona un ingrediente válido de las sugerencias.');
      return;
    }

    const cantidadFinal = cantidad === '' ? 1 : parseFloat(cantidad);

    if (cantidadFinal <= 0) {
      onError?.('❌ La cantidad debe ser mayor que 0.');
      return;
    }

    onAñadir(ingredienteSeleccionado, cantidadFinal);

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
            placeholder={ingredientesBase.length === 0 ? "Sin conexión..." : "Ingrediente (ej: Arroz)"}
            value={busqueda}
            onChange={manejarInput}
            autoComplete="off"
            className="input-neon"
            disabled={ingredientesBase.length === 0} // Deshabilita si no hay datos
          />
          {sugerencias.length > 0 && (
            <div className="sugerencias-box">
              {sugerencias.map((ing, i) => (
                <div key={i} className="sugerencia-item" onClick={() => seleccionarSugerencia(ing)}>
                  {ing.nombre}
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
          disabled={ingredientesBase.length === 0}
        />

        {/* Unidad fija, solo lectura */}
        <input
          type="text"
          value={ingredienteSeleccionado ? ingredienteSeleccionado.unidad : '—'}
          readOnly
          className="input-neon input-unidad"
          disabled={ingredientesBase.length === 0}
        />
      </div>

      <button className="btn-primary" onClick={handleConfirmar} disabled={ingredientesBase.length === 0}>
        <span>Confirmar Selección</span>
      </button>
    </section>
  );
};

export default Buscador;