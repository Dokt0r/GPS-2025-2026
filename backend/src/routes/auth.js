const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario'); 

const router = express.Router();

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

        const payload = {
            usuario: {
                id: usuario.id
            }
        };

        // Crear el Access Token (Corta duración)
        const accessSecret = process.env.JWT_ACCESS_SECRET;
        const accessToken = jwt.sign(payload, accessSecret, { expiresIn: '15m' });

        // Crear el Refresh Token (Larga duración)
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

        // Guardar el Refresh Token en la base de datos para este usuario
        usuario.refreshToken = refreshToken;
        await usuario.save(); 

        // Enviar el Refresh Token como una Cookie HttpOnly (Máxima seguridad)
        // Esto evita ataques XSS porque JavaScript en el frontend no puede leer esta cookie.
        res.cookie('jwt_refresh', refreshToken, {
            httpOnly: true, // No accesible desde JavaScript (React)
            secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
            sameSite: 'Strict', // Protege contra ataques CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días en milisegundos
        });

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

module.exports = router;