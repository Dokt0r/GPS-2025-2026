const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        const authHeader = req.header('Authorization') || '';
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7).trim()
            : null;

        if (!token) {
            return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
        }

        const secret = process.env.JWT_ACCESS_SECRET;
        if (!secret) {
            return res.status(500).json({ error: 'Configuracion de autenticacion incompleta.' });
        }

        const decoded = jwt.verify(token, secret);
        req.usuario = decoded.usuario;

        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Token invalido o expirado.' });
    }
};

module.exports = auth;
