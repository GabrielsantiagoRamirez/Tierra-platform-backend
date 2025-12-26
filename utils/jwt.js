const jwt = require('jsonwebtoken');

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Objeto usuario con id y email
 * @returns {String} Token JWT
 */
const generateToken = (user) => {
   // Usar una clave secreta desde variables de entorno o una por defecto
   const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
   
   // Payload del token
   const payload = {
      id: user.id || user._id?.toString(),
      email: user.email
   };
   
   // Opciones del token (expira en 1 año - 365 días)
   const options = {
      expiresIn: '365d'
   };
   
   return jwt.sign(payload, secret, options);
};

/**
 * Verifica y decodifica un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
const verifyToken = (token) => {
   try {
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      return jwt.verify(token, secret);
   } catch (error) {
      return null;
   }
};

module.exports = {
   generateToken,
   verifyToken
};

