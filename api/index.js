// Archivo para Vercel - Serverless Function
// Este archivo exporta la app de Express para que Vercel la maneje como serverless function

const mongoose = require('mongoose');
const connection = require('../database/connection');
const express = require('express');
const cors = require('cors');

// Crear servidor
const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Conectar a MongoDB de forma optimizada para serverless
// Mongoose reutilizará la conexión si ya existe
let isConnecting = false;
let connectionPromise = null;

const ensureConnection = async () => {
   // Si ya está conectado, no hacer nada
   if (mongoose.connection.readyState === 1) {
      return;
   }

   // Si ya hay una conexión en progreso, esperar a que termine
   if (isConnecting && connectionPromise) {
      await connectionPromise;
      return;
   }

   // Iniciar nueva conexión
   isConnecting = true;
   connectionPromise = connection().catch(err => {
      console.error('⚠️  Error al conectar a MongoDB:', err.message);
      isConnecting = false;
      connectionPromise = null;
      throw err;
   });

   await connectionPromise;
   isConnecting = false;
};

// Middleware para asegurar conexión antes de procesar requests que necesitan BD
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

// RUTAS de la aplicación
const budgetRoutes = require('../routes/budgetRoutes');

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

// Exportar para Vercel
module.exports = app;

