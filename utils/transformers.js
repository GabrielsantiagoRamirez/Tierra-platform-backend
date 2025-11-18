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
 * @param {Boolean} isUpdate - Si es true, solo incluye campos que vienen en el request (para updates)
 * @returns {Object} Datos normalizados en camelCase
 */
const normalizeBudgetData = (data, isUpdate = false) => {
   const normalized = snakeToCamel(data);
   const result = {};
   
   // Función helper para agregar campo solo si existe
   const addField = (camelKey, snakeKey, defaultValue = undefined) => {
      const value = normalized[camelKey] !== undefined ? normalized[camelKey] : 
                    (normalized[snakeKey] !== undefined ? normalized[snakeKey] : defaultValue);
      
      if (isUpdate) {
         // En update, solo agregar si el campo viene en el request
         if (normalized[camelKey] !== undefined || normalized[snakeKey] !== undefined) {
            result[camelKey] = value;
         }
      } else {
         // En create, usar valores por defecto
         result[camelKey] = value !== undefined ? value : defaultValue;
      }
   };
   
   // Campos normales
   addField('clientName', 'client_name');
   addField('clientEmail', 'client_email');
   addField('clientPhone', 'client_phone', null);
   addField('clientAddress', 'client_address', null);
   addField('projectName', 'project_name');
   addField('projectDescription', 'project_description', null);
   addField('workType', 'work_type', isUpdate ? undefined : 'other');
   addField('taxRate', 'tax_rate', null);
   addField('contingencyPercentage', 'contingency_percentage', null);
   addField('administrationPercentage', 'administration_percentage', null);
   addField('profitPercentage', 'profit_percentage', null);
   addField('status', 'status', isUpdate ? undefined : 'draft');
   addField('notes', 'notes', null);
   
   // ValidUntil necesita conversión a Date
   if (normalized.validUntil !== undefined || normalized.valid_until !== undefined) {
      const validUntilValue = normalized.validUntil || normalized.valid_until;
      result.validUntil = validUntilValue ? new Date(validUntilValue) : null;
   } else if (!isUpdate) {
      result.validUntil = null;
   }
   
   // Items: normalizar solo si vienen
   if (normalized.items !== undefined || (data.items !== undefined && !normalized.items)) {
      result.items = normalizeBudgetItems(normalized.items || data.items || []);
   } else if (!isUpdate) {
      result.items = [];
   }
   
   return result;
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

