import React, { useState } from 'react';

const Buscador = ({ ingredientesBase, onAñadir }) => {
  const [busqueda, setBusqueda] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);
  
  // Estado general para manejar mensajes de éxito y error dentro de este componente
  const [mensajeLocal, setMensajeLocal] = useState({ texto: '', tipo: '' });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Función para establecer el mensaje y borrarlo automáticamente si es de éxito
  const mostrarMensaje = (texto, tipo) => {
    setMensajeLocal({ texto, tipo });
    if (tipo === 'success') {
      setTimeout(() => {
        setMensajeLocal({ texto: '', tipo: '' });
      }, 3000);
    }
  };

  const manejarInput = async (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    setIngredienteSeleccionado(null);
    
    // Limpiamos los errores si el usuario empieza a escribir para corregir
    if (mensajeLocal.tipo === 'error') setMensajeLocal({ texto: '', tipo: '' });

    if (valor.trim().length >= 2) {
      try {
        const res = await fetch(`${API_URL}/api/ingredientes?nombre=${encodeURIComponent(valor)}`);
        if (!res.ok) throw new Error('Error en búsqueda');
        const data = await res.json();
        setSugerencias(data);
      } catch (error) {
        console.error("Error buscando sugerencias:", error);
        setSugerencias([]);
      }
    } else {
      setSugerencias([]);
    }
  };

  const seleccionarSugerencia = (ing) => {
    setBusqueda(ing.nombre);
    setIngredienteSeleccionado(ing);
    setSugerencias([]); 
    if (mensajeLocal.tipo === 'error') setMensajeLocal({ texto: '', tipo: '' });
  };

  const handleConfirmar = () => {
    if (ingredientesBase.length === 0) {
      mostrarMensaje('No se pueden buscar ingredientes porque no hay conexión.', 'error');
      return;
    }

    if (!ingredienteSeleccionado) {
      mostrarMensaje('Por favor, selecciona un ingrediente válido de las sugerencias.', 'error');
      return;
    }

    const cantidadFinal = cantidad === '' ? 1 : parseFloat(cantidad);

    if (cantidadFinal <= 0) {
      mostrarMensaje('La cantidad debe ser mayor que 0.', 'error');
      return;
    }

    // Si todo va bien:
    onAñadir(ingredienteSeleccionado, cantidadFinal);
    
    // Mostramos el éxito aquí mismo (Sin emojis)
    mostrarMensaje(`Añadido: ${ingredienteSeleccionado.nombre} (${cantidadFinal} ${ingredienteSeleccionado.unidad})`, 'success');

    // Limpiamos los campos
    setBusqueda('');
    setCantidad('');
    setIngredienteSeleccionado(null);
    setSugerencias([]);
  };

  return (
    <section className="buscador-container">
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
            disabled={ingredientesBase.length === 0}
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

        <input
          type="text"
          value={ingredienteSeleccionado ? ingredienteSeleccionado.unidad : '—'}
          readOnly
          className="input-neon input-unidad"
          disabled={ingredientesBase.length === 0}
        />
      </div>

      <div className="info-cantidad">
        * Si dejas la cantidad vacía, se añadirá <strong>1 {ingredienteSeleccionado ? ingredienteSeleccionado.unidad : ''}</strong> por defecto.
      </div>

      {/* Aquí es donde se aplica el estilo dinámico dependiendo del tipo */}
      {mensajeLocal.texto && (
        <div className={`mensaje-local ${mensajeLocal.tipo}`}>
          {mensajeLocal.texto}
        </div>
      )}

      <button className="btn-primary" onClick={handleConfirmar} disabled={ingredientesBase.length === 0}>
        <span>Confirmar Selección</span>
      </button>
    </section>
  );
};

export default Buscador;