import React, { useState } from 'react';
import { useAuth } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom'; // Añadido para navegar

function Login({ cargando = false }) {
  const { login } = useAuth();
  const navigate = useNavigate(); // Inicializamos navigate

  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

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

    if (!usernameLimpio || !form.password.trim()) {
      setError('Completa todos los campos.');
      return;
    }

    if (!credencialValida(usernameLimpio) || !credencialValida(form.password)) {
      setError('Las credenciales deben tener entre 3 y 15 caracteres y no contener espacios.');
      return;
    }

    try {
      const resultado = await login({
        username: usernameLimpio,
        password: form.password
      });

      setExito(resultado?.mensaje || 'Inicio de sesión exitoso.');
      setForm({ username: '', password: '' });
    } catch (err) {
      setError(err?.message || 'Credenciales inválidas o error en el servidor.');
    }
  };

  return (
    <div className="registro-wrapper">
      <section className="card registro-card" aria-label="Formulario de inicio de sesión">
        <div className="section-header">
          <h2>Iniciar sesión</h2>
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

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={manejarCambio}
              autoComplete="current-password"
              placeholder="········"
              minLength={3}
              maxLength={15}
            />
          </div>

          {error && <p role="alert" className="registro-error">{error}</p>}
          {exito && <p role="status" className="registro-exito">{exito}</p>}

          <button type="submit" className="btn-registro" disabled={cargando}>
            {cargando ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>

        {/* NUEVA SECCIÓN DE CAMBIO DE VISTA */}
        <div className="auth-toggle-inline">
          <p>¿Aún no tienes una cuenta?</p>
          <button 
            type="button" 
            className="auth-toggle-btn" 
            onClick={() => navigate('/registro')}
          >
            Regístrate aquí
          </button>
        </div>

      </section>
    </div>
  );
}

export default Login;