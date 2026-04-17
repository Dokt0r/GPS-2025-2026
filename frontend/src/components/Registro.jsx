import React, { useState } from 'react';

function Registro({ onRegistrar, cargando = false }) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    if (/\s/.test(valor)) return false;
    return true;
  };

  const registrarPorDefecto = async ({ username, password }) => {
    const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(data.error || 'No se pudo completar el registro.');
    }

    return data;
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

    if (!credencialValida(usernameLimpio)) {
      setError('El usuario debe tener entre 3 y 15 caracteres y no contener espacios.');
      return;
    }

    if (!credencialValida(form.password)) {
      setError('La contrasena debe tener entre 3 y 15 caracteres y no contener espacios.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    try {
      const registrar = typeof onRegistrar === 'function' ? onRegistrar : registrarPorDefecto;
      const resultado = await registrar({
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
    <section className="card" aria-label="Formulario de registro">
      <div className="section-header">
        <h2>Crear cuenta</h2>
      </div>

      <form onSubmit={manejarSubmit} className="registro-form">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          value={form.username}
          onChange={manejarCambio}
          autoComplete="username"
          placeholder="tu_usuario"
          minLength={3}
          maxLength={15}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={manejarCambio}
          autoComplete="new-password"
          placeholder="********"
          minLength={3}
          maxLength={15}
        />

        <label htmlFor="confirmPassword">Confirmar password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={form.confirmPassword}
          onChange={manejarCambio}
          autoComplete="new-password"
          placeholder="********"
          minLength={3}
          maxLength={15}
        />

        {error && <p role="alert" className="registro-error">{error}</p>}
        {exito && <p role="status" className="registro-exito">{exito}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? 'Registrando...' : 'Registrarse'}
        </button>
      </form>
    </section>
  );
}

export default Registro;
