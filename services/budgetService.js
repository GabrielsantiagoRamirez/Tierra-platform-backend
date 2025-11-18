/**
 * Servicio de Presupuestos
 * Contiene la lógica de negocio para los presupuestos
 */

const Budget = require('../models/budget');

/**
 * Crea un nuevo presupuesto
 * @param {Object} budgetData - Datos del presupuesto (ya normalizados)
 * @returns {Promise<Object>} Presupuesto creado
 */
const createBudget = async (budgetData) => {
   const newBudget = new Budget(budgetData);
   return await newBudget.save();
};

/**
 * Obtiene todos los presupuestos con paginación
 * @param {Number} page - Número de página
 * @param {Number} limit - Límite de resultados por página
 * @returns {Promise<Object>} Resultados paginados
 */
const listBudgets = async (page = 1, limit = 10) => {
   return await Budget.paginate({}, { page, limit });
};

/**
 * Obtiene un presupuesto por su ID
 * @param {String} id - ID del presupuesto (_id de MongoDB)
 * @returns {Promise<Object|null>} Presupuesto encontrado o null
 */
const getBudgetById = async (id) => {
   return await Budget.findById(id);
};

/**
 * Actualiza un presupuesto
 * @param {String} id - ID del presupuesto (_id de MongoDB)
 * @param {Object} updateData - Datos a actualizar (ya normalizados)
 * @returns {Promise<Object|null>} Presupuesto actualizado o null
 */
const updateBudget = async (id, updateData) => {
   // Agregar fecha de actualización
   updateData.updatedAt = new Date();
   
   return await Budget.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
   );
};

/**
 * Elimina un presupuesto
 * @param {String} id - ID del presupuesto (_id de MongoDB)
 * @returns {Promise<Object|null>} Presupuesto eliminado o null
 */
const deleteBudget = async (id) => {
   return await Budget.findByIdAndDelete(id);
};

module.exports = {
   createBudget,
   listBudgets,
   getBudgetById,
   updateBudget,
   deleteBudget
};

