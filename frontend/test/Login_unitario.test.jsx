import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/components/Login';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLogin    = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../src/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderLogin = (props = {}) =>
  render(
    <MemoryRouter>
      <Login {...props} />
    </MemoryRouter>
  );

/** Rellena usuario y contraseña y hace clic en "Entrar". */
const rellenarYEnviar = async (user, username, password) => {
  await user.type(screen.getByLabelText('Usuario'), username);
  await user.type(screen.getByLabelText('Contraseña'), password);
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
};

/** Selectores de los controles más usados. */
const campo      = (label) => screen.getByLabelText(label);
const botonEntrar = ()     => screen.getByRole('button', { name: 'Entrar' });

// ─── Constantes de texto esperadas ───────────────────────────────────────────

const MSG = {
  usuarioObligatorio : 'El usuario es obligatorio.',
  passwordObligatoria: 'La contraseña es obligatoria.',
  // NUEVO: El mensaje de credencial inválida ya no menciona los espacios
  credencialInvalida : 'Debe tener entre 3 y 15 caracteres.',
  fallbackError      : 'Credenciales inválidas o error en el servidor.',
};

// ─── Suite principal ──────────────────────────────────────────────────────────

describe('Login – formulario de inicio de sesión', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Renderizado inicial ──────────────────────────────────────────────────

  describe('estado inicial', () => {

    test('renderiza los campos y el botón de envío', () => {
      renderLogin();

      expect(campo('Usuario')).toBeInTheDocument();
      expect(campo('Contraseña')).toBeInTheDocument();
      expect(botonEntrar()).toBeInTheDocument();
    });

    // NUEVO: Como ahora dejamos el botón activado para poder mostrar los errores visuales, comprobamos eso.
    test('muestra errores en los campos si se intenta enviar el formulario vacío', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(botonEntrar());

      expect(await screen.findByText(MSG.usuarioObligatorio)).toBeInTheDocument();
      expect(await screen.findByText(MSG.passwordObligatoria)).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('estado cargando: muestra "Iniciando..." y deshabilita el botón', () => {
      renderLogin({ cargando: true });

      const boton = screen.getByRole('button', { name: 'Iniciando...' });
      expect(boton).toBeDisabled();
    });

  });

  // ── Flujo de éxito ───────────────────────────────────────────────────────

  describe('flujo de éxito', () => {

    test('llama a login con las credenciales correctas, muestra mensaje y limpia el formulario', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValueOnce({ mensaje: 'Bienvenido de nuevo' });

      renderLogin();

      await rellenarYEnviar(user, 'maria', 'secreta');

      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith({ username: 'maria', password: 'secreta' })
      );

      expect(await screen.findByRole('status')).toHaveTextContent('Bienvenido de nuevo');
      expect(campo('Usuario')).toHaveValue('');
      expect(campo('Contraseña')).toHaveValue('');
    });

  });

  // ── Flujo de error del servidor ──────────────────────────────────────────

  describe('errores devueltos por el servidor', () => {

    test('muestra el mensaje de error cuando login rechaza con Error', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

      renderLogin();
      await rellenarYEnviar(user, 'maria', 'malpass');

      expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
    });

    test('usa el mensaje de fallback cuando el error no tiene propiedad message', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce({});

      renderLogin();
      await rellenarYEnviar(user, 'maria', '123456');

      expect(await screen.findByText(MSG.fallbackError)).toBeInTheDocument();
    });

    test('el mensaje de error desaparece al volver a escribir en un campo', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

      renderLogin();
      await rellenarYEnviar(user, 'maria', 'malpass');

      expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();

      await user.type(campo('Usuario'), 'a');

      await waitFor(() =>
        expect(screen.queryByText('Credenciales incorrectas')).not.toBeInTheDocument()
      );
    });

  });

  // ── Validación en tiempo real (blur y onChange) ──────────────────────────

  describe('validaciones de campo', () => {

    test('muestra error de campo obligatorio al salir del campo usuario vacío', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(campo('Usuario'));
      await user.tab();

      expect(await screen.findByText(MSG.usuarioObligatorio)).toBeInTheDocument();
    });

    // NUEVO: Verificamos que nuestra nueva lógica de limpiar espacios funciona correctamente en lugar de dar error
    test('elimina los espacios automáticamente al escribir (no permite espacios)', async () => {
      const user = userEvent.setup();
      renderLogin();

      const inputUsuario = campo('Usuario');
      await user.type(inputUsuario, 'a n a p');
      
      expect(inputUsuario).toHaveValue('anap');
      expect(screen.queryByText(MSG.credencialInvalida)).not.toBeInTheDocument();
    });

    test('muestra error cuando la contraseña es demasiado corta', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(campo('Contraseña'), 'ab');
      await user.tab();

      expect(await screen.findByText(MSG.credencialInvalida)).toBeInTheDocument();
    });

    // NUEVO: Adaptamos este test para asegurar que el botón se desactiva cuando hay un error explícito
    test('el botón queda deshabilitado si hay errores visuales en tiempo real', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.type(campo('Usuario'), 'ab'); // Provocamos un error por longitud
      await user.type(campo('Contraseña'), 'secreta');
      await user.tab();

      expect(await screen.findByText(MSG.credencialInvalida)).toBeInTheDocument();
      expect(botonEntrar()).toBeDisabled();
      expect(mockLogin).not.toHaveBeenCalled();
    });

  });

  // ── Navegación ───────────────────────────────────────────────────────────

  describe('navegación', () => {

    test('navega a /registro al pulsar "Regístrate aquí"', async () => {
      const user = userEvent.setup();
      renderLogin();

      await user.click(screen.getByRole('button', { name: 'Regístrate aquí' }));

      expect(mockNavigate).toHaveBeenCalledWith('/registro');
    });

  });

});