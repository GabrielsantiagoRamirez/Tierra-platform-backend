const budgetService = require('../services/budgetService');
const { validateBudgetCreate } = require('../utils/validators');
const { normalizeBudgetData } = require('../utils/transformers');

/**
 * Controlador para crear un nuevo presupuesto
 */
const createBudget = async (req, res) => {
   try {
      // Normalizar datos (acepta snake_case y camelCase)
      const normalizedData = normalizeBudgetData(req.body);
      
      // Validar datos
      const validation = validateBudgetCreate(normalizedData);
      if (!validation.isValid) {
         return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validation.errors
         });
      }

      // Crear presupuesto usando el servicio (ya normalizado)
      const saved = await budgetService.createBudget(normalizedData);

      return res.status(201).json({
         status: 'success',
         budget: saved
      });

   } catch (error) {
      return res.status(500).json({
         status: 'error',
         message: 'Error creating budget',
         error: error.message
      });
   }
};


/**
 * Controlador para listar presupuestos con paginación
 */
const listBudgets = async (req, res) => {
   try {
      const { validatePage } = require('../utils/validators');
      
      // Obtener página de params o query string
      const pageParam = req.params.page || req.query.page;
      const validation = validatePage(pageParam);
      
      if (!validation.isValid) {
         return res.status(400).json({
            status: 'error',
            message: validation.error
         });
      }

      const budgets = await budgetService.listBudgets(validation.page, 10);
      
      return res.status(200).json(budgets);
      
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         error: error.message
      });
   }
};


/**
 * Controlador para obtener un presupuesto por ID
 */
const getBudgetByid = async (req, res) => {
   try {
      const budget = await budgetService.getBudgetById(req.params.id);

      if (!budget) {
         return res.status(404).json({
            status: 'error',
            message: 'Budget not found'
         });
      }

      return res.status(200).json(budget);
      
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         error: error.message
      });
   }
};


/**
 * Controlador para actualizar un presupuesto
 */
const updateBudget = async (req, res) => {
   try {
      // Normalizar datos (acepta snake_case y camelCase)
      const normalizedData = normalizeBudgetData(req.body);
      
      const updated = await budgetService.updateBudget(req.params.id, normalizedData);

      if (!updated) {
         return res.status(404).json({
            status: 'error',
            message: 'Budget not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         budget: updated
      });
      
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         error: error.message
      });
   }
};

/**
 * Controlador para eliminar un presupuesto
 */
const deleteBudget = async (req, res) => {
   try {
      const deleted = await budgetService.deleteBudget(req.params.id);

      if (!deleted) {
         return res.status(404).json({
            status: 'error',
            message: 'Budget not found'
         });
      }

      return res.status(200).json({
         status: 'success',
         message: 'Budget deleted successfully'
      });
      
   } catch (error) {
      return res.status(500).json({
         status: 'error',
         error: error.message
      });
   }
};


module.exports = {
    createBudget,
    listBudgets,
    getBudgetByid,
    updateBudget,
    deleteBudget
};