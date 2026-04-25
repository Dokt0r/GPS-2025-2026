import React, { useState } from 'react';
import { useAuth } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom';
import fondo from '../assets/fondo.avif';

function Registro({ cargando = false }) {
  const { register } = useAuth(); 
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // NUEVO: Estados independientes para mostrar/ocultar cada contraseña
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);

  const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    if (/\s/.test(valor)) return false;
    return true;
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    const usernameLimpio = form.username.trim();

    if (!usernameLimpio || !form.password.trim() || !form.confirmPassword.trim()) {
      setError('Completa todos los campos.');
      return;
    }

    if (!credencialValida(usernameLimpio) || !credencialValida(form.password)) {
      setError('Usuario y contraseña deben tener entre 3 y 15 caracteres sin espacios.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      const resultado = await register({
        username: usernameLimpio,
        password: form.password
      });

      setExito(resultado?.mensaje || 'Registro realizado correctamente.');
      setForm({ username: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err?.message || 'No se pudo completar el registro.');
    }
  };

  return (
    <div className="registro-wrapper">
      <section className="card registro-card" aria-label="Formulario de registro">
        <div className="section-header">
          <h2>Crear cuenta</h2>
        </div>

        <form onSubmit={manejarSubmit} className="registro-form">
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={manejarCambio}
              autoComplete="username"
              placeholder="Tu usuario"
              minLength={3}
              maxLength={15}
            />
          </div>

          {/* CAMPO CONTRASEÑA INTEGRADO */}
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-group-embedded">
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                value={form.password}
                onChange={manejarCambio}
                autoComplete="new-password"
                placeholder="Tu contraseña"
                minLength={3}
                maxLength={15}
              />
              <button
                type="button"
                className="btn-toggle-password-embedded"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* CAMPO CONFIRMAR CONTRASEÑA INTEGRADO */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <div className="input-group-embedded">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={mostrarConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={manejarCambio}
                autoComplete="new-password"
                placeholder="Confirmar contraseña"
                minLength={3}
                maxLength={15}
              />
              <button
                type="button"
                className="btn-toggle-password-embedded"
                onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                aria-label={mostrarConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p role="alert" className="registro-error">{error}</p>}
          {exito && <p role="status" className="registro-exito">{exito}</p>}

          <button type="submit" className="btn-registro" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <div className="auth-toggle-inline">
          <p>¿Ya tienes una cuenta?</p>
          <button 
            type="button" 
            className="auth-toggle-btn" 
            onClick={() => navigate('/login')}
          >
            Inicia sesión
          </button>
        </div>

      </section>
    </div>
  );
}

export default Registro;