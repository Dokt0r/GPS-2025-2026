// test/GuardarFavoritas.unitario.test.js
import { describe, test, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// 1. Importamos los modelos REALES y el servicio directamente
import Receta from '../src/models/recetas';
import Usuario from '../src/models/usuario';
import { guardarRecetaComoFavorita, FavoritosError } from '../src/services/favoritos';

// 2. Desactivar buffering de Mongoose para evitar timeouts
mongoose.set('bufferCommands', false);

describe('favoritosService - guardarRecetaComoFavorita', () => {
  const mockUsuarioId = 'usuario-123';
  const mockRecetaIdValido = '507f1f77bcf86cd799439011';
  const mockRecetaIdInvalido = 'id-invalido';

  let mockSelect;

  beforeEach(() => {
    // Restaurar los espías (spies) antes de cada test para que no haya interferencias
    vi.restoreAllMocks();

    mockSelect = vi.fn();

    // 3. SPYON: Espiamos el objeto real Receta para interceptar findById.
    // Le decimos que en lugar de ir a la BBDD, devuelva un objeto con nuestro mockSelect
    vi.spyOn(Receta, 'findById').mockReturnValue({
      select: mockSelect
    });

    // Hacemos lo mismo con el Usuario
    vi.spyOn(Usuario, 'findById').mockResolvedValue(null);
  });

  test('debe lanzar error 400 si falta el ID de la receta', async () => {
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: null }))
      .rejects.toMatchObject({
        status: 400,
        message: 'Falta el ID de la receta.'
      });
  });

  test('debe lanzar error 400 si el recetaId no es un ObjectId válido', async () => {
    const isValidSpy = vi.spyOn(mongoose.Types.ObjectId, 'isValid').mockReturnValue(false);
    
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdInvalido }))
      .rejects.toMatchObject({
        status: 400,
        message: 'El ID de la receta no es valido.'
      });
      
    isValidSpy.mockRestore();
  });

  test('debe lanzar error 404 si la receta no existe', async () => {
    // Configuramos nuestro mockSelect para simular que no se encontró la receta
    mockSelect.mockResolvedValue(null);
    
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 404,
        message: 'La receta no existe.'
      });
      
    expect(Receta.findById).toHaveBeenCalledWith(mockRecetaIdValido);
    expect(mockSelect).toHaveBeenCalledWith('_id');
  });

  test('debe lanzar error 401 si el usuario no existe', async () => {
    mockSelect.mockResolvedValue({ _id: mockRecetaIdValido });
    // Por defecto Usuario.findById está mockeado a null en el beforeEach
    
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 401,
        message: 'Usuario no autorizado.'
      });
      
    expect(Usuario.findById).toHaveBeenCalledWith(mockUsuarioId);
  });

  test('debe lanzar error 400 si la receta ya está en favoritos', async () => {
    mockSelect.mockResolvedValue({ _id: mockRecetaIdValido });
    
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [{ nombreLista: 'Favoritos', recetas: [mockRecetaIdValido] }],
      save: vi.fn().mockResolvedValue(true)
    };
    // Interceptamos la búsqueda de usuario para devolver nuestro mock
    Usuario.findById.mockResolvedValue(usuarioMock);
    
    await expect(guardarRecetaComoFavorita({ usuarioId: mockUsuarioId, recetaId: mockRecetaIdValido }))
      .rejects.toMatchObject({
        status: 400,
        message: 'La receta ya está en tu lista de favoritos.'
      });
      
    expect(usuarioMock.save).not.toHaveBeenCalled();
  });

  test('debe crear la lista "Favoritos" si no existe y guardar la receta', async () => {
    mockSelect.mockResolvedValue({ _id: mockRecetaIdValido });
    
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [],
      save: vi.fn().mockResolvedValue(true)
    };
    Usuario.findById.mockResolvedValue(usuarioMock);
    
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
    mockSelect.mockResolvedValue({ _id: mockRecetaIdValido });
    
    const usuarioMock = {
      _id: mockUsuarioId,
      listas: [{ nombreLista: 'favoritos', recetas: [] }],
      save: vi.fn().mockResolvedValue(true)
    };
    Usuario.findById.mockResolvedValue(usuarioMock);
    
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