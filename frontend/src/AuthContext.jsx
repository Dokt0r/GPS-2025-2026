/**
 * Módulo de Contexto de Autenticación.
 * Gestiona el estado global de la sesión del usuario, la persistencia de tokens
 * en memoria y proporciona un cliente HTTP adaptado para inyectar credenciales
 * y manejar la rotación automática de tokens (Refresh/Access Token).
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

// URL base de la API, configurable mediante variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Inicialización del contexto
const AuthContext = createContext(null);

/**
 * Proveedor del Contexto de Autenticación.
 * Envuelve el árbol de componentes de React para inyectar el estado y los métodos de autenticación.
 * * @param {Object} props - Propiedades del componente.
 * @param {React.ReactNode} props.children - Componentes hijos que consumirán este contexto.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [usuario, setUsuario] = useState(null);
  
  // Estado de carga inicial para evitar redirecciones prematuras durante la hidratación de la sesión
  const [cargando, setCargando] = useState(true);
  
  // Referencia mutable que almacena el token actual.
  // Esencial para evitar el problema de "stale closures" (cierres obsoletos) 
  // dentro de funciones asíncronas de larga vida como fetchConAuth.
  const tokenRef = useRef(''); 

  /**
   * Efecto de inicialización.
   * Intenta recuperar una sesión activa al montar la aplicación solicitando 
   * un nuevo Access Token al servidor usando el Refresh Token (almacenado en cookies HttpOnly).
   */
  useEffect(() => {
    const recuperarSesion = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Permite el envío automático de cookies seguras
        });
        if (!res.ok) return;
        
        const data = await res.json();
        guardarToken(data.accessToken);
        setUsuario(data.usuario);
      } catch (error) {
        // Se silencia el error intencionalmente. Si falla (red o sin sesión), 
        // la aplicación asume un estado no autenticado.
        console.warn('No se pudo recuperar la sesión activa.');
      } finally {
        setCargando(false);
      }
    };

    recuperarSesion();
  }, []);

  /**
   * Actualiza el Access Token tanto en el estado de React (para forzar renderizados)
   * como en la referencia mutable (para acceso síncrono en interceptores).
   * * @param {string} nuevoToken - El JWT proporcionado por el servidor.
   */
  const guardarToken = (nuevoToken) => {
    const tokenNormalizado = (nuevoToken || '').trim();
    setToken(tokenNormalizado);
    tokenRef.current = tokenNormalizado; 
  };

  const parsearJsonSeguro = async (respuesta) => {
    try {
      return await respuesta.json();
    } catch {
      return {};
    }
  };

  const solicitarAuth = async ({ endpoint, username, password, errorPorDefecto }) => {
    const respuesta = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await parsearJsonSeguro(respuesta);

    if (!respuesta.ok) {
      throw new Error(data.error || errorPorDefecto);
    }

    guardarToken(data.accessToken);
    setUsuario(data.usuario);
    return data;
  };

  /**
   * Registra un nuevo usuario en el sistema.
   * * @param {Object} credenciales - Objeto con los datos del usuario.
   * @param {string} credenciales.username - Nombre de usuario.
   * @param {string} credenciales.password - Contraseña en texto plano.
   * @returns {Promise<Object>} Datos de la respuesta del servidor (usuario y token).
   * @throws {Error} Si la validación falla o hay un error de red.
   */
  const register = async ({ username, password }) => {
    try {
      return await solicitarAuth({
        endpoint: '/api/auth/registro',
        username,
        password,
        errorPorDefecto: 'No se pudo completar el registro. Verifica los datos.'
      });
    } catch (error) {
      console.error('Error en el registro:', error);
      throw new Error(error.message === 'Failed to fetch' ? 'Error de conexión con el servidor.' : error.message);
    }
  };

  /**
   * Autentica a un usuario existente.
   * * @param {Object} credenciales - Objeto con los datos del usuario.
   * @param {string} credenciales.username - Nombre de usuario.
   * @param {string} credenciales.password - Contraseña en texto plano.
   * @returns {Promise<Object>} Datos de la respuesta del servidor (usuario y token).
   * @throws {Error} Si las credenciales son inválidas o hay un error de red.
   */
  const login = async ({ username, password }) => {
    try {
      return await solicitarAuth({
        endpoint: '/api/auth/login',
        username,
        password,
        errorPorDefecto: 'Credenciales incorrectas o error en la validación.'
      });
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      if (error.name === 'TypeError' || error.message === 'Failed to fetch') {
        throw new Error('Error de conexión. Verifica que el servidor esté en línea.');
      }
      throw error;
    }
  };

  /**
   * Finaliza la sesión del usuario.
   * Intenta invalidar las cookies en el servidor y limpia estrictamente el estado local.
   */
  const cerrarSesion = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error al solicitar el cierre de sesión al servidor:', error);
    } finally {
      // Se garantiza la limpieza del estado local independientemente del resultado de la petición HTTP
      guardarToken('');
      setUsuario(null);
    }
  };

  /**
   * Wrapper personalizado para la API fetch nativa.
   * Actúa como un interceptor: inyecta automáticamente el Access Token en las cabeceras
   * y gestiona la lógica de reintento si el token ha expirado (HTTP 401).
   * * @param {string} url - El endpoint a consultar.
   * @param {Object} opciones - Opciones de configuración estándar de fetch.
   * @returns {Promise<Response>} La respuesta de la petición HTTP.
   * @throws {Error} Si la sesión ha expirado y no se puede renovar.
   */
  const fetchConAuth = async (url, opciones = {}) => {
    // 1. Intento inicial con el token almacenado en memoria
    const respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...opciones.headers,
        Authorization: `Bearer ${tokenRef.current}`,
      },
    });

    // Si la respuesta es exitosa o el error no es de autorización, se devuelve directamente
    if (respuesta.status !== 401) return respuesta;

    // 2. Flujo de recuperación: El Access Token ha caducado
    try {
      const refresh = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      // Si el Refresh Token también ha expirado o es inválido, forzamos cierre de sesión
      if (!refresh.ok) {
        await cerrarSesion();
        throw new Error('Sesión expirada. Por favor, inicia sesión de nuevo.');
      }

      const data = await refresh.json();
      guardarToken(data.accessToken); 
      setUsuario(data.usuario);

      // 3. Reintento de la petición original con el nuevo token inyectado
      return fetch(url, {
        ...opciones,
        headers: {
          ...opciones.headers,
          Authorization: `Bearer ${tokenRef.current}`,
        },
      });

    } catch (err) {
      // Cualquier fallo en el proceso de rotación resulta en la terminación de la sesión
      await cerrarSesion();
      throw err;
    }
  };

  /**
   * Memorización del valor expuesto por el contexto.
   * Evita re-renderizados innecesarios en los componentes consumidores a menos que 
   * cambien el token, el usuario o el estado de carga.
   */
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

/**
 * Hook personalizado para consumir el contexto de autenticación.
 * * @returns {Object} El estado y métodos de autenticación expuestos por AuthProvider.
 * @throws {Error} Si se invoca fuera del árbol de un AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}