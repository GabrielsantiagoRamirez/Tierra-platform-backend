const userService = require('../services/userService');
const { validateUserRegister, validateUserLogin } = require('../utils/validators');
const { normalizeUserData } = require('../utils/transformers');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('📝 [REGISTER] Iniciando registro de usuario...');
      
      // Normalizar datos (acepta snake_case y camelCase)
      const normalizedData = normalizeUserData(req.body);
      console.log('✅ [REGISTER] Datos normalizados en', Date.now() - startTime, 'ms');
      
      // Validar datos
      const validation = validateUserRegister(normalizedData);
      if (!validation.isValid) {
         console.log('❌ [REGISTER] Validación fallida:', validation.errors);
         return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validation.errors
         });
      }
      console.log('✅ [REGISTER] Validación exitosa en', Date.now() - startTime, 'ms');

      // Crear usuario usando el servicio
      const saveStartTime = Date.now();
      const saved = await userService.registerUser(normalizedData);
      console.log('✅ [REGISTER] Usuario guardado en', Date.now() - saveStartTime, 'ms');
      
      // Generar token JWT
      const token = generateToken(saved);
      console.log('✅ [REGISTER] Token generado');
      console.log('✅ [REGISTER] Total tiempo:', Date.now() - startTime, 'ms');

      return res.status(201).json({
         status: 'success',
         message: 'User registered successfully',
         user: saved,
         token: token
      });

   } catch (error) {
      console.error('❌ [REGISTER] Error:', error.message);
      console.error('❌ [REGISTER] Stack:', error.stack);
      console.error('❌ [REGISTER] Tiempo total antes del error:', Date.now() - startTime, 'ms');
      
      // Si el error es que el email ya existe
      if (error.message === 'Email already exists') {
         return res.status(409).json({
            status: 'error',
            message: 'Email already exists',
            error: error.message
         });
      }
      
      return res.status(500).json({
         status: 'error',
         message: 'Error registering user',
         error: error.message
      });
   }
};

const login = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('🔐 [LOGIN] Iniciando autenticación...');
      
      // Normalizar datos (acepta snake_case y camelCase)
      const normalizedData = normalizeUserData(req.body);
      console.log('✅ [LOGIN] Datos normalizados en', Date.now() - startTime, 'ms');
      
      // Validar datos
      const validation = validateUserLogin(normalizedData);
      if (!validation.isValid) {
         console.log('❌ [LOGIN] Validación fallida:', validation.errors);
         return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validation.errors
         });
      }
      console.log('✅ [LOGIN] Validación exitosa en', Date.now() - startTime, 'ms');

      // Autenticar usuario
      const authStartTime = Date.now();
      const user = await userService.loginUser(normalizedData.email, normalizedData.password);
      console.log('✅ [LOGIN] Autenticación completada en', Date.now() - authStartTime, 'ms');
      
      if (!user) {
         console.log('❌ [LOGIN] Credenciales inválidas');
         return res.status(401).json({
            status: 'error',
            message: 'Invalid email or password'
         });
      }
      
      // Generar token JWT
      const token = generateToken(user);
      console.log('✅ [LOGIN] Token generado');
      console.log('✅ [LOGIN] Total tiempo:', Date.now() - startTime, 'ms');

      return res.status(200).json({
         status: 'success',
         message: 'Login successful',
         user: user,
         token: token
      });

   } catch (error) {
      console.error('❌ [LOGIN] Error:', error.message);
      console.error('❌ [LOGIN] Stack:', error.stack);
      console.error('❌ [LOGIN] Tiempo total antes del error:', Date.now() - startTime, 'ms');
      
      return res.status(500).json({
         status: 'error',
         message: 'Error during login',
         error: error.message
      });
   }
};

const listMasters = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await userService.listMasterUsers(page, limit);
      
      return res.status(200).json({
         status: 'success',
         data: result
      });
   } catch (error) {
      console.error('❌ [LIST MASTERS] Error:', error.message);
      console.error('❌ [LIST MASTERS] Stack:', error.stack);
      
      return res.status(500).json({
         status: 'error',
         message: 'Error listing master users',
         error: error.message
      });
   }
};

module.exports = {
   register,
   login,
   listMasters
};

