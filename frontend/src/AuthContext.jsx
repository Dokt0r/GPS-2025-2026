import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // Con fallback hardcodeado para evitar errores de configuración

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');

  // 1. Nuevo estado para guardar los datos del usuario (id, username)
  // Antes solo existía el token, que solo dice "hay alguien logueado" pero no quién
  const [usuario, setUsuario] = useState(null);
  // AÑADIR esto justo debajo:
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    const recuperarSesion = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          setCargando(false);
          return;
        }
        const data = await res.json();
        guardarToken(data.accessToken);
        setUsuario(data.usuario);
      } catch (_) {
        // Sin sesión activa, no pasa nada
      } finally {
        setCargando(false);
      }
    };

    recuperarSesion();
  }, []);

  // DESPUÉS
  const guardarToken = (nuevoToken) => {
    const tokenNormalizado = (nuevoToken || '').trim();
    setToken(tokenNormalizado);
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
  const cerrarSesion = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {
      // Si falla la llamada, cerramos sesión igualmente en el cliente
    } finally {
      setToken('');
      setUsuario(null);
    }
  };

  const fetchConAuth = async (url, opciones = {}) => {
    // 1. Hacemos la petición normal con el token actual en la cabecera
    const respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    // 2. Si no es 401, devolvemos la respuesta tal cual (bien o mal)
    if (respuesta.status !== 401) return respuesta;

    // 3. Si es 401, intentamos renovar el token
    try {
      const refresh = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refresh.ok) {
        cerrarSesion();
        throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      }

      const data = await refresh.json();
      const nuevoToken = data.accessToken;
      guardarToken(nuevoToken);
      setUsuario(data.usuario);

      // 4. Reintentamos la petición original con el nuevo token
      return fetch(url, {
        ...opciones,
        headers: {
          ...opciones.headers,
          Authorization: `Bearer ${nuevoToken}`,
        },
      });

    } catch (err) {
      cerrarSesion();
      throw err;
    }
  };
  const value = useMemo(
    () => ({
      token,
      usuario,
      cargando,
      isAutenticado: Boolean(token),
      register,
      guardarToken,
      cerrarSesion,
      fetchConAuth,
    }),
    [token, usuario, cargando]
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