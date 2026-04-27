import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { cerrarSesion, usuario } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  const handleCerrarSesion = async () => {
    await cerrarSesion();
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar-container">
        <button
          className="btn-menu"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto((prev) => !prev)}
        >
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

        {/* Botón de favoritos siempre visible en la navbar */}
        <button
          className="btn-navbar-favoritos"
          aria-label="Mis favoritos"
          onClick={() => navigate('/favoritos')}
          title="Mis recetas favoritas"
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#e53935',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.9rem',
            fontWeight: '600',
            padding: '6px 12px',
            borderRadius: '20px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(229,57,53,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span>Favoritos</span>
        </button>
      </nav>

      {/* Menú lateral desplegable */}
      {menuAbierto && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 998,
            }}
            onClick={() => setMenuAbierto(false)}
          />

          <div
            style={{
              position: 'fixed',
              top: '50px',
              left: 0,
              width: '220px',
              background: 'var(--card-bg, #1a1f2e)',
              border: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
              borderRadius: '0 0 12px 0',
              zIndex: 999,
              padding: '12px 0',
              boxShadow: '4px 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {usuario && (
              <p style={{
                color: 'var(--text-muted, #aaa)',
                fontSize: '0.8rem',
                padding: '4px 16px 12px',
                borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.1))',
                marginBottom: '8px',
              }}>
                👤 {usuario.username}
              </p>
            )}

            <button
              onClick={() => { navigate('/favoritos'); setMenuAbierto(false); }}
              style={estiloItemMenu}
            >
              ♥ Mis Favoritos
            </button>

            <button
              onClick={() => { navigate('/'); setMenuAbierto(false); }}
              style={estiloItemMenu}
            >
              🏠 Inicio
            </button>

            <button
              onClick={handleCerrarSesion}
              style={{ ...estiloItemMenu, color: '#e53935', marginTop: '8px', borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.1))', paddingTop: '12px' }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </>
      )}
    </>
  );
};

const estiloItemMenu = {
  display: 'block',
  width: '100%',
  background: 'transparent',
  border: 'none',
  color: 'var(--text-main, #fff)',
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '0.95rem',
  cursor: 'pointer',
  transition: 'background 0.15s',
};

export default Navbar;
