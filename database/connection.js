const mongoose = require('mongoose');

// URI de conexión - Usa MONGODB_URI desde .env (RECOMENDADO)
// O puedes usar variables individuales si prefieres
let uri = process.env.MONGODB_URI;
let database = ''; // Variable para logging

if (!uri) {
   // Si no hay URI completa, construir desde variables individuales
   const user = process.env.MONGODB_USER || 'pablomelo0420';
   const password = process.env.MONGODB_PASSWORD || 'pablomelo0420';
   const cluster = process.env.MONGODB_CLUSTER || 'tierradb.beaz9os.mongodb.net';
   database = process.env.MONGODB_DATABASE || '';
   const appName = process.env.MONGODB_APP_NAME || 'TierraDB';
   
   // Codificar la contraseña para manejar caracteres especiales
   const encodedPassword = encodeURIComponent(password);
   const dbPath = database ? `/${database}` : '';
   uri = `mongodb+srv://${user}:${encodedPassword}@${cluster}${dbPath}?appName=${appName}`;
   
   // Log para debugging (sin mostrar credenciales)
   console.log('🔧 Construyendo URI desde variables individuales:');
   console.log(`   📦 Base de datos: ${database || '(no especificada - usará default)'}`);
   console.log(`   🌐 Cluster: ${cluster}`);
} else {
   // Si hay URI completa, intentar extraer la base de datos para logging
   const dbMatch = uri.match(/\/([^?]+)\?/);
   if (dbMatch) {
      database = dbMatch[1];
   }
   console.log('🔧 Usando MONGODB_URI completa');
   console.log(`   📦 Base de datos en URI: ${database || '(no especificada en URI)'}`);
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
         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
               reject(new Error('Connection timeout: Waiting for existing connection'));
            }, 10000);
            
            mongoose.connection.once('connected', () => {
               clearTimeout(timeout);
               resolve();
            });
            
            mongoose.connection.once('error', (err) => {
               clearTimeout(timeout);
               reject(err);
            });
         });
         
         if (mongoose.connection.readyState === 1) {
            return mongoose.connection;
         } else {
            throw new Error('Connection failed after waiting');
         }
      }

      console.log('🔄 Intentando conectar a MongoDB...');
      console.log('📍 URI de conexión:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Oculta credenciales

      // Opciones optimizadas para serverless/Vercel
      const options = {
         serverSelectionTimeoutMS: 10000, // Timeout para seleccionar servidor
         socketTimeoutMS: 45000, // Timeout de socket
         connectTimeoutMS: 10000, // Timeout de conexión inicial
         maxPoolSize: 1, // Para serverless, usar pool pequeño
         minPoolSize: 1,
         // Habilitar buffering para que espere la conexión antes de ejecutar comandos
         bufferCommands: true, // IMPORTANTE: true para que espere la conexión
      };

      // Iniciar conexión
      // IMPORTANTE: Si la URI incluye la base de datos, Mongoose la usará automáticamente
      await mongoose.connect(uri, options);
      
      // Log adicional para verificar la base de datos
      console.log('🔍 Verificando base de datos después de conectar...');
      console.log(`   📦 Base de datos en URI: ${database || 'no especificada'}`);

      // IMPORTANTE: mongoose.connect() puede resolverse antes de que la conexión esté lista
      // Necesitamos esperar explícitamente el evento 'connected'
      if (mongoose.connection.readyState !== 1) {
         console.log('⏳ Esperando que la conexión se complete...');
         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
               reject(new Error('Connection timeout: MongoDB did not connect within 10 seconds'));
            }, 10000);
            
            // Si ya está conectado, resolver inmediatamente
            if (mongoose.connection.readyState === 1) {
               clearTimeout(timeout);
               resolve();
               return;
            }
            
            // Esperar el evento 'connected'
            mongoose.connection.once('connected', () => {
               clearTimeout(timeout);
               resolve();
            });
            
            // Si hay error, rechazar
            mongoose.connection.once('error', (err) => {
               clearTimeout(timeout);
               reject(err);
            });
         });
      }

      // Obtener información de la conexión
      const db = mongoose.connection;
      const dbName = db.name || 'Base de datos no especificada';
      const host = db.host || 'Host no disponible';
      const port = db.port || 'Puerto no disponible';

      console.log('✅ Conexión exitosa a MongoDB Atlas');
      console.log('📊 Información de la base de datos:');
      console.log(`   🗄️  Base de datos conectada: ${dbName}`);
      console.log(`   📦 Base de datos esperada: ${database || '(no especificada)'}`);
      console.log(`   🌐 Host: ${host}`);
      console.log(`   🔌 Puerto: ${port}`);
      console.log(`   🔗 Estado: ${db.readyState === 1 ? 'Conectado' : 'Desconectado'}`);
      console.log(`   ⏰ Timestamp: ${new Date().toLocaleString()}`);

      // Verificar que realmente está conectado
      if (db.readyState !== 1) {
         throw new Error(`Connection not ready. Current state: ${db.readyState}`);
      }

      // Verificar que la base de datos sea la correcta
      if (database && dbName !== database) {
         console.warn(`⚠️  ADVERTENCIA: Base de datos conectada (${dbName}) no coincide con la esperada (${database})`);
         console.warn(`   Esto puede causar que los documentos se guarden en la base de datos incorrecta`);
      }

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

      return mongoose.connection;

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
      
      // Lanzar el error para que se maneje correctamente en el middleware
      throw err;
   }
};

module.exports = connection;
