import { createContext, useContext, useMemo, useState } from 'react';

const TOKEN_KEY = 'accessToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');

  const guardarToken = (nuevoToken) => {
    const tokenNormalizado = (nuevoToken || '').trim();

    setToken(tokenNormalizado);

    if (tokenNormalizado) {
      localStorage.setItem(TOKEN_KEY, tokenNormalizado);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const cerrarSesion = () => {
    setToken('');
    localStorage.removeItem(TOKEN_KEY);
  };

  const value = useMemo(
    () => ({
      token,
      isAutenticado: Boolean(token),
      guardarToken,
      cerrarSesion
    }),
    [token]
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
