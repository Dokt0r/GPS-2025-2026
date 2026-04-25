import React, { useState } from 'react';
import { useAuth } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom';

function Login({ cargando = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  const [touched, setTouched] = useState({
    username: false,
    password: false
  });

  const [erroresCampo, setErroresCampo] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [mostrarPassword, setMostrarPassword] = useState(false);

  const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    if (/\s/.test(valor)) return false;
    return true;
  };

  const validarCampo = (name, value) => {
    const valorLimpio = (value || '').trim();

    if (!valorLimpio) {
      return name === 'username'
        ? 'El usuario es obligatorio.'
        : 'La contraseña es obligatoria.';
    }

    if (!credencialValida(value)) {
      return 'Debe tener entre 3 y 15 caracteres y no contener espacios.';
    }

    return '';
  };

  const obtenerErroresFormulario = (formulario) => ({
    username: validarCampo('username', formulario.username),
    password: validarCampo('password', formulario.password)
  });

  const validarFormulario = ({ username, password }) => {
    const usernameLimpio = username.trim();
    const passwordLimpia = password.trim();

    if (!usernameLimpio || !passwordLimpia) {
      return 'Completa todos los campos.';
    }

    if (!credencialValida(usernameLimpio) || !credencialValida(password)) {
      return 'Las credenciales deben tener entre 3 y 15 caracteres y no contener espacios.';
    }

    return '';
  };

  const manejarCambio = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const siguiente = { ...prev, [name]: value };
      if (touched[name]) {
        setErroresCampo((prevErrores) => ({
          ...prevErrores,
          [name]: validarCampo(name, value)
        }));
      }
      return siguiente;
    });

    if (error) setError('');
    if (exito) setExito('');
  };

  const manejarBlur = (e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({ ...prev, [name]: true }));
    setErroresCampo((prev) => ({
      ...prev,
      [name]: validarCampo(name, value)
    }));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    setTouched({ username: true, password: true });

    const errores = obtenerErroresFormulario(form);
    setErroresCampo(errores);

    if (errores.username || errores.password) {
      setError('Revisa los campos del formulario.');
      return;
    }

    const errorValidacion = validarFormulario(form);
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    const usernameLimpio = form.username.trim();

    try {
      const resultado = await login({
        username: usernameLimpio,
        password: form.password
      });

      setExito(resultado?.mensaje || 'Inicio de sesión exitoso.');
      setForm({ username: '', password: '' });
      setTouched({ username: false, password: false });
      setErroresCampo({ username: '', password: '' });
    } catch (err) {
      setError(err?.message || 'Credenciales inválidas o error en el servidor.');
    }
  };

  const hayErroresEnTiempoReal = Boolean(erroresCampo.username || erroresCampo.password);
  const formularioIncompleto = !form.username.trim() || !form.password.trim();

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
              onBlur={manejarBlur}
              autoComplete="username"
              placeholder="Tu usuario"
              minLength={3}
              maxLength={15}
              aria-invalid={Boolean(touched.username && erroresCampo.username)}
            />
            {touched.username && erroresCampo.username && (
              <p role="alert" className="registro-error">{erroresCampo.username}</p>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
              <div className={`input-group-embedded ${touched.password && erroresCampo.password ? 'is-invalid' : ''}`}>
                <input
                  id="password"
                  name="password"
                  // type cambia dinámicamente según el estado
                  type={mostrarPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={manejarCambio}
                  onBlur={manejarBlur}
                  autoComplete="current-password"
                  placeholder="Tu contraseña"
                  minLength={3}
                  maxLength={15}
                  // Movimos el aria-invalid aquí si prefieres, o lo dejas en el input
                />
                
                {/* Botón integrado al final del campo */}
                <button
                  type="button"
                  className="btn-toggle-password-embedded"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {mostrarPassword ? (
                      /* Icono de Ojo Tachado (Ocultar) */
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      /* Icono de Ojo Normal (Ver) */
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                </button>
              </div>
            {touched.password && erroresCampo.password && (
              <p role="alert" className="registro-error">{erroresCampo.password}</p>
            )}
          </div>

          {error && <p role="alert" className="registro-error">{error}</p>}
          {exito && <p role="status" className="registro-exito">{exito}</p>}

          <button
            type="submit"
            className="btn-registro"
            disabled={cargando || formularioIncompleto || hayErroresEnTiempoReal}
          >
            {cargando ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>

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