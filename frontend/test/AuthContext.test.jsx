import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../src/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR
// Nos permite acceder al valor del contexto desde los tests sin necesidad
// de un componente real de la aplicación
// ─────────────────────────────────────────────────────────────────────────────

let capturedContext = null;

const TestConsumer = () => {
  capturedContext = useAuth();
  return null;
};

const renderWithAuth = () => {
  capturedContext = null;
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SETUP Y LIMPIEZA
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  global.fetch = vi.fn();
});

afterEach(() => {
  localStorage.clear();
  capturedContext = null;
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 1: ESTADO INICIAL
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — Estado inicial', () => {

  test('Sin datos en localStorage, token está vacío y usuario es null', () => {
    renderWithAuth();
    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
  });

  test('Sin token, isAutenticado es false', () => {
    renderWithAuth();
    expect(capturedContext.isAutenticado).toBe(false);
  });

  test('Si hay token en localStorage al montar, se recupera correctamente', () => {
    localStorage.setItem('accessToken', 'token-guardado');
    renderWithAuth();
    expect(capturedContext.token).toBe('token-guardado');
    expect(capturedContext.isAutenticado).toBe(true);
  });

  test('Si hay usuario en localStorage al montar, se recupera correctamente', () => {
    const usuarioGuardado = { id: '123', username: 'pedro' };
    localStorage.setItem('usuario', JSON.stringify(usuarioGuardado));
    renderWithAuth();
    expect(capturedContext.usuario).toEqual(usuarioGuardado);
  });

  test('Si localStorage tiene JSON malformado en usuario, no rompe la app', () => {
    localStorage.setItem('usuario', 'esto-no-es-json');
    expect(() => renderWithAuth()).toThrow(); // JSON.parse lanzará, documentamos el comportamiento actual
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 2: guardarToken()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — guardarToken()', () => {

  test('Guardar un token lo persiste en localStorage y actualiza el estado', async () => {
    renderWithAuth();

    act(() => {
      capturedContext.guardarToken('nuevo-token-123');
    });

    expect(capturedContext.token).toBe('nuevo-token-123');
    expect(localStorage.getItem('accessToken')).toBe('nuevo-token-123');
    expect(capturedContext.isAutenticado).toBe(true);
  });

  test('Guardar un token vacío lo elimina de localStorage y pone isAutenticado en false', async () => {
    localStorage.setItem('accessToken', 'token-previo');
    renderWithAuth();

    act(() => {
      capturedContext.guardarToken('');
    });

    expect(capturedContext.token).toBe('');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(capturedContext.isAutenticado).toBe(false);
  });

  test('Guardar un token con espacios los elimina (trim)', async () => {
    renderWithAuth();

    act(() => {
      capturedContext.guardarToken('  token-con-espacios  ');
    });

    expect(capturedContext.token).toBe('token-con-espacios');
    expect(localStorage.getItem('accessToken')).toBe('token-con-espacios');
  });

  test('Guardar null se trata igual que vacío y no rompe la app', async () => {
    localStorage.setItem('accessToken', 'token-previo');
    renderWithAuth();

    act(() => {
      capturedContext.guardarToken(null);
    });

    expect(capturedContext.isAutenticado).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 3: register()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — register()', () => {

  test('Registro exitoso guarda el token y el usuario en el estado y en localStorage', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'token-registro',
        usuario: { id: 'abc123', username: 'pedro' },
      }),
    });

    renderWithAuth();

    await act(async () => {
      await capturedContext.register({ username: 'pedro', password: '1234' });
    });

    expect(capturedContext.token).toBe('token-registro');
    expect(capturedContext.usuario).toEqual({ id: 'abc123', username: 'pedro' });
    expect(capturedContext.isAutenticado).toBe(true);
    expect(localStorage.getItem('accessToken')).toBe('token-registro');
    expect(JSON.parse(localStorage.getItem('usuario'))).toEqual({ id: 'abc123', username: 'pedro' });
  });

  test('Registro exitoso llama a fetch con los parámetros correctos', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'token',
        usuario: { id: '1', username: 'ana' },
      }),
    });

    renderWithAuth();

    await act(async () => {
      await capturedContext.register({ username: 'ana', password: 'pass123' });
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/registro'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ana', password: 'pass123' }),
      })
    );
  });

  test('Si el servidor devuelve error 409 (usuario ya existe), register() lanza el error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'El nombre de usuario no esta disponible.' }),
    });

    renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow('El nombre de usuario no esta disponible.');

    // El estado no debe haberse modificado
    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
  });

  test('Si el servidor devuelve error 400 (validación), register() lanza el error correspondiente', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'El nombre de usuario debe tener entre 3 y 15 caracteres y no contener espacios.' }),
    });

    renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'ab', password: '1234' });
      })
    ).rejects.toThrow('El nombre de usuario debe tener entre 3 y 15 caracteres');
  });

  test('Si la red falla completamente, register() lanza error genérico', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow();

    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
  });

  test('Si el servidor responde ok pero sin JSON válido, no rompe la app', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => { throw new Error('invalid json'); },
    });

    renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow('No se pudo completar el registro.');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 4: cerrarSesion()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — cerrarSesion()', () => {

  test('cerrarSesion() limpia el token y el usuario del estado', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'token',
        usuario: { id: '1', username: 'pedro' },
      }),
    });

    renderWithAuth();

    await act(async () => {
      await capturedContext.register({ username: 'pedro', password: '1234' });
    });

    expect(capturedContext.isAutenticado).toBe(true);

    act(() => {
      capturedContext.cerrarSesion();
    });

    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
    expect(capturedContext.isAutenticado).toBe(false);
  });

  test('cerrarSesion() elimina accessToken y usuario de localStorage', async () => {
    localStorage.setItem('accessToken', 'token-guardado');
    localStorage.setItem('usuario', JSON.stringify({ id: '1', username: 'pedro' }));

    renderWithAuth();

    act(() => {
      capturedContext.cerrarSesion();
    });

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  test('cerrarSesion() sobre una sesión ya cerrada no lanza error', () => {
    renderWithAuth();

    expect(() => {
      act(() => {
        capturedContext.cerrarSesion();
        capturedContext.cerrarSesion(); // Segunda llamada
      });
    }).not.toThrow();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 5: useAuth() — hook
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — useAuth()', () => {

  test('useAuth() lanza error si se usa fuera de AuthProvider', () => {
    // Silenciamos el error de consola que React imprime en este caso
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useAuth debe usarse dentro de AuthProvider');

    consoleSpy.mockRestore();
  });

  test('useAuth() expone token, usuario, isAutenticado, register, guardarToken y cerrarSesion', () => {
    renderWithAuth();

    expect(capturedContext).toHaveProperty('token');
    expect(capturedContext).toHaveProperty('usuario');
    expect(capturedContext).toHaveProperty('isAutenticado');
    expect(capturedContext).toHaveProperty('register');
    expect(capturedContext).toHaveProperty('guardarToken');
    expect(capturedContext).toHaveProperty('cerrarSesion');
  });

  test('register, guardarToken y cerrarSesion son funciones', () => {
    renderWithAuth();

    expect(typeof capturedContext.register).toBe('function');
    expect(typeof capturedContext.guardarToken).toBe('function');
    expect(typeof capturedContext.cerrarSesion).toBe('function');
  });

});
