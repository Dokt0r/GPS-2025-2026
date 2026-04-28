export const guardarRecetaFavorita = async ({ fetchConAuth, apiUrl, recetaId }) => {
  const respuesta = await fetchConAuth(`${apiUrl}/api/recetas/favoritos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recetaId }),
  });

  const data = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    return {
      ok: false,
      mensaje: data.error || 'No se pudo guardar en favoritos.',
    };
  }

  return {
    ok: true,
    mensaje: data.mensaje || 'Receta añadida a favoritos.',
  };
};
