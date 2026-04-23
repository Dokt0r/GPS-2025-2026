import React from 'react';

const Navbar = () => {
  return (
    <nav className="navbar-container">
      <button className="btn-menu" aria-label="Abrir menú">
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          width="28" 
          height="28"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
      <span className="navbar-brand">LazyChef</span>
    </nav>
  );
};

export default Navbar;