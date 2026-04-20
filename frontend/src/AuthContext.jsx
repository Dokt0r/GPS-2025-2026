import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const tokenRef = useRef(''); // fix del closure

  useEffect(() => {
    const recuperarSesion = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return;
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

  const guardarToken = (nuevoToken) => {
    const tokenNormalizado = (nuevoToken || '').trim();
    setToken(tokenNormalizado);
    tokenRef.current = tokenNormalizado; // siempre actualizado
  };

  const register = async ({ username, password }) => {
    const respuesta = await fetch(`${API_URL}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(data.error || 'No se pudo completar el registro.');
    }

    guardarToken(data.accessToken);
    setUsuario(data.usuario);
    return data;
  };

  const login = async ({ username, password }) => {
    const respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(data.error || 'Credenciales incorrectas.');
    }

    guardarToken(data.accessToken);
    setUsuario(data.usuario);
    return data;
  };

  const cerrarSesion = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (_) {
      // Si falla, cerramos sesión igualmente en el cliente
    } finally {
      guardarToken('');
      setUsuario(null);
    }
  };

  const fetchConAuth = async (url, opciones = {}) => {
    const respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${tokenRef.current}`, // usa ref, nunca desactualizado
      },
    });

    if (respuesta.status !== 401) return respuesta;

    try {
      const refresh = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!refresh.ok) {
        await cerrarSesion();
        throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      }

      const data = await refresh.json();
      guardarToken(data.accessToken);
      setUsuario(data.usuario);

      return fetch(url, {
        ...opciones,
        headers: {
          ...opciones.headers,
          Authorization: `Bearer ${tokenRef.current}`,
        },
      });

    } catch (err) {
      await cerrarSesion();
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
      login,
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