import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/components/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../src/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

const renderLogin = (props = {}) => render(
  <MemoryRouter>
    <Login {...props} />
  </MemoryRouter>
);

describe('Login - formulario de inicio de sesion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockNavigate.mockReset();
  });

  test('flujo exitoso: envia credenciales, muestra exito y limpia formulario', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ mensaje: 'Bienvenido de nuevo' });

    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'maria',
        password: 'secreta'
      });
    });

    expect(await screen.findByRole('status')).toHaveTextContent('Bienvenido de nuevo');
    expect(screen.getByLabelText('Usuario')).toHaveValue('');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });

  test('edge case: usuario con espacios en extremos se considera invalido y no envia login', async () => {
    const user = userEvent.setup();

    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), '   maria   ');
    await user.type(screen.getByLabelText('Contraseña'), 'secreta');
    const botonEntrar = screen.getByRole('button', { name: 'Entrar' });

    expect(await screen.findByText('Debe tener entre 3 y 15 caracteres y no contener espacios.')).toBeInTheDocument();
    expect(botonEntrar).toBeDisabled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('edge case: si falta algun campo, el boton esta deshabilitado', () => {
    renderLogin();

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  test('muestra error de campo al hacer blur con usuario vacio', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByLabelText('Usuario'));
    await user.tab();

    expect(await screen.findByText('El usuario es obligatorio.')).toBeInTheDocument();
  });

  test('muestra error de validacion en usuario con espacios internos', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), 'ana p');
    await user.tab();

    expect(await screen.findByText('Debe tener entre 3 y 15 caracteres y no contener espacios.')).toBeInTheDocument();
  });

  test('muestra error de validacion en password demasiado corta', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Contraseña'), 'ab');
    await user.tab();

    expect(await screen.findByText('Debe tener entre 3 y 15 caracteres y no contener espacios.')).toBeInTheDocument();
  });

  test('si login falla con credenciales invalidas, muestra mensaje de error', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'malpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  test('edge case: si login falla sin mensaje, usa fallback generico', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({});

    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), '123456');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciales inválidas o error en el servidor.')).toBeInTheDocument();
  });

  test('limpia mensaje de error al volver a escribir en un campo', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Credenciales incorrectas'));

    renderLogin();

    await user.type(screen.getByLabelText('Usuario'), 'maria');
    await user.type(screen.getByLabelText('Contraseña'), 'malpass');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Usuario'), 'a');

    await waitFor(() => {
      expect(screen.queryByText('Credenciales incorrectas')).not.toBeInTheDocument();
    });
  });

  test('navega a registro al pulsar el boton secundario', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Regístrate aquí' }));

    expect(mockNavigate).toHaveBeenCalledWith('/registro');
  });

  test('estado cargando: boton deshabilitado y texto Iniciando...', () => {
    renderLogin({ cargando: true });

    const boton = screen.getByRole('button', { name: 'Iniciando...' });
    expect(boton).toBeDisabled();
  });
});
