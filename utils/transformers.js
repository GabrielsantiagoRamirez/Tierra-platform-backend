/**
 * Utilidades para transformación de datos
 * Convierte entre snake_case (Flutter) y camelCase (Backend)
 */

/**
 * Convierte un objeto de snake_case a camelCase
 * @param {Object} obj - Objeto a convertir
 * @returns {Object} Objeto convertido a camelCase
 */
const snakeToCamel = (obj) => {
   if (!obj || typeof obj !== 'object') return obj;
   
   // Si es un array, convertir cada elemento
   if (Array.isArray(obj)) {
      return obj.map(item => snakeToCamel(item));
   }
   
   // Si es Date, retornar tal cual
   if (obj instanceof Date) {
      return obj;
   }
   
   const camelObj = {};
   for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
         // Convertir snake_case a camelCase
         const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
         
         if (Array.isArray(obj[key])) {
            camelObj[camelKey] = obj[key].map(item => snakeToCamel(item));
         } else if (obj[key] && typeof obj[key] === 'object' && !(obj[key] instanceof Date)) {
            camelObj[camelKey] = snakeToCamel(obj[key]);
         } else {
            camelObj[camelKey] = obj[key];
         }
      }
   }
   return camelObj;
};

/**
 * Normaliza los datos del request aceptando tanto snake_case como camelCase
 * @param {Object} data - Datos del request
 * @returns {Object} Datos normalizados en camelCase
 */
const normalizeBudgetData = (data) => {
   const normalized = snakeToCamel(data);
   
   return {
      clientName: normalized.clientName || normalized.client_name,
      clientEmail: normalized.clientEmail || normalized.client_email,
      clientPhone: normalized.clientPhone || normalized.client_phone || null,
      clientAddress: normalized.clientAddress || normalized.client_address || null,
      projectName: normalized.projectName || normalized.project_name,
      projectDescription: normalized.projectDescription || normalized.project_description || null,
      workType: normalized.workType || normalized.work_type,
      items: normalizeBudgetItems(normalized.items || []),
      taxRate: normalized.taxRate || normalized.tax_rate || null,
      contingencyPercentage: normalized.contingencyPercentage || normalized.contingency_percentage || null,
      administrationPercentage: normalized.administrationPercentage || normalized.administration_percentage || null,
      profitPercentage: normalized.profitPercentage || normalized.profit_percentage || null,
      status: normalized.status || 'draft',
      notes: normalized.notes || null,
      validUntil: normalized.validUntil || normalized.valid_until 
         ? new Date(normalized.validUntil || normalized.valid_until) 
         : null
   };
};

/**
 * Normaliza los items del presupuesto
 * @param {Array} items - Array de items
 * @returns {Array} Array de items normalizados
 */
const normalizeBudgetItems = (items) => {
   if (!Array.isArray(items)) return [];
   
   return items.map(item => ({
      // No necesitamos id, MongoDB lo generará automáticamente si es necesario
      concept: item.concept,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice || item.unit_price,
      notes: item.notes || null
   }));
};

module.exports = {
   snakeToCamel,
   normalizeBudgetData,
   normalizeBudgetItems
};

