const Budget = require('../models/Budget');

/**
 * Crea un nuevo presupuesto
 * @param {Object} budgetData - Datos del presupuesto (ya normalizados)
 * @returns {Promise<Object>} Presupuesto creado
 */
const createBudget = async (budgetData) => {
   const newBudget = new Budget(budgetData);
   
   // Optimización para serverless: save() con timeout explícito
   // El writeConcern se configura a nivel de conexión (ya está en connection.js)
   // Usamos lean: false para obtener el documento completo con métodos de Mongoose
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
   // Obtener el presupuesto actual
   const existingBudget = await Budget.findById(id);
   
   if (!existingBudget) {
      return null;
   }

   // Crear objeto de actualización solo con los campos que vienen en updateData
   const updateFields = {};
   
   // Lista de campos que se pueden actualizar (excluyendo items, createdAt, _id)
   const updatableFields = [
      'clientName', 'clientEmail', 'clientPhone', 'clientAddress',
      'projectName', 'projectDescription', 'workType',
      'taxRate', 'contingencyPercentage', 'administrationPercentage', 'profitPercentage',
      'status', 'notes', 'validUntil'
   ];

   // Solo actualizar los campos que vienen en updateData (y no son undefined/null vacío)
   updatableFields.forEach(field => {
      if (updateData.hasOwnProperty(field) && updateData[field] !== undefined) {
         // Permitir null explícito para limpiar campos
         updateFields[field] = updateData[field];
      }
   });

   // Manejar items de forma especial: agregar a los existentes
   if (updateData.items && Array.isArray(updateData.items) && updateData.items.length > 0) {
      // Agregar los nuevos items a los existentes
      const existingItems = existingBudget.items || [];
      const newItems = updateData.items;
      
      // Combinar items existentes con nuevos
      updateFields.items = [...existingItems, ...newItems];
   }
   // Si no se envía items, mantener los existentes (no hacer nada)

   // Siempre actualizar la fecha de modificación
   updateFields.updatedAt = new Date();

   // Actualizar el presupuesto
   return await Budget.findByIdAndUpdate(
      id,
      { $set: updateFields },
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

