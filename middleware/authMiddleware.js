const { verifyToken } = require('../utils/jwt');
const { getUserById } = require('../services/userService');


const auth = async (req, res, next) => {
   try {
      // Extraer token del header Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({
            status: 'error',
            message: 'No token provided or invalid format. Use: Authorization: Bearer <token>'
         });
      }
      
      // Extraer el token (remover "Bearer ")
      const token = authHeader.substring(7);
      
      // Verificar token
      const decoded = verifyToken(token);
      
      if (!decoded || !decoded.id) {
         return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
         });
      }
      
      // Buscar usuario en la base de datos
      const user = await getUserById(decoded.id);
      
      if (!user) {
         return res.status(401).json({
            status: 'error',
            message: 'User not found'
         });
      }
      
      // Agregar usuario a la request
      req.user = user;
      next();
      
   } catch (error) {
      console.error('❌ [AUTH] Error:', error.message);
      return res.status(500).json({
         status: 'error',
         message: 'Authentication error',
         error: error.message
      });
   }
};


const master = (req, res, next) => {
   try {
      // Verificar que req.user existe (debe ejecutarse después de auth)
      if (!req.user) {
         return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
         });
      }
      
      // Verificar que el usuario sea tipo 'master'
      if (req.user.type !== 'master') {
         return res.status(403).json({
            status: 'error',
            message: 'Access denied. Master role required'
         });
      }
      
      next();
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      return res.status(500).json({
         status: 'error',
         message: 'Authorization error',
         error: error.message
      });
   }
};


const adminOrMaster = (req, res, next) => {
   try {
      // Verificar que req.user existe (debe ejecutarse después de auth)
      if (!req.user) {
         return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
         });
      }
      
      // Verificar que el usuario sea tipo 'admin' o 'master'
      if (req.user.type !== 'admin' && req.user.type !== 'master') {
         return res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin or Master role required'
         });
      }
      
      next();
      
   } catch (error) {
      console.error('❌ [ADMIN_OR_MASTER] Error:', error.message);
      return res.status(500).json({
         status: 'error',
         message: 'Authorization error',
         error: error.message
      });
   }
};

module.exports = {
   auth,
   master,
   adminOrMaster
};

