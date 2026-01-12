const masterService = require('../services/masterService');
const tareaService = require('../services/tareaService');


const getResponsable = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('👤 [MASTER/ADMIN] Obteniendo responsable...');
      
      // Obtener usuario autenticado del middleware
      const authenticatedUser = req.user;
      
      if (!authenticatedUser) {
         return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
         });
      }
      
      // Pasar tipo de usuario y su ID al servicio
      const result = await masterService.getResponsable(
         authenticatedUser.type, 
         authenticatedUser._id.toString()
      );
      
      if (!result) {
         return res.status(404).json({
            status: 'error',
            message: 'User not found'
         });
      }
      
      console.log('✅ [MASTER/ADMIN] Responsable obtenido en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         data: result
      });
      
   } catch (error) {
      console.error('❌ [MASTER/ADMIN] Error:', error.message);
      console.error('❌ [MASTER/ADMIN] Stack:', error.stack);
      
      return res.status(500).json({
         status: 'error',
         message: 'Error getting responsable',
         error: error.message
      });
   }
};


const updateTareaEstado = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('📝 [MASTER] Actualizando estado de tarea...');
      
      const { obraId, tareaId } = req.params;
      const { state } = req.body;
      
      if (!state) {
         return res.status(400).json({
            status: 'error',
            message: 'State is required in request body'
         });
      }
      
      const obra = await masterService.updateTareaEstado(obraId, tareaId, state);
      
      if (!obra) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      // Obtener la tarea actualizada con información combinada de ObraTarea
      const tarea = await tareaService.getTareaById(obraId, tareaId);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      console.log('✅ [MASTER] Estado actualizado en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea state updated successfully',
         tarea: tarea
      });
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      console.error('❌ [MASTER] Stack:', error.stack);
      
      // Si el error es de validación de estado
      if (error.message.includes('Invalid state')) {
         return res.status(400).json({
            status: 'error',
            message: error.message
         });
      }
      
      return res.status(500).json({
         status: 'error',
         message: 'Error updating tarea state',
         error: error.message
      });
   }
};


const addImagenTarea = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('🖼️ [MASTER] Agregando imagen a tarea...');
      
      const { obraId, tareaId } = req.params;
      const { image_url } = req.body;
      
      if (!image_url) {
         return res.status(400).json({
            status: 'error',
            message: 'image_url is required in request body'
         });
      }
      
      const obra = await masterService.addImagenTarea(obraId, tareaId, image_url);
      
      if (!obra) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      // Obtener la tarea actualizada con información combinada de ObraTarea
      const tarea = await tareaService.getTareaById(obraId, tareaId);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      console.log('✅ [MASTER] Imagen agregada en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         message: 'Image added to tarea successfully',
         tarea: tarea
      });
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      console.error('❌ [MASTER] Stack:', error.stack);
      
      if (error.message.includes('Invalid image URL')) {
         return res.status(400).json({
            status: 'error',
            message: error.message
         });
      }
      
      return res.status(500).json({
         status: 'error',
         message: 'Error adding image to tarea',
         error: error.message
      });
   }
};

const listObraTareas = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('📋 [MASTER] Listando relaciones ObraTarea...');
      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await masterService.listObraTareas(page, limit);
      
      console.log('✅ [MASTER] Relaciones ObraTarea listadas en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         data: result
      });
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      console.error('❌ [MASTER] Stack:', error.stack);
      
      return res.status(500).json({
         status: 'error',
         message: 'Error listing ObraTarea',
         error: error.message
      });
   }
};

const getObraTareaById = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('🔍 [MASTER] Obteniendo relación ObraTarea por ID...');
      
      const { id } = req.params;
      
      const obraTarea = await masterService.getObraTareaById(id);
      
      if (!obraTarea) {
         return res.status(404).json({
            status: 'error',
            message: 'ObraTarea not found'
         });
      }
      
      console.log('✅ [MASTER] Relación ObraTarea obtenida en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         obra_tarea: obraTarea
      });
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      console.error('❌ [MASTER] Stack:', error.stack);
      
      return res.status(500).json({
         status: 'error',
         message: 'Error getting ObraTarea',
         error: error.message
      });
   }
};

const updateTareaCosto = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('💰 [MASTER] Actualizando costo de tarea...');
      
      const { obraId, tareaId } = req.params;
      const { costo } = req.body;
      
      if (costo === undefined || costo === null) {
         return res.status(400).json({
            status: 'error',
            message: 'Costo is required in request body'
         });
      }
      
      const obraTarea = await masterService.updateTareaCosto(obraId, tareaId, costo);
      
      if (!obraTarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra or Tarea not found'
         });
      }
      
      // Obtener la tarea actualizada con información combinada de ObraTarea
      const tarea = await tareaService.getTareaById(obraId, tareaId);
      
      if (!tarea) {
         return res.status(404).json({
            status: 'error',
            message: 'Tarea not found'
         });
      }
      
      console.log('✅ [MASTER] Costo actualizado en', Date.now() - startTime, 'ms');
      
      return res.status(200).json({
         status: 'success',
         message: 'Tarea costo updated successfully',
         tarea: tarea
      });
      
   } catch (error) {
      console.error('❌ [MASTER] Error:', error.message);
      console.error('❌ [MASTER] Stack:', error.stack);
      
      if (error.message.includes('Solo se puede agregar costo') || error.message.includes('El costo debe ser')) {
         return res.status(400).json({
            status: 'error',
            message: error.message
         });
      }
      
      return res.status(500).json({
         status: 'error',
         message: 'Error updating tarea costo',
         error: error.message
      });
   }
};

module.exports = {
   getResponsable,
   updateTareaEstado,
   addImagenTarea,
   listObraTareas,
   getObraTareaById,
   updateTareaCosto
};

