import React, { useState } from 'react';

/**
 * Componente interactivo para buscar y seleccionar ingredientes de la base de datos.
 * Incluye un input con autocompletado en tiempo real y validación de cantidades 
 * antes de enviar la información al estado global de la aplicación.
 */
const Buscador = ({ ingredientesBase, onAñadir, onError }) => {
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);

  /**
   * Maneja los cambios de texto en el input de búsqueda.
   * Filtra dinámicamente el catálogo de ingredientes (`ingredientesBase`) 
   * mostrando solo aquellos que coincidan con el texto introducido.
   */
  const manejarInput = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    setIngredienteSeleccionado(null); // Resetea la selección si el usuario vuelve a escribir
    
    // Evita la búsqueda si no hay datos cargados del servidor
    if (valor.trim() !== '' && ingredientesBase.length > 0) {
      const filtrados = ingredientesBase.filter(ing =>
        ing.nombre.toLowerCase().includes(valor.toLowerCase())
      );
      setSugerencias(filtrados);
    } else {
      setSugerencias([]);
    }
  };

  /**
   * Actualiza el estado cuando el usuario hace clic en una de las sugerencias
   * del menú desplegable. Fija el texto en el input y guarda el objeto completo.
   */
  const seleccionarSugerencia = (ing) => {
    setBusqueda(ing.nombre);
    setIngredienteSeleccionado(ing);
    setSugerencias([]); // Oculta el menú desplegable
  };

  /**
   * Ejecuta las validaciones finales cuando el usuario presiona el botón "Confirmar".
   * Comprueba la conexión, asegura que se haya seleccionado un ingrediente válido
   * de la lista y verifica que la cantidad sea un número positivo.
   */
  const handleConfirmar = () => {
    // Protección contra fallos del servidor
    if (ingredientesBase.length === 0) {
        onError?.('❌ No se pueden buscar ingredientes porque no hay conexión con la base de datos.');
        return;
    }

    // Validación de selección correcta
    if (!ingredienteSeleccionado) {
      onError?.('❌ Por favor, selecciona un ingrediente válido de las sugerencias.');
      return;
    }

    // Si el campo está vacío, asumimos 1 por defecto
    const cantidadFinal = cantidad === '' ? 1 : parseFloat(cantidad);

    // Validación matemática
    if (cantidadFinal <= 0) {
      onError?.('❌ La cantidad debe ser mayor que 0.');
      return;
    }

    // Envía el objeto completo y la cantidad al componente App
    onAñadir(ingredienteSeleccionado, cantidadFinal);

    // Limpieza de inputs tras añadir exitosamente
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
            disabled={ingredientesBase.length === 0} // Bloquea si no hay conexión
          />
          {/* Renderizado condicional de las sugerencias de búsqueda */}
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

        {/* Muestra la unidad correspondiente (g, ml, ud) de forma automática y estática */}
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