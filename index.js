// Importar dependencias
const connection = require('./database/connection');
const express = require('express');
const cors = require('cors');
require("dotenv").config();

// Mensaje de Bienvenida
console.log("Bienvenido a Construction API");

// Conexión BD (no bloquea el inicio del servidor, pero intenta conectar)
connection().catch(err => {
   console.error('⚠️  No se pudo conectar a MongoDB al inicio, pero el servidor continuará');
   console.error('   La aplicación intentará reconectar automáticamente');
});

// Crear servidor
const app = express();
const puerto = process.env.PORT || 3900;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// RUTAS de la aplicación
const budgetRoutes = require('./routes/budgetRoutes');

// Registrar rutas
app.use('/api/budget', budgetRoutes);

// Ruta de prueba
app.get("/test", (req, res) => {
    res.status(200).json({ message: "API funcionando correctamente" });
});

// Iniciar servidor
app.listen(puerto, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${puerto}`);
});
