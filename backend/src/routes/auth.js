const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario'); 

const router = express.Router();

// POST /api/usuarios/registro
router.post('/registro', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'Por favor, rellena todos los campos obligatorios.' });
        }

        let usuario = await Usuario.findOne({ email });
        if (usuario) {
            return res.status(400).json({ error: 'Este correo electrónico ya está en uso.' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHasheada = await bcrypt.hash(password, salt);

        usuario = new Usuario({
            nombre,
            email,
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
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Error en el registro:', error.message);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;