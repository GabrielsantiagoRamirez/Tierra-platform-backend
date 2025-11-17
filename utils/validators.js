/**
 * Validadores para los datos de entrada
 */

/**
 * Valida los campos requeridos para crear un presupuesto
 * @param {Object} data - Datos a validar
 * @returns {Object} { isValid: boolean, errors: Array }
 */
const validateBudgetCreate = (data) => {
   const errors = [];
   
   if (!data.clientName) {
      errors.push('clientName is required');
   }
   
   if (!data.clientEmail) {
      errors.push('clientEmail is required');
   } else if (!isValidEmail(data.clientEmail)) {
      errors.push('clientEmail must be a valid email');
   }
   
   if (!data.projectName) {
      errors.push('projectName is required');
   }
   
   if (!data.workType) {
      errors.push('workType is required');
   } else if (!['construction', 'remodeling', 'design', 'other'].includes(data.workType)) {
      errors.push('workType must be one of: construction, remodeling, design, other');
   }
   
   // Validar items si existen
   if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
         if (!item.concept) {
            errors.push(`items[${index}].concept is required`);
         }
         if (item.quantity === undefined || item.quantity === null) {
            errors.push(`items[${index}].quantity is required`);
         }
         if (!item.unit) {
            errors.push(`items[${index}].unit is required`);
         }
         if (item.unitPrice === undefined || item.unitPrice === null) {
            errors.push(`items[${index}].unitPrice is required`);
         }
      });
   }
   
   return {
      isValid: errors.length === 0,
      errors
   };
};

/**
 * Valida que un email tenga formato válido
 * @param {String} email - Email a validar
 * @returns {Boolean}
 */
const isValidEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email);
};

/**
 * Valida que un número de página sea válido
 * @param {*} page - Página a validar (puede ser undefined, null, string o number)
 * @returns {Object} { isValid: boolean, page: number, error: string }
 */
const validatePage = (page) => {
   // Si no se proporciona página, usar página 1 por defecto
   if (page === undefined || page === null || page === '') {
      return {
         isValid: true,
         page: 1,
         error: null
      };
   }
   
   const pageNum = parseInt(page);
   
   // Si no es un número válido o es menor a 1, es inválido
   if (isNaN(pageNum) || pageNum < 1) {
      return {
         isValid: false,
         page: 1,
         error: 'Page must be a positive number'
      };
   }
   
   return {
      isValid: true,
      page: pageNum,
      error: null
   };
};

module.exports = {
   validateBudgetCreate,
   isValidEmail,
   validatePage
};

