import React, { useState } from 'react';
import { useAuth } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom';

/**
 * Componente de Inicio de Sesión.
 * Implementa validación interactiva (onBlur) y gestión de autenticación.
 * * @param {Object} props
 * @param {boolean} props.cargando - Estado de carga global o del proceso de autenticación.
 */
function Login({ cargando = false }) {
  const { login } = useAuth();
  const navigate = useNavigate();

  // --- ESTADOS DEL FORMULARIO ---
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  // Registra si el usuario ha interactuado (entrado y salido) de un campo
  const [touched, setTouched] = useState({
    username: false,
    password: false
  });

  // Almacena errores específicos por campo para renderizarlos en la UI
  const [erroresCampo, setErroresCampo] = useState({
    username: '',
    password: ''
  });

  // Estados globales de respuesta
  const [errorServidor, setErrorServidor] = useState('');
  const [exito, setExito] = useState('');
  
  // Estado de UI para mostrar/ocultar contraseña
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // --- LÓGICA DE VALIDACIÓN ---
  /**
   * Verifica los requisitos mínimos de una credencial.
   */
  const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    return true;
  };

  /**
   * Valida un campo específico y devuelve su mensaje de error si aplica.
   * @param {string} name - Nombre del campo ('username' | 'password').
   * @param {string} value - Valor actual del campo.
   * @returns {string} - Mensaje de error, o cadena vacía si es válido.
   */
  const validarCampo = (name, value) => {
    if (!value) {
      return name === 'username' ? 'El usuario es obligatorio.' : 'La contraseña es obligatoria.';
    }
    if (!credencialValida(value)) {
      return 'Debe tener entre 3 y 15 caracteres.';
    }
    return '';
  };

  /**
   * Evalúa todos los campos a la vez (útil antes del submit).
   */
  const obtenerErroresFormulario = (formulario) => ({
    username: validarCampo('username', formulario.username),
    password: validarCampo('password', formulario.password)
  });

  // --- MANEJADORES DE EVENTOS ---
  /**
   * Se dispara cada vez que el usuario teclea.
   * Filtra espacios y actualiza el estado de errores en tiempo real si el campo ya fue "tocado".
   */
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    
    // Filtro estricto de espacios en blanco
    const valorSinEspacios = value.replace(/\s/g, '');

    setForm((prev) => {
      const siguiente = { ...prev, [name]: valorSinEspacios };
      
      // Si el usuario ya había interactuado con el campo, actualizamos el error dinámicamente
      if (touched[name]) {
        setErroresCampo((prevErrores) => ({
          ...prevErrores,
          [name]: validarCampo(name, valorSinEspacios)
        }));
      }
      return siguiente;
    });

    // Limpieza de mensajes globales
    if (errorServidor) setErrorServidor('');
    if (exito) setExito('');
  };

  /**
   * Se dispara cuando el input pierde el foco.
   * Marca el campo como "tocado" y lanza su validación.
   */
  const manejarBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErroresCampo((prev) => ({
      ...prev,
      [name]: validarCampo(name, value)
    }));
  };

  /**
   * Procesa el envío del formulario.
   */
  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor('');
    setExito('');

    // Forzamos el estado 'touched' en todos los campos para revelar errores ocultos
    setTouched({ username: true, password: true });

    const errores = obtenerErroresFormulario(form);
    setErroresCampo(errores);

    // Abortar si existen errores locales
    if (errores.username || errores.password) {
      return; 
    }

    try {
      const resultado = await login({
        username: form.username,
        password: form.password
      });

      // Flujo de éxito
      setExito(resultado?.mensaje || 'Inicio de sesión exitoso.');
      setForm({ username: '', password: '' });
      setTouched({ username: false, password: false });
      setErroresCampo({ username: '', password: '' });
    } catch (err) {
      // Flujo de error de servidor (credenciales inválidas, etc.)
      setErrorServidor(err?.message || 'Credenciales inválidas o error en el servidor.');
    }
  };

  // Variable de conveniencia para desactivar el botón si hay errores visuales presentes
  const hayErroresEnTiempoReal = Boolean(erroresCampo.username || erroresCampo.password);

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="registro-wrapper">
      <section className="card registro-card" aria-label="Formulario de inicio de sesión">
        <div className="section-header">
          <h2>Iniciar sesión</h2>
        </div>

        <form onSubmit={manejarSubmit} className="registro-form">
          
          {/* CAMPO: Nombre de Usuario */}
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <div className={`input-group-embedded ${touched.username && erroresCampo.username ? 'is-invalid' : ''}`}>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={manejarCambio}
                onBlur={manejarBlur}
                autoComplete="username"
                placeholder="Tu usuario"
                maxLength={15}
              />
            </div>
            {touched.username && erroresCampo.username && (
              <p role="alert" className="registro-error">{erroresCampo.username}</p>
            )}
          </div>

          {/* CAMPO: Contraseña */}
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className={`input-group-embedded ${touched.password && erroresCampo.password ? 'is-invalid' : ''}`}>
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                value={form.password}
                onChange={manejarCambio}
                onBlur={manejarBlur}
                autoComplete="current-password"
                placeholder="Tu contraseña"
                maxLength={15}
              />
              <button
                type="button"
                className="btn-toggle-password-embedded"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {/* SVG dinámico: Ojo tachado (ocultar) vs Ojo normal (mostrar) */}
                {mostrarPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {touched.password && erroresCampo.password && (
              <p role="alert" className="registro-error">{erroresCampo.password}</p>
            )}
          </div>

          {/* MENSAJES GLOBALES */}
          {errorServidor && <p role="alert" className="registro-error">{errorServidor}</p>}
          {exito && <p role="status" className="registro-exito">{exito}</p>}

          <button
            type="submit"
            className="btn-registro"
            disabled={cargando || hayErroresEnTiempoReal}
          >
            {cargando ? 'Iniciando...' : 'Entrar'}
          </button>
        </form>

        {/* NAVEGACIÓN ALTERNATIVA */}
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