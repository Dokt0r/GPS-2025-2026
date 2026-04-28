// test/GuardarFavoritas.unitario.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// 1. Desactivar buffering de Mongoose para evitar timeouts
mongoose.set('bufferCommands', false);

// 2. Mockear los modelos usando la sintaxis correcta para CommonJS
vi.mock('../src/models/recetas', () => ({
  findById: vi.fn()
}));

vi.mock('../src/models/usuario', () => ({
  findById: vi.fn()
}));

// 3. Importar el servicio (que usa require) - Vitest resolverá los mocks
// Si falla, usar import dinámico
let guardarRecetaComoFavorita, FavoritosError;

beforeAll(async () => {
  const module = await import('../src/services/favoritos');
  guardarRecetaComoFavorita = module.guardarRecetaComoFavorita;
  FavoritosError = module.FavoritosError;
});

describe('favoritosService - guardarRecetaComoFavorita', () => {
  const mockUsuarioId = 'usuario-123';
  const mockRecetaIdValido = '507f1f77bcf86cd799439011';
  const mockRecetaIdInvalido = 'id-invalido';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reiniciar los mocks directamente desde los módulos mockeados
    const { findById: recetaFindById } = require('../src/models/recetas');
    const { findById: usuarioFindById } = require('../src/models/usuario');
    recetaFindById.mockReset();
    usuarioFindById.mockReset();
  });

  test('debe lanzar error 400 si falta el ID de la receta', async () => {
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: null }))
      .rejects.toMatchObject({
        status: 400,
        message: 'Falta el ID de la receta.'
      });
  });

  test('debe lanzar error 400 si el recetaId no es un ObjectId válido', async () => {
    // Mockear isValid para este test
    vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdInvalido }))
      .rejects.toMatchObject({
        status: 400,
        message: 'El ID de la receta no es valido.'
      });
    vi.restoreAllMocks();
  });

  test('debe lanzar error 404 si la receta no existe', async () => {
    const { findById } = require('../src/models/recetas');
    findById.mockResolvedValue(null);
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 404,
        message: 'La receta no existe.'
      });
    expect(findById).toHaveBeenCalledWith(mockRecetaIdValido);
  });

  test('debe lanzar error 401 si el usuario no existe', async () => {
    const recetaModel = require('../src/models/recetas');
    const usuarioModel = require('../src/models/usuario');
    recetaModel.findById.mockResolvedValue({ _id: mockRecetaIdValido });
    usuarioModel.findById.mockResolvedValue(null);
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 401,
        message: 'Usuario no autorizado.'
      });
    expect(usuarioModel.findById).toHaveBeenCalledWith(mockUsuarioId);
  });

  test('debe lanzar error 400 si la receta ya está en favoritos', async () => {
    const recetaModel = require('../src/models/recetas');
    const usuarioModel = require('../src/models/usuario');
    recetaModel.findById.mockResolvedValue({ _id: mockRecetaIdValido });
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [{ nombreLista: 'Favoritos', recetas: [mockRecetaIdValido] }],
      save: vi.fn().mockResolvedValue(true)
    };
    usuarioModel.findById.mockResolvedValue(usuarioMock);
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 400,
        message: 'La receta ya está en tu lista de favoritos.'
      });
    expect(usuarioMock.save).not.toHaveBeenCalled();
  });

  test('debe crear la lista "Favoritos" si no existe y guardar la receta', async () => {
    const recetaModel = require('../src/models/recetas');
    const usuarioModel = require('../src/models/usuario');
    recetaModel.findById.mockResolvedValue({ _id: mockRecetaIdValido });
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [],
      save: vi.fn().mockResolvedValue(true)
    };
    usuarioModel.findById.mockResolvedValue(usuarioMock);
    const resultado = await guardarRecetaComoFavorita({
      usuarioId: mockUsuarioId,
      recetaId: mockRecetaIdValido
    });
    expect(resultado).toEqual({
      success: true,
      mensaje: 'Receta añadida a tu lista de favoritos correctamente.'
    });
    expect(usuarioMock.listas).toHaveLength(1);
    expect(usuarioMock.listas[0]).toMatchObject({
      nombreLista: 'Favoritos',
      recetas: [mockRecetaIdValido]
    });
    expect(usuarioMock.save).toHaveBeenCalledTimes(1);
  });

  test('debe usar una lista existente ignorando mayúsculas/minúsculas', async () => {
    const recetaModel = require('../src/models/recetas');
    const usuarioModel = require('../src/models/usuario');
    recetaModel.findById.mockResolvedValue({ _id: mockRecetaIdValido });
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [{ nombreLista: 'favoritos', recetas: [] }],
      save: vi.fn().mockResolvedValue(true)
    };
    usuarioModel.findById.mockResolvedValue(usuarioMock);
    const resultado = await guardarRecetaComoFavorita({
      usuarioId: mockUsuarioId,
      recetaId: mockRecetaIdValido
    });
    expect(resultado.success).toBe(true);
    expect(usuarioMock.listas).toHaveLength(1);
    expect(usuarioMock.listas[0].recetas).toContainEqual(mockRecetaIdValido);
    expect(usuarioMock.save).toHaveBeenCalledTimes(1);
  });
});