import React, { useState, useEffect } from 'react';
import Buscador from './components/Buscador';
import ListaNevera from './components/ListaNevera';
import './App.css';

function App() {
  const [ingredientesNevera, setIngredientesNevera] = useState([]);
  const [ingredientesBase, setIngredientesBase] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3000/api/ingredientes')
      .then(res => res.json())
      .then(data => {
        setIngredientesBase(data.length > 0 ? data : [
          { nombre: 'Pollo', categoria: 'Carnes' },
          { nombre: 'Tomate', categoria: 'Verduras' },
          { nombre: 'Queso', categoria: 'Lácteos' }
        ]);
      })
      .catch(() => {
        setIngredientesBase([{ nombre: 'Pollo' }, { nombre: 'Tomate' }]);
      });
  }, []);

  return (
    <>
      <div className="bg-gradient"></div>
      <main className="app-container">
        <header>
          <div className="logo-placeholder"></div>
          <h1>LazyChef</h1>
          <p>Gestiona tus alimentos con inteligencia</p>
        </header>
        
        <Buscador 
          ingredientesBase={ingredientesBase} 
          onAñadir={(ing) => setIngredientesNevera([...ingredientesNevera, ing])} 
        />
        
        <ListaNevera 
          ingredientes={ingredientesNevera} 
          onEliminar={(nombre) => setIngredientesNevera(ingredientesNevera.filter(i => i.nombre !== nombre))}
        />
      </main>
    </>
  );
}

export default App;