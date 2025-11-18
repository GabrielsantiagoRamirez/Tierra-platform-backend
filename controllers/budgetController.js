const budgetService = require('../services/budgetService');
const { validateBudgetCreate } = require('../utils/validators');
const { normalizeBudgetData } = require('../utils/transformers');


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



const updateBudget = async (req, res) => {
   try {
      // Normalizar datos (acepta snake_case y camelCase)
      // isUpdate=true para que solo incluya campos que vienen en el request
      const normalizedData = normalizeBudgetData(req.body, true);
      
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