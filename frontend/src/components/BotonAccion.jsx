import React from 'react';

const BotonAccion = ({ alHacerClic, texto }) => {
  return (
    <button className="btn-secundario" onClick={alHacerClic}>
      {texto || "Botón Genérico"}
    </button>
  );
};

export default BotonAccion;