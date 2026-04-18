import { createContext, useContext, useMemo, useState } from 'react';

const TOKEN_KEY = 'accessToken';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Con fallback hardcodeado para evitar errores de configuración

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');

  // 1. Nuevo estado para guardar los datos del usuario (id, username)
  // Antes solo existía el token, que solo dice "hay alguien logueado" pero no quién
  const [usuario, setUsuario] = useState(null);

  const guardarToken = (nuevoToken) => {
    const tokenNormalizado = (nuevoToken || '').trim();
    setToken(tokenNormalizado);

    if (tokenNormalizado) {
      localStorage.setItem(TOKEN_KEY, tokenNormalizado);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  // 2. Función register() centralizada
  // Ahora la lógica vive aquí y cualquier componente puede registrar con useAuth()
  const register = async ({ username, password }) => {
    const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // credentials: 'include' es necesario para que el navegador acepte
      // la cookie HttpOnly del refresh token que manda el servidor
      // Sin esto, la cookie se ignora y el sistema de renovación de sesión no funciona
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(data.error || 'No se pudo completar el registro.');
    }

    // El servidor devuelve { accessToken, usuario: { id, username } }
    guardarToken(data.accessToken);   // Guarda el token en localStorage
    setUsuario(data.usuario);         // 1: Guarda quién es el usuario

    return data;
  };

  const cerrarSesion = () => {
    setToken('');
    setUsuario(null); // TAREA 1: Al cerrar sesión, limpiamos también los datos del usuario
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      usuario,                      //  Exponemos el usuario para que cualquier componente sepa quién está logueado
      isAutenticado: Boolean(token),
      register,                     //  Exponemos register() para que Registro.jsx lo use con useAuth()
      guardarToken,
      cerrarSesion,
    }),
    [token, usuario] // Añadimos usuario a las dependencias para que el contexto se actualice cuando cambie
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}