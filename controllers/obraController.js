const obraService = require('../services/obraService');

const createObra = async (req, res) => {
   try {
      const obra = await obraService.createObra(req.body);
      
      return res.status(201).json({
         status: 'success',
         message: 'Obra created successfully',
         obra: obra
      });
   } catch (error) {
      if (error.message.includes('must have at least one tarea')) {
         return res.status(400).json({
            status: 'error',
            message: error.message
         });
      }
      
      return res.status(500).json({
         status: 'error',
         message: 'Error creating obra',
         error: error.message
      });
   }
};

const listObras = async (req, res) => {
   try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await obraService.listObras(page, limit);
      
      return res.status(200).json({
         status: 'success',
         data: result
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error listing obras',
         error: error.message
      });
   }
};

const getObraById = async (req, res) => {
   try {
      const { id } = req.params;
      const obra = await obraService.getObraById(id);
      
      if (!obra) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         obra: obra
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error getting obra',
         error: error.message
      });
   }
};

const updateObra = async (req, res) => {
   try {
      const { id } = req.params;
      const obra = await obraService.updateObra(id, req.body);
      
      if (!obra) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Obra updated successfully',
         obra: obra
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error updating obra',
         error: error.message
      });
   }
};

const deleteObra = async (req, res) => {
   try {
      const { id } = req.params;
      const obra = await obraService.deleteObra(id);
      
      if (!obra) {
         return res.status(404).json({
            status: 'error',
            message: 'Obra not found'
         });
      }
      
      return res.status(200).json({
         status: 'success',
         message: 'Obra deleted successfully'
      });
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error deleting obra',
         error: error.message
      });
   }
};

module.exports = {
   createObra,
   listObras,
   getObraById,
   updateObra,
   deleteObra
};

