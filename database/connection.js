const mongoose = require('mongoose');

// URI de conexión - Usa MONGODB_URI desde .env (RECOMENDADO)
// O puedes usar variables individuales si prefieres
let uri = process.env.MONGODB_URI;

if (!uri) {
   // Si no hay URI completa, construir desde variables individuales
   const user = process.env.MONGODB_USER || 'pablomelo0420';
   const password = process.env.MONGODB_PASSWORD || 'pablomelo0420';
   const cluster = process.env.MONGODB_CLUSTER || 'tierradb.beaz9os.mongodb.net';
   const database = process.env.MONGODB_DATABASE || '';
   const appName = process.env.MONGODB_APP_NAME || 'TierraDB';
   
   // Codificar la contraseña para manejar caracteres especiales
   const encodedPassword = encodeURIComponent(password);
   const dbPath = database ? `/${database}` : '';
   uri = `mongodb+srv://${user}:${encodedPassword}@${cluster}${dbPath}?appName=${appName}`;
}



// Función para conectar a MongoDB (optimizada para serverless)
const connection = async () => {
   try {
      // Si ya hay una conexión activa, reutilizarla (importante para serverless)
      if (mongoose.connection.readyState === 1) {
         console.log('✅ Reutilizando conexión existente a MongoDB');
         return mongoose.connection;
      }

      // Si está conectando, esperar a que termine
      if (mongoose.connection.readyState === 2) {
         console.log('⏳ Esperando conexión en progreso...');
         await new Promise((resolve) => {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', resolve);
         });
         if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
         }
      }

      console.log('🔄 Intentando conectar a MongoDB...');
      console.log('📍 URI de conexión:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Oculta credenciales

      // Opciones optimizadas para serverless/Vercel
      const options = {
         serverSelectionTimeoutMS: 5000, // Timeout más corto para fallar rápido
         socketTimeoutMS: 45000, // Timeout de socket más largo
         connectTimeoutMS: 10000, // Timeout de conexión
         maxPoolSize: 1, // Para serverless, usar pool pequeño
         minPoolSize: 1,
         bufferMaxEntries: 0, // Deshabilitar buffering (fallar rápido si no hay conexión)
         bufferCommands: false, // Deshabilitar buffering de comandos
      };

      await mongoose.connect(uri, options);

      // Obtener información de la conexión
      const db = mongoose.connection;
      const dbName = db.name || 'Base de datos no especificada';
      const host = db.host || 'Host no disponible';
      const port = db.port || 'Puerto no disponible';

      console.log('✅ Conexión exitosa a MongoDB Atlas');
      console.log('📊 Información de la base de datos:');
      console.log(`   🗄️  Base de datos: ${dbName}`);
      console.log(`   🌐 Host: ${host}`);
      console.log(`   🔌 Puerto: ${port}`);
      console.log(`   🔗 Estado: ${db.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
      console.log(`   ⏰ Timestamp: ${new Date().toLocaleString()}`);

      // Log cuando se desconecte
      db.on('disconnected', () => {
         console.log('❌ Desconectado de MongoDB Atlas');
      });

      // Log cuando se reconecte
      db.on('reconnected', () => {
         console.log('🔄 Reconectado a MongoDB Atlas');
      });

      // Log de errores de conexión
      db.on('error', (err) => {
         console.error('💥 Error en la conexión de MongoDB:', err);
      });

   } catch (err) {
      console.error('❌ Error al conectar a MongoDB Atlas:', err);
      console.error('🔍 Detalles del error:', {
         name: err.name,
         message: err.message,
         code: err.code
      });
      
      // Si es error de autenticación, dar sugerencias
      if (err.code === 8000 || err.message.includes('authentication failed')) {
         console.error('\n💡 Posibles soluciones:');
         console.error('   1. Verifica que las credenciales en el archivo .env sean correctas');
         console.error('   2. Verifica que el usuario tenga permisos en MongoDB Atlas');
         console.error('   3. Verifica que la IP esté en la whitelist de MongoDB Atlas');
         console.error('   4. Verifica que la contraseña no tenga caracteres especiales sin codificar');
      }
      
      // No lanzar el error para que el servidor pueda seguir funcionando
      // (opcional: puedes cambiar esto si prefieres que la app se detenga)
      // throw err;
   }
};

module.exports = connection;
