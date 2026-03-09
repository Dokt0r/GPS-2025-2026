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
        if (data.length > 0) {
          setIngredientesBase(data);
        } else {
          setIngredientesBase([
            { nombre: 'Pollo', categoria: 'Proteína' },
            { nombre: 'Tomate', categoria: 'Vegetal' },
            { nombre: 'Arroz', categoria: 'Cereales' },
            { nombre: 'Huevo', categoria: 'Proteína' },
            { nombre: 'Leche', categoria: 'Lácteo' }
          ]);
        }
      })
      .catch(() => {
        setIngredientesBase([
          { nombre: 'Pollo', categoria: 'Proteína' },
          { nombre: 'Arroz', categoria: 'Cereales' }
        ]);
      });
  }, []);

  
  const añadirAInventario = (ingrediente, cantidadAñadida, unidadElegida) => {
    const cantidadNumerica = parseFloat(cantidadAñadida) || 1;
    
    const index = ingredientesNevera.findIndex(i => i.nombre === ingrediente.nombre);

    if (index !== -1) {
      const nuevaLista = [...ingredientesNevera];
      const cantidadActual = nuevaLista[index].cantidad || 1;
      nuevaLista[index].cantidad = cantidadActual + cantidadNumerica;
      nuevaLista[index].unidad = unidadElegida;
      
      setIngredientesNevera(nuevaLista);
    } else {
      setIngredientesNevera([
        ...ingredientesNevera, 
        { ...ingrediente, cantidad: cantidadNumerica, unidad: unidadElegida }
      ]);
    }
  };

  const eliminarDeInventario = (nombre) => {
    setIngredientesNevera(ingredientesNevera.filter(i => i.nombre !== nombre));
  };

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
          onAñadir={añadirAInventario} 
        />
        
        <ListaNevera 
          ingredientes={ingredientesNevera} 
          onEliminar={eliminarDeInventario} 
        />
      </main>
    </>
  );
}

export default App;