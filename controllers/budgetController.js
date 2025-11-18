const budgetService = require('../services/budgetService');
const { validateBudgetCreate } = require('../utils/validators');
const { normalizeBudgetData } = require('../utils/transformers');


const createBudget = async (req, res) => {
   const startTime = Date.now();
   
   try {
      console.log('📝 [CREATE] Iniciando creación de presupuesto...');
      
      // Normalizar datos (acepta snake_case y camelCase)
      const normalizedData = normalizeBudgetData(req.body);
      console.log('✅ [CREATE] Datos normalizados en', Date.now() - startTime, 'ms');
      
      // Validar datos
      const validation = validateBudgetCreate(normalizedData);
      if (!validation.isValid) {
         console.log('❌ [CREATE] Validación fallida:', validation.errors);
         return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validation.errors
         });
      }
      console.log('✅ [CREATE] Validación exitosa en', Date.now() - startTime, 'ms');

      // Crear presupuesto usando el servicio (ya normalizado)
      const saveStartTime = Date.now();
      const saved = await budgetService.createBudget(normalizedData);
      console.log('✅ [CREATE] Presupuesto guardado en', Date.now() - saveStartTime, 'ms');
      console.log('✅ [CREATE] Total tiempo:', Date.now() - startTime, 'ms');

      return res.status(201).json({
         status: 'success',
         budget: saved
      });

   } catch (error) {
      console.error('❌ [CREATE] Error:', error.message);
      console.error('❌ [CREATE] Stack:', error.stack);
      console.error('❌ [CREATE] Tiempo total antes del error:', Date.now() - startTime, 'ms');
      
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