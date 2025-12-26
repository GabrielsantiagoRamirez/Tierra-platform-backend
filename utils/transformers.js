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
   // Crear una copia sin id y _id para evitar conflictos con índices únicos
   const dataWithoutId = { ...data };
   delete dataWithoutId.id;
   delete dataWithoutId._id;
   
   const normalized = snakeToCamel(dataWithoutId);
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
   
   return items.map(item => {
      // Crear copia sin id y _id para evitar conflictos con índices únicos
      const itemWithoutId = { ...item };
      delete itemWithoutId.id;
      delete itemWithoutId._id;
      
      return {
         // No necesitamos id, MongoDB lo generará automáticamente si es necesario
         concept: itemWithoutId.concept,
         quantity: itemWithoutId.quantity,
         unit: itemWithoutId.unit,
         unitPrice: itemWithoutId.unitPrice || itemWithoutId.unit_price,
         notes: itemWithoutId.notes || null
      };
   });
};

/**
 * Normaliza los datos del usuario aceptando tanto snake_case como camelCase
 * @param {Object} data - Datos del request
 * @param {Boolean} isUpdate - Si es true, solo incluye campos que vienen en el request (para updates)
 * @returns {Object} Datos normalizados en camelCase
 */
const normalizeUserData = (data, isUpdate = false) => {
   // Crear una copia sin id y _id para evitar conflictos
   const dataWithoutId = { ...data };
   delete dataWithoutId.id;
   delete dataWithoutId._id;
   
   const normalized = snakeToCamel(dataWithoutId);
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
   addField('type', 'type', null);
   addField('name', 'name');
   addField('lastname', 'lastname');
   addField('email', 'email');
   addField('password', 'password');
   addField('phone', 'phone', null);
   addField('city', 'city', null);
   addField('dni', 'dni', null);
   
   return result;
};

module.exports = {
   snakeToCamel,
   normalizeBudgetData,
   normalizeBudgetItems,
   normalizeUserData
};

