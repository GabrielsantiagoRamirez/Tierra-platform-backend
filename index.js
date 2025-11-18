// Importar dependencias
const mongoose = require('mongoose');
const connection = require('./database/connection');
const express = require('express');
const cors = require('cors');
require("dotenv").config();

// Mensaje de Bienvenida
console.log("Bienvenido a Construction API");

// Crear servidor
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Detectar si estamos en Vercel (serverless) o local
// Vercel siempre tiene la variable VERCEL=true
const isVercel = !!process.env.VERCEL;

// Lógica de conexión para serverless (Vercel)
let isConnecting = false;
let connectionPromise = null;

const ensureConnection = async () => {
   // Si ya está conectado, verificar que realmente esté listo
   if (mongoose.connection.readyState === 1) {
      return;
   }

   // Si está conectando, esperar a que termine
   if (mongoose.connection.readyState === 2) {
      await new Promise((resolve, reject) => {
         const timeout = setTimeout(() => {
            reject(new Error('Connection timeout'));
         }, 5000); // Reducido de 10s a 5s
         
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
         return;
      }
   }

   // Si ya hay una conexión en progreso, esperar a que termine
   if (isConnecting && connectionPromise) {
      try {
         await connectionPromise;
         if (mongoose.connection.readyState === 1) {
            return;
         }
      } catch (err) {
         isConnecting = false;
         connectionPromise = null;
      }
   }

   // Iniciar nueva conexión
   isConnecting = true;
   connectionPromise = connection().catch(err => {
      console.error('⚠️  Error al conectar a MongoDB:', err.message);
      isConnecting = false;
      connectionPromise = null;
      throw err;
   });

   try {
      await connectionPromise;
      if (mongoose.connection.readyState !== 1) {
         await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
               reject(new Error('Connection not ready after connect()'));
            }, 3000); // Aumentado ligeramente para dar más tiempo
            
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
      isConnecting = false;
   } catch (err) {
      isConnecting = false;
      connectionPromise = null;
      throw err;
   }
};

// Middleware para asegurar conexión en Vercel (serverless)
if (isVercel) {
   app.use(async (req, res, next) => {
      // No bloquear rutas de prueba
      if (req.path === '/test' || req.path === '/') {
         return next();
      }
      
      try {
         await ensureConnection();
         next();
      } catch (error) {
         console.error('Error en ensureConnection:', error);
         return res.status(503).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
         });
      }
   });
} else {
   // En local, conectar al inicio (no bloquea)
   connection().catch(err => {
      console.error('⚠️  No se pudo conectar a MongoDB al inicio, pero el servidor continuará');
      console.error('   La aplicación intentará reconectar automáticamente');
   });
}

// RUTAS de la aplicación
const budgetRoutes = require('./routes/budgetRoutes');

// Registrar rutas
app.use('/api/budget', budgetRoutes);

// Ruta de prueba
app.get("/test", (req, res) => {
    res.status(200).json({ message: "API funcionando correctamente" });
});

// Ruta raíz
app.get("/", (req, res) => {
    res.status(200).json({ 
        message: "Construction API",
        status: "running",
        endpoints: {
            test: "/test",
            budgets: "/api/budget"
        }
    });
});

// Si estamos en local, iniciar servidor
// Si estamos en Vercel, exportar la app
if (isVercel) {
    // Exportar para Vercel (serverless)
    module.exports = app;
} else {
    // Iniciar servidor local
    const puerto = process.env.PORT || 3900;
    app.listen(puerto, '0.0.0.0', () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${puerto}`);
    });
}
