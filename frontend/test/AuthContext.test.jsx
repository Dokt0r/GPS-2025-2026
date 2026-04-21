import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from '../src/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE AUXILIAR
// Captura el valor del contexto para poder inspeccionarlo en los tests
// ─────────────────────────────────────────────────────────────────────────────

let capturedContext = null;

const TestConsumer = () => {
  capturedContext = useAuth();
  return null;
};

const renderWithAuth = async () => {
  capturedContext = null;
  await act(async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
  });
};
// ─────────────────────────────────────────────────────────────────────────────
// SETUP Y LIMPIEZA
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.restoreAllMocks();
  // Por defecto: el refresh inicial falla (sin sesión activa)
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    json: async () => ({ error: 'Sin sesión' }),
  });
});

afterEach(() => {
  capturedContext = null;
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 1: ESTADO INICIAL
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — Estado inicial y recuperación de sesión', () => {

  test('Sin sesión activa: token vacío, usuario null, isAutenticado false', async () => {
    await renderWithAuth();
    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
    expect(capturedContext.isAutenticado).toBe(false);
  });

  test('cargando pasa a false tras intentar recuperar la sesión', async () => {
    await renderWithAuth();
    expect(capturedContext.cargando).toBe(false);
  });

});



// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 2: register()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — register()', () => {

  test('Registro exitoso guarda token y usuario en el estado', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) // refresh inicial
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accessToken: 'token-registro',
          usuario: { id: 'abc', username: 'ana' },
        }),
      });

    await renderWithAuth();

    await act(async () => {
      await capturedContext.register({ username: 'ana', password: '1234' });
    });

    expect(capturedContext.token).toBe('token-registro');
    expect(capturedContext.usuario).toEqual({ id: 'abc', username: 'ana' });
    expect(capturedContext.isAutenticado).toBe(true);
  });

  test('Registro exitoso llama a fetch con los parámetros correctos', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: 'token', usuario: { id: '1', username: 'ana' } }),
      });

    await renderWithAuth();

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

  test('Error 409 (usuario duplicado) lanza error sin modificar el estado', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'El nombre de usuario no esta disponible.' }),
      });

    await renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow('El nombre de usuario no esta disponible.');

    expect(capturedContext.token).toBe('');
    expect(capturedContext.usuario).toBeNull();
  });

  test('Error 400 (validación) lanza el error del servidor', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'El nombre de usuario debe tener entre 3 y 15 caracteres y no contener espacios.' }),
      });

    await renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'ab', password: '1234' });
      })
    ).rejects.toThrow('El nombre de usuario debe tener entre 3 y 15 caracteres');
  });

  test('Fallo de red lanza error de conexión con el servidor', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockRejectedValueOnce(new Error('Failed to fetch'));

    await renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow('Error de conexión con el servidor.');
  });

  test('Respuesta sin JSON válido usa el mensaje genérico', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('invalid json'); },
      });

    await renderWithAuth();

    await expect(
      act(async () => {
        await capturedContext.register({ username: 'pedro', password: '1234' });
      })
    ).rejects.toThrow('No se pudo completar el registro.');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 3: useAuth() — hook
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext — useAuth()', () => {

  test('Lanza error si se usa fuera de AuthProvider', () => {
    // Silenciamos el console.error esperado de React al lanzar una excepción
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => { render(<TestConsumer />); })
      .toThrow('useAuth debe usarse dentro de un AuthProvider');

    consoleSpy.mockRestore();
  });

  test('Expone todas las propiedades del contexto', async () => {
    await renderWithAuth();

    expect(capturedContext).toHaveProperty('token');
    expect(capturedContext).toHaveProperty('usuario');
    expect(capturedContext).toHaveProperty('cargando');
    expect(capturedContext).toHaveProperty('isAutenticado');
    expect(capturedContext).toHaveProperty('register');
  });

});