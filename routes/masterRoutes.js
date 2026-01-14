const express = require("express");
const router = express.Router();
const masterController = require("../controllers/masterController");
const obraController = require("../controllers/obraController");
const tareaController = require("../controllers/tareaController");
const userController = require("../controllers/userController");
const dashboardController = require("../controllers/dashboardController");
const documentController = require("../controllers/documentController");
const check = require("../middleware/authMiddleware");

// Dashboard (admin o master)
router.get("/dashboard", check.auth, check.adminOrMaster, dashboardController.getDashboard);

// Procesar documentos con IA (admin o master) - Procesa y guarda automáticamente en BD
router.post("/documento/procesar", check.auth, check.adminOrMaster, documentController.upload.single('documento'), documentController.processDocument);

// Guardar datos procesados del documento en la base de datos (admin o master)
// NOTA: Este endpoint ya no se usa, el guardado se hace automáticamente en /documento/procesar
// router.post("/documento/guardar", check.auth, check.adminOrMaster, documentController.saveDocument);

// Rutas que requieren solo master
router.get("/responsable/:userId", check.auth, check.adminOrMaster, masterController.getResponsable);
router.get("/users", check.auth, check.adminOrMaster, userController.listMasters);
router.put("/obra/:obraId/tarea/:tareaId/estado", check.auth, check.adminOrMaster, masterController.updateTareaEstado);
// router.put("/obra/:obraId/tarea/:tareaId/costo", check.auth, check.adminOrMaster, masterController.updateTareaCosto); // Comentado: el costo se actualiza en el endpoint updateTarea
router.post("/obra/:obraId/tarea/:tareaId/imagen", check.auth, check.master, masterController.addImagenTarea);

// CRUD ObraTarea (admin o master)
router.get("/obra-tarea", check.auth, check.adminOrMaster, masterController.listObraTareas);
router.get("/obra-tarea/:id", check.auth, check.adminOrMaster, masterController.getObraTareaById);

// CRUD Obra (admin o master)
router.post("/obra", check.auth, check.adminOrMaster, obraController.createObra);
router.get("/obra", check.auth, check.adminOrMaster, obraController.listObras);
router.get("/obra/:id", check.auth, check.adminOrMaster, obraController.getObraById);
router.put("/obra/:id", check.auth, check.adminOrMaster, obraController.updateObra);
router.delete("/obra/:id", check.auth, check.adminOrMaster, obraController.deleteObra);
router.post("/obra/actualizar-estados", check.auth, check.adminOrMaster, obraController.actualizarEstadosObras);

// CRUD Tarea dentro de obra (admin o master)
router.post("/obra/:obraId/tarea", check.auth, check.adminOrMaster, tareaController.createTarea);
router.get("/obra/:obraId/tarea", check.auth, check.adminOrMaster, tareaController.listTareas);
router.get("/obra/:obraId/tarea/:tareaId", check.auth, check.adminOrMaster, tareaController.getTareaById);
router.put("/obra/:obraId/tarea/:tareaId", check.auth, check.adminOrMaster, tareaController.updateTarea);
router.delete("/obra/:obraId/tarea/:tareaId", check.auth, check.adminOrMaster, tareaController.deleteTarea);

// CRUD Tarea independiente (admin o master)
router.post("/tarea", check.auth, check.adminOrMaster, tareaController.createTareaIndependiente);
router.get("/tarea", check.auth, check.adminOrMaster, tareaController.listTareasIndependientes);
router.get("/tarea/:id", check.auth, check.adminOrMaster, tareaController.getTareaIndependienteById);
router.put("/tarea/:id", check.auth, check.adminOrMaster, tareaController.updateTareaIndependiente);
router.delete("/tarea/:id", check.auth, check.adminOrMaster, tareaController.deleteTareaIndependiente);

module.exports = router;

