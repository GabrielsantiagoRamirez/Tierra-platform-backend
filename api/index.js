// Archivo para Vercel - Serverless Function
// Este archivo exporta la app de Express para que Vercel la maneje como serverless function

const connection = require('../database/connection');
const express = require('express');
const cors = require('cors');

// Crear servidor
const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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

// Conectar a MongoDB cuando se ejecute la función
// En Vercel, esto se ejecutará en cada invocación, pero Mongoose maneja la conexión eficientemente
connection().catch(err => {
    console.error('⚠️  Error al conectar a MongoDB:', err.message);
});

// Exportar para Vercel
module.exports = app;

