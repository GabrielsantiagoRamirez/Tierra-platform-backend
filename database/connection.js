const mongoose = require('mongoose');

// Construir URI de conexión
let uri = process.env.MONGODB_URI;

if (!uri) {
   // Si no hay URI completa, construir desde variables individuales
   const user = process.env.MONGODB_USER || 'pablomelo0420';
   const password = process.env.MONGODB_PASSWORD || 'pablomelo0420';
   const cluster = process.env.MONGODB_CLUSTER || 'tierradb.beaz9os.mongodb.net';
   const database = process.env.MONGODB_DATABASE || '';
   const appName = process.env.MONGODB_APP_NAME || 'TierraDB';
   
   const encodedPassword = encodeURIComponent(password);
   const dbPath = database ? `/${database}` : '';
   uri = `mongodb+srv://${user}:${encodedPassword}@${cluster}${dbPath}?appName=${appName}`;
   
   console.log('🔧 Construyendo URI desde variables individuales:');
   console.log(`   📦 Base de datos: ${database || '(no especificada)'}`);
   console.log(`   🌐 Cluster: ${cluster}`);
} else {
   console.log('🔧 Usando MONGODB_URI completa');
}

// Función para conectar a MongoDB
const connection = async () => {
   try {
      // Si ya hay una conexión activa, reutilizarla (importante para serverless)
      if (mongoose.connection.readyState === 1) {
         console.log('✅ Reutilizando conexión existente a MongoDB');
         return mongoose.connection;
      }

      console.log('🔄 Intentando conectar a MongoDB...');
      console.log('📍 URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Oculta credenciales

      // Opciones básicas optimizadas para serverless
      const options = {
         serverSelectionTimeoutMS: 5000,
         socketTimeoutMS: 30000,
         connectTimeoutMS: 5000,
         maxPoolSize: 1,
         minPoolSize: 1,
         bufferCommands: true,
         retryWrites: true,
         retryReads: true,
      };

      // Conectar
      await mongoose.connect(uri, options);

      // Esperar a que la conexión esté lista
      if (mongoose.connection.readyState !== 1) {
         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
               reject(new Error('Connection timeout'));
            }, 5000);
            
            if (mongoose.connection.readyState === 1) {
               clearTimeout(timeout);
               resolve();
               return;
            }
            
            mongoose.connection.once('connected', () => {
               clearTimeout(timeout);
               resolve();
            });
            
            mongoose.connection.once('error', (err) => {
               clearTimeout(timeout);
               reject(err);
            });
         });
      }

      // Log de información de conexión
      const db = mongoose.connection;
      console.log('✅ Conexión exitosa a MongoDB Atlas');
      console.log(`   🗄️  Base de datos: ${db.name || 'N/A'}`);
      console.log(`   🌐 Host: ${db.host || 'N/A'}`);
      console.log(`   ⏰ Timestamp: ${new Date().toLocaleString()}`);

      // Event listeners para cambios de estado
      db.on('disconnected', () => {
         console.log('❌ Desconectado de MongoDB');
      });

      db.on('reconnected', () => {
         console.log('🔄 Reconectado a MongoDB');
      });

      db.on('error', (err) => {
         console.error('💥 Error en la conexión:', err.message);
      });

      return mongoose.connection;

   } catch (err) {
      console.error('❌ Error al conectar a MongoDB:', err.message);
      
      if (err.code === 8000 || err.message.includes('authentication failed')) {
         console.error('💡 Verifica: credenciales, permisos, whitelist de IP');
      }
      
      throw err;
   }
};

module.exports = connection;
