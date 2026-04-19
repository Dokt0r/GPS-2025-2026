const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');

const router = express.Router();
const COOKIE_REFRESH = 'jwt_refresh';

// DESPUÉS
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const construirPayload = (usuarioId) => ({
    usuario: { id: usuarioId }
});

const generarAccessToken = (payload) => {
    const accessSecret = process.env.JWT_ACCESS_SECRET;
    return jwt.sign(payload, accessSecret, { expiresIn: '15m' });
};

const generarRefreshToken = (payload) => {
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    return jwt.sign(payload, refreshSecret, { expiresIn: '7d' });
};

const leerCookie = (cookieHeader, cookieName) => {
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(';').map((item) => item.trim());
    const cookieBuscada = cookies.find((item) => item.startsWith(`${cookieName}=`));
    if (!cookieBuscada) return null;

    return decodeURIComponent(cookieBuscada.slice(cookieName.length + 1));
};

const credencialValida = (valor) => {
    if (typeof valor !== 'string') return false;
    if (valor.length < 3 || valor.length > 15) return false;
    if (/\s/.test(valor)) return false;
    return true;
};

// POST /api/usuarios/registro
router.post('/registro', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usernameNormalizado = (username || '').trim();

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

        const payload = construirPayload(usuario.id);
        const accessToken = generarAccessToken(payload);
        const refreshToken = generarRefreshToken(payload);

        // Guardar el Refresh Token en la base de datos para este usuario
        usuario.refreshToken = refreshToken;
        await usuario.save();

        // Enviar el Refresh Token como una Cookie HttpOnly (Máxima seguridad)
        // Esto evita ataques XSS porque JavaScript en el frontend no puede leer esta cookie.
        res.cookie(COOKIE_REFRESH, refreshToken, cookieOptions);

        //Devolver el Access Token y los datos del usuario en el JSON
        res.status(201).json({
            mensaje: 'Usuario registrado correctamente',
            accessToken, // React guardará esto en memoria o localStorage temporal
            usuario: {
                id: usuario.id,
                username: usuario.nombre
            }
        });

    } catch (error) {
        console.error('Error en el registro:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = leerCookie(req.headers.cookie, COOKIE_REFRESH);
        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token no proporcionado.' });
        }

        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        const decoded = jwt.verify(refreshToken, refreshSecret);

        const usuario = await Usuario.findById(decoded?.usuario?.id);
        if (!usuario || usuario.refreshToken !== refreshToken) {
            return res.status(401).json({ error: 'Refresh token invalido.' });
        }

        const payload = construirPayload(usuario.id);
        const nuevoAccessToken = generarAccessToken(payload);
        const nuevoRefreshToken = generarRefreshToken(payload);

        usuario.refreshToken = nuevoRefreshToken;
        await usuario.save();

        res.cookie(COOKIE_REFRESH, nuevoRefreshToken, cookieOptions);

        // DESPUÉS
        return res.status(200).json({
            accessToken: nuevoAccessToken,
            usuario: {
                id: usuario.id,
                username: usuario.nombre
            }
        });
    } catch (error) {
        return res.status(401).json({ error: 'No se pudo renovar la sesion.' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = leerCookie(req.headers.cookie, COOKIE_REFRESH);

        if (refreshToken) {
            await Usuario.findOneAndUpdate(
                { refreshToken },
                { $set: { refreshToken: null } }
            );
        }

        // DESPUÉS
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

module.exports = router;