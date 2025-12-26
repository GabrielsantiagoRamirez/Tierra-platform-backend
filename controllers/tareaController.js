const tareaService = require('../services/tareaService');
const Tarea = require('../models/Tarea.js').Model;

// CRUD para tareas dentro de una obra
const createTarea = async (req, res) => {
   try {
      const { obraId } = req.params;
      const tarea = await tareaService.createTarea(obraId, req.body);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra not found'
         });
      }
      
      return res.status(201).json({
         status: 'success',
         message: 'Tarea created successfully',
         tarea: tarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error creating tarea',
         error: error.message
      });
   }
};

const listTareas = async (req, res) => {
   try {
      const { obraId } = req.params;
      const tareas = await tareaService.listTareas(obraId);
      
      if (tareas === null) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         tareas: tareas
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error listing tareas',
         error: error.message
      });
   }
};

const getTareaById = async (req, res) => {
   try {
      const { obraId, tareaId } = req.params;
      const tarea = await tareaService.getTareaById(obraId, tareaId);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         tarea: tarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error getting tarea',
         error: error.message
      });
   }
};

const updateTarea = async (req, res) => {
   try {
      const { obraId, tareaId } = req.params;
      const tarea = await tareaService.updateTarea(obraId, tareaId, req.body);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea updated successfully',
         tarea: tarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error updating tarea',
         error: error.message
      });
   }
};

const deleteTarea = async (req, res) => {
   try {
      const { obraId, tareaId } = req.params;
      const tarea = await tareaService.deleteTarea(obraId, tareaId);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea deleted successfully'
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error deleting tarea',
         error: error.message
      });
   }
};

// CRUD independiente para tareas (sin obra)
const createTareaIndependiente = async (req, res) => {
   try {
      const tareaData = { ...req.body };
      delete tareaData.id;
      delete tareaData._id;
      
      // Asegurar que evidences sea array vacío si no viene
      if (!tareaData.evidences) {
         tareaData.evidences = [];
      }
      
      const newTarea = new Tarea(tareaData);
      await newTarea.save();
      
      return res.status(201).json({
         status: 'success',
         message: 'Tarea created successfully',
         tarea: newTarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error creating tarea',
         error: error.message
      });
   }
};

const listTareasIndependientes = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await Tarea.paginate({}, { page, limit });
      
      return res.status(200).json({
         status: 'success',
         data: result
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error listing tareas',
         error: error.message
      });
   }
};

const getTareaIndependienteById = async (req, res) => {
   try {
      const { id } = req.params;
      const tarea = await Tarea.findById(id);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         tarea: tarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error getting tarea',
         error: error.message
      });
   }
};

const updateTareaIndependiente = async (req, res) => {
   try {
      const { id } = req.params;
      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData._id;
      
      updateData.updatedAt = new Date();
      
      const tarea = await Tarea.findByIdAndUpdate(id, { $set: updateData }, { new: true });
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea updated successfully',
         tarea: tarea
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error updating tarea',
         error: error.message
      });
   }
};

const deleteTareaIndependiente = async (req, res) => {
   try {
      const { id } = req.params;
      const tarea = await Tarea.findByIdAndDelete(id);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea deleted successfully'
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error deleting tarea',
         error: error.message
      });
   }
};

module.exports = {
   // CRUD dentro de obra
   createTarea,
   listTareas,
   getTareaById,
   updateTarea,
   deleteTarea,
   // CRUD independiente
   createTareaIndependiente,
   listTareasIndependientes,
   getTareaIndependienteById,
   updateTareaIndependiente,
   deleteTareaIndependiente
};
