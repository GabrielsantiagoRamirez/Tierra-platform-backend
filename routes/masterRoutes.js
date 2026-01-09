const express = require("express");
const router = express.Router();
const masterController = require("../controllers/masterController");
const obraController = require("../controllers/obraController");
const tareaController = require("../controllers/tareaController");
const userController = require("../controllers/userController");
const check = require("../middleware/authMiddleware");

// Rutas que requieren solo master
router.get("/responsable/:userId", check.auth, check.adminOrMaster, masterController.getResponsable);
router.get("/users", check.auth, check.adminOrMaster, userController.listMasters);
router.put("/obra/:obraId/tarea/:tareaId/estado", check.auth, check.adminOrMaster, masterController.updateTareaEstado);
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

