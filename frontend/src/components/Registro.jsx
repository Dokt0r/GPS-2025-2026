import React, { useState } from 'react';
import { useAuth } from '../AuthContext'; 
import { useNavigate } from 'react-router-dom';

/**
 * Componente de Registro de usuarios.
 * Maneja la captura de credenciales, validación en el cliente y envío al servidor.
 * * @param {Object} props
 * @param {boolean} props.cargando - Estado de carga global o del proceso de autenticación.
 */
function Registro({ cargando = false }) {
  const { register } = useAuth(); 
  const navigate = useNavigate();

  // --- ESTADOS DEL FORMULARIO ---
  // Almacena los valores actuales de los inputs
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Almacena los mensajes de error específicos para cada campo visual
  const [erroresCampo, setErroresCampo] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  // Estados para retroalimentación general del servidor
  const [errorServidor, setErrorServidor] = useState('');
  const [exito, setExito] = useState('');

  // --- ESTADOS DE UI (Interfaz de Usuario) ---
  // Controlan la visibilidad del texto de las contraseñas
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
  
  // Bandera para activar la validación visual exhaustiva tras el primer intento de envío
  const [intentadoEnviar, setIntentadoEnviar] = useState(false);

  // --- LÓGICA DE VALIDACIÓN ---
  /**
   * Verifica si una credencial cumple con la longitud requerida.
   * @param {string} valor - El texto a validar.
   * @returns {boolean} - true si es válido, false en caso contrario.
   */
  const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    return true;
  };

  /**
   * Ejecuta la validación de todos los campos del formulario.
   * @returns {boolean} - Devuelve true si existe algún error, false si todo es correcto.
   */
  const validarCampos = () => {
    const errores = { username: '', password: '', confirmPassword: '' };
    let hayErrores = false;
    
    const username = form.username;

    // Validación del nombre de usuario
    if (!username) {
      errores.username = 'El usuario es obligatorio.';
      hayErrores = true;
    } else if (!credencialValida(username)) {
      errores.username = 'Debe tener entre 3 y 15 caracteres.';
      hayErrores = true;
    }

    // Validación de la contraseña principal
    if (!form.password) {
      errores.password = 'La contraseña es obligatoria.';
      hayErrores = true;
    } else if (!credencialValida(form.password)) {
      errores.password = 'Debe tener entre 3 y 15 caracteres.';
      hayErrores = true;
    }

    // Validación de la confirmación de contraseña
    if (!form.confirmPassword) {
      errores.confirmPassword = 'Debes confirmar tu contraseña.';
      hayErrores = true;
    } else if (form.password !== form.confirmPassword) {
      errores.confirmPassword = 'Las contraseñas no coinciden.';
      hayErrores = true;
    }

    setErroresCampo(errores);
    return hayErrores;
  };

  // --- MANEJADORES DE EVENTOS ---
  /**
   * Maneja el cambio de valor en cualquier input del formulario.
   * Elimina espacios en blanco y limpia errores previos.
   */
  const manejarCambio = (e) => {
    const { name, value } = e.target;
    
    // Evitamos la entrada de espacios en tiempo real (UX/Seguridad)
    const valorSinEspacios = value.replace(/\s/g, '');

    setForm((prev) => ({ ...prev, [name]: valorSinEspacios }));
    
    // Limpieza de errores al reescribir
    if (erroresCampo[name]) {
      setErroresCampo(prev => ({ ...prev, [name]: '' }));
    }
    if (errorServidor) setErrorServidor('');
  };

  /**
   * Intercepta el envío del formulario, valida y comunica con la API.
   */
  const manejarSubmit = async (e) => {
    e.preventDefault();
    setIntentadoEnviar(true);
    setErrorServidor('');
    setExito('');

    // Prevenir envío si la validación local falla
    const hayErrores = validarCampos();
    if (hayErrores) return;

    try {
      const resultado = await register({
        username: form.username,
        password: form.password
      });

      // Manejo de éxito
      setExito(resultado?.mensaje || 'Registro realizado correctamente.');
      setForm({ username: '', password: '', confirmPassword: '' });
      setIntentadoEnviar(false);
    } catch (err) {
      // Manejo de errores procedentes de la API
      setErrorServidor(err?.message || 'No se pudo completar el registro.');
    }
  };

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <div className="registro-wrapper">
      <section className="card registro-card" aria-label="Formulario de registro">
        <div className="section-header">
          <h2>Crear cuenta</h2>
        </div>

        <form onSubmit={manejarSubmit} className="registro-form">
          
          {/* CAMPO: Nombre de Usuario */}
          <div className="input-group">
            <label htmlFor="username">Usuario</label>
            <div className={`input-group-embedded ${intentadoEnviar && erroresCampo.username ? 'is-invalid' : ''}`}>
              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={manejarCambio}
                autoComplete="username"
                placeholder="Tu usuario"
                maxLength={15}
              />
            </div>
            {intentadoEnviar && erroresCampo.username && (
              <p role="alert" className="registro-error">{erroresCampo.username}</p>
            )}
          </div>

          {/* CAMPO: Contraseña */}
          <div className="input-group">
            <label htmlFor="password">Contraseña</label>
            <div className={`input-group-embedded ${intentadoEnviar && erroresCampo.password ? 'is-invalid' : ''}`}>
              <input
                id="password"
                name="password"
                type={mostrarPassword ? 'text' : 'password'}
                value={form.password}
                onChange={manejarCambio}
                autoComplete="new-password"
                placeholder="Tu contraseña"
                maxLength={15}
              />
              <button
                type="button"
                className="btn-toggle-password-embedded"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {/* Icono dinámico según el estado de visualización */}
                {mostrarPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {intentadoEnviar && erroresCampo.password && (
              <p role="alert" className="registro-error">{erroresCampo.password}</p>
            )}
          </div>

          {/* CAMPO: Confirmar Contraseña */}
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <div className={`input-group-embedded ${intentadoEnviar && erroresCampo.confirmPassword ? 'is-invalid' : ''}`}>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={mostrarConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={manejarCambio}
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                maxLength={15}
              />
              <button
                type="button"
                className="btn-toggle-password-embedded"
                onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                aria-label={mostrarConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {mostrarConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
            {intentadoEnviar && erroresCampo.confirmPassword && (
              <p role="alert" className="registro-error">{erroresCampo.confirmPassword}</p>
            )}
          </div>

          {/* MENSAJES GLOBALES (Servidor/Éxito) */}
          {errorServidor && <p role="alert" className="registro-error">{errorServidor}</p>}
          {exito && <p role="status" className="registro-exito">{exito}</p>}

          <button type="submit" className="btn-registro" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        {/* NAVEGACIÓN ALTERNATIVA */}
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