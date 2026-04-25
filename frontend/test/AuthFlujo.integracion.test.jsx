import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/AuthContext';

const INGREDIENTES_BASE = [
  { _id: 'i1', nombre: 'Tomate', unidad: 'ud', equivalencia_g_ml: null },
];

const NEVERA_USUARIO = {
  nevera: [
    { nombre: 'Tomate', cantidad: 2, unidad: 'ud', equivalencia_g_ml: null },
  ],
};

const renderApp = (initialRoute = '/') =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>
    </AuthProvider>
  );

const mockApi = ({ refreshOk = false, loginOk = true, loginError = 'Credenciales incorrectas' } = {}) => {
  global.fetch = vi.fn(async (input, options = {}) => {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/api/auth/refresh')) {
      if (!refreshOk) {
        return { ok: false, status: 401, json: async () => ({ error: 'Sin sesion' }) };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'token-refresh',
          usuario: { id: 'u1', username: 'maria' },
        }),
      };
    }

    if (url.includes('/api/auth/login')) {
      if (!loginOk) {
        return {
          ok: false,
          status: 401,
          json: async () => ({ error: loginError }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          accessToken: 'token-login',
          usuario: { id: 'u1', username: 'maria' },
          mensaje: 'Bienvenido de nuevo',
        }),
      };
    }

    if (url.includes('/api/ingredientes/nevera')) {
      return { ok: true, status: 200, json: async () => NEVERA_USUARIO };
    }

    if (url.includes('/api/ingredientes')) {
      return { ok: true, status: 200, json: async () => INGREDIENTES_BASE };
    }

    return { ok: false, status: 404, json: async () => ({ error: 'No encontrado' }) };
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Integracion autenticacion - flujo de login', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Verifica que, sin sesion activa, la app mande al formulario de login.
  test('si no hay sesion activa, redirige al formulario de login', async () => {
    mockApi({ refreshOk: false });

    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );
    });
  });

  // Verifica el caso feliz: login correcto y acceso a la vista principal protegida.
  test('login exitoso: autentica y carga la vista principal protegida', async () => {
    const user = userEvent.setup();
    mockApi({ refreshOk: false, loginOk: true });

    renderApp('/');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Mi Nevera Virtual')).toBeInTheDocument();
    expect(await screen.findByText('Tomate')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'maria', password: 'secreta' }),
        })
      );
    });
  });

  // Verifica que las credenciales invalidas muestran error y no abandonan la pantalla de login.
  test('login invalido: muestra error y permanece en login', async () => {
    const user = userEvent.setup();
    mockApi({ refreshOk: false, loginOk: false, loginError: 'Credenciales incorrectas' });

    renderApp('/');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'mala');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  // NUEVO: verificamos que si, tras quitar espacios, es corto, salta el error y bloquea.
  test('muestra validacion de campo y deshabilita el boton si la longitud no es válida', async () => {
    const user = userEvent.setup();
    mockApi({ refreshOk: false });

    renderApp('/login');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    // Escribimos algo que, al quitar espacios, quede en menos de 3 caracteres
    await user.type(screen.getByLabelText('Usuario'), 'a b');
    await user.tab();

    expect(await screen.findByText('Debe tener entre 3 y 15 caracteres.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.anything()
    );
  });

  // NUEVO: Se verifica que el intento de enviar en blanco revela los errores debajo de cada input.
  test('muestra errores de campo obligatorio si se intenta enviar el formulario vacío', async () => {
    const user = userEvent.setup();
    mockApi({ refreshOk: false });

    renderApp('/login');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    // Hacemos click directamente sin rellenar nada
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();
    expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.anything()
    );
  });

  // Verifica que un fallo de red en login se traduce en un mensaje entendible para el usuario.
  test('si falla la red durante el login, muestra el mensaje de conexion', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/api/auth/refresh')) {
        return { ok: false, status: 401, json: async () => ({ error: 'Sin sesion' }) };
      }

      if (url.includes('/api/auth/login')) {
        throw new Error('Failed to fetch');
      }

      return { ok: false, status: 404, json: async () => ({}) };
    });

    renderApp('/login');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Error de conexión. Verifica que el servidor esté en línea.')).toBeInTheDocument();
  });

  // Verifica que desde login se puede entrar y salir de la pantalla de registro.
  test('permite navegar de login a registro y volver a login', async () => {
    const user = userEvent.setup();
    mockApi({ refreshOk: false });

    renderApp('/login');

    await screen.findByRole('heading', { name: 'Iniciar sesión' });

    await user.click(screen.getByRole('button', { name: 'Regístrate aquí' }));
    expect(await screen.findByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Inicia sesión' }));
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

});