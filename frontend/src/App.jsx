import React, { useState, useEffect } from 'react';
import Buscador from './components/Buscador.jsx';
import ListaNevera from './components/ListaNevera';
import './App.css';

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);

  // Simulamos la carga desde MongoDB Atlas al iniciar
  useEffect(() => {
    // Aquí harías el fetch('/api/ingredientes')
    const mockDB = [
      { id: 1, nombre: 'Pollo', categoria: 'Proteína' },
      { id: 2, nombre: 'Brócoli', categoria: 'Vegetal' },
      { id: 3, nombre: 'Huevo', categoria: 'Proteína' },
      { id: 4, nombre: 'Queso', categoria: 'Lácteo' }
    ];
    setIngredientesBase(mockDB);
  }, []);

  const añadirIngrediente = (ingrediente) => {
    if (!ingredientesNevera.find(i => i.id === ingrediente.id)) {
      setIngredientesNevera([...ingredientesNevera, ingrediente]);
    }
  };

  const eliminarIngrediente = (id) => {
    setIngredientesNevera(ingredientesNevera.filter(i => i.id !== id));
  };

  return (
    <div className="app-container">
      <header>
        <h1>SmartFridge</h1>
        <p>Tu inventario inteligente con estilo</p>
      </header>
      
      <Buscador 
        ingredientesBase={ingredientesBase} 
        onAñadir={añadirIngrediente} 
      />
      
      <ListaNevera 
        ingredientes={ingredientesNevera} 
        onEliminar={eliminarIngrediente} 
      />
    </div>
  );
}

export default App;