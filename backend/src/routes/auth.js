/**
 * Rutas de autenticación y gestión de usuarios.
 * Maneja el registro, inicio de sesión, renovación de tokens (refresh) y cierre de sesión.
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

const router = express.Router();

// Constante para el nombre de la cookie que almacenará el refresh token
const COOKIE_REFRESH = 'jwt_refresh';

/**
 * Configuración de seguridad para las cookies.
 * - httpOnly: Evita el acceso a la cookie mediante JavaScript (mitiga ataques XSS).
 * - secure: Solo envía la cookie a través de HTTPS en entornos de producción.
 * - sameSite: Previene ataques CSRF. Usa 'Strict' en producción y 'Lax' en desarrollo.
 * - maxAge: Tiempo de vida de la cookie establecido a 7 días.
 */
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

/**
 * Construye el payload estándar para los JSON Web Tokens.
 * @param {string} usuarioId - El identificador único del usuario en la base de datos.
 * @returns {object} Objeto estructurado para firmar el token.
 */
const construirPayload = (usuarioId) => ({
    usuario: { id: usuarioId }
});

const normalizarCredenciales = (body = {}) => {
    const usernameNormalizado = (body.username || '').trim();
    const password = body.password || '';

    return { usernameNormalizado, password };
};

const construirUsuarioRespuesta = (usuario) => ({
    id: usuario.id,
    username: usuario.nombre
});

const emitirSesion = async (res, usuario, { statusCode = 200, mensaje } = {}) => {
    const payload = construirPayload(usuario.id);
    const accessToken = generarAccessToken(payload);
    const refreshToken = generarRefreshToken(payload);

    usuario.refreshToken = refreshToken;
    await usuario.save();

    res.cookie(COOKIE_REFRESH, refreshToken, cookieOptions);

    const respuesta = {
        accessToken,
        usuario: construirUsuarioRespuesta(usuario)
    };

    if (mensaje) {
        respuesta.mensaje = mensaje;
    }

    return res.status(statusCode).json(respuesta);
};

/**
 * Genera un Access Token de corta duración.
 * @param {object} payload - Datos a encriptar en el token.
 * @returns {string} Access Token firmado válido por 15 minutos.
 */
const generarAccessToken = (payload) => {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    return jwt.sign(payload, accessSecret, { expiresIn: '15m' });
};

/**
 * Genera un Refresh Token de larga duración.
 * @param {object} payload - Datos a encriptar en el token.
 * @returns {string} Refresh Token firmado válido por 7 días.
 */
const generarRefreshToken = (payload) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    return jwt.sign(payload, refreshSecret, { expiresIn: '7d' });
};

/**
 * Extrae el valor de una cookie específica a partir del encabezado de la petición.
 * @param {string} cookieHeader - El encabezado HTTP 'cookie'.
 * @param {string} cookieName - El nombre de la cookie a buscar.
 * @returns {string|null} El valor decodificado de la cookie, o null si no se encuentra.
 */
const leerCookie = (cookieHeader, cookieName) => {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map((item) => item.trim());
    const cookieBuscada = cookies.find((item) => item.startsWith(`${cookieName}=`));
    if (!cookieBuscada) return null;

    return decodeURIComponent(cookieBuscada.slice(cookieName.length + 1));
};

/**
 * Valida que una credencial (usuario o contraseña) cumpla con los requisitos mínimos de seguridad.
 * @param {string} valor - La cadena de texto a evaluar.
 * @returns {boolean} True si cumple los criterios, false en caso contrario.
 */
const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    if (/\s/.test(valor)) return false; // Verifica que no contenga espacios en blanco
    return true;
};

/**
 * POST /registro
 * Registra un nuevo usuario en el sistema.
 * Valida credenciales, comprueba disponibilidad del nombre de usuario,
 * hashea la contraseña y devuelve un par de tokens (Access y Refresh).
 */
router.post('/registro', async (req, res) => {
    try {
        const { usernameNormalizado, password } = normalizarCredenciales(req.body);

        if (!usernameNormalizado || !password) {
            return res.status(400).json({ error: 'Por favor, rellena todos los campos obligatorios.' });
        }

        if (!credencialValida(usernameNormalizado)) {
            return res.status(400).json({
                error: 'El nombre de usuario debe tener entre 3 y 15 caracteres y no contener espacios.'
            });
        }

        if (!credencialValida(password)) {
            return res.status(400).json({
                error: 'La contrasena debe tener entre 3 y 15 caracteres y no contener espacios.'
            });
        }

        let usuario = await Usuario.findOne({ nombre: usernameNormalizado });
        if (usuario) {
            return res.status(409).json({ error: 'El nombre de usuario no esta disponible.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHasheada = await bcrypt.hash(password, salt);

        usuario = new Usuario({
            nombre: usernameNormalizado,
            password: passwordHasheada
        });
        return emitirSesion(res, usuario, {
            statusCode: 201,
            mensaje: 'Usuario registrado correctamente'
        });

    } catch (error) {
        console.error('Error en el registro:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

/**
 * POST /refresh
 * Emite un nuevo par de tokens utilizando un Refresh Token válido provisto en las cookies.
 * Mitiga el robo de tokens requiriendo coincidencia exacta con el token almacenado en la base de datos.
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = leerCookie(req.headers.cookie, COOKIE_REFRESH);
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token no proporcionado.' });
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        const decoded = jwt.verify(refreshToken, refreshSecret);

        const usuario = await Usuario.findById(decoded?.usuario?.id);
        // Prevenir la reutilización de tokens revocados o reemplazados
        if (!usuario || usuario.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Refresh token invalido.' });
        }

        const payload = construirPayload(usuario.id);
        const nuevoAccessToken = generarAccessToken(payload);
        const nuevoRefreshToken = generarRefreshToken(payload);

        // Actualizar el token en la base de datos (Rotación de Refresh Tokens)
        usuario.refreshToken = nuevoRefreshToken;
        await usuario.save();

        res.cookie(COOKIE_REFRESH, nuevoRefreshToken, cookieOptions);

        return res.status(200).json({
            accessToken: nuevoAccessToken,
            usuario: construirUsuarioRespuesta(usuario)
        });
    } catch (error) {
        return res.status(401).json({ error: 'No se pudo renovar la sesion.' });
    }
});

/**
 * POST /logout
 * Invalida el Refresh Token actual en la base de datos y elimina la cookie del cliente.
 */
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = leerCookie(req.headers.cookie, COOKIE_REFRESH);

        if (refreshToken) {
            // Eliminar el token de la base de datos para prevenir su uso posterior
            await Usuario.findOneAndUpdate(
                { refreshToken },
                { $set: { refreshToken: null } }
            );
        }

        // Limpiar la cookie en el navegador del cliente
        res.clearCookie(COOKIE_REFRESH, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax'
        });

        return res.status(200).json({ mensaje: 'Sesion cerrada correctamente.' });
    } catch (error) {
        return res.status(500).json({ error: 'Error al cerrar sesion.' });
    }
});

/**
 * POST /login
 * Autentica a un usuario existente.
 * Valida las credenciales, compara el hash de la contraseña y, si es exitoso,
 * emite un nuevo par de tokens (Access y Refresh) para establecer la sesión.
 */
router.post('/login', async (req, res) => {
    try {
        const { usernameNormalizado, password } = normalizarCredenciales(req.body);

        if (!usernameNormalizado || !password) {
            return res.status(400).json({ error: 'Por favor, rellena todos los campos obligatorios.' });
        }

        // Buscar el usuario en la base de datos
        const usuario = await Usuario.findOne({ nombre: usernameNormalizado });
        if (!usuario) {
            // Se utiliza un mensaje genérico por seguridad para evitar la enumeración de usuarios
            return res.status(401).json({ error: 'Credenciales invalidas.' });
        }

        const passwordEsValida = await bcrypt.compare(password, usuario.password);
        if (!passwordEsValida) {
            return res.status(401).json({ error: 'Credenciales invalidas.' });
        }

        return emitirSesion(res, usuario, {
            mensaje: 'Inicio de sesion exitoso'
        });
    } catch (error) {
        console.error('Error en el inicio de sesion:', error.message);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;