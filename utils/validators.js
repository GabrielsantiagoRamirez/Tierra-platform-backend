
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


const isValidEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email);
};


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

const validateUserRegister = (data) => {
   const errors = [];
   
   if (!data.name) {
      errors.push('name is required');
   }
   
   if (!data.lastname) {
      errors.push('lastname is required');
   }
   
   if (!data.email) {
      errors.push('email is required');
   } else if (!isValidEmail(data.email)) {
      errors.push('email must be a valid email');
   }
   
   if (!data.password) {
      errors.push('password is required');
   } else if (data.password.length < 6) {
      errors.push('password must be at least 6 characters');
   }
   
   if (!data.type) {
      errors.push('type is required');
   }
   
   if (!data.phone) {
      errors.push('phone is required');
   } else if (isNaN(data.phone)) {
      errors.push('phone must be a valid number');
   }
   
   if (!data.city) {
      errors.push('city is required');
   }
   
   if (!data.dni) {
      errors.push('dni is required');
   } else if (isNaN(data.dni)) {
      errors.push('dni must be a valid number');
   }
   
   return {
      isValid: errors.length === 0,
      errors
   };
};


const validateUserLogin = (data) => {
   const errors = [];
   
   if (!data.email) {
      errors.push('email is required');
   } else if (!isValidEmail(data.email)) {
      errors.push('email must be a valid email');
   }
   
   if (!data.password) {
      errors.push('password is required');
   }
   
   return {
      isValid: errors.length === 0,
      errors
   };
};

module.exports = {
   validateBudgetCreate,
   isValidEmail,
   validatePage,
   validateUserRegister,
   validateUserLogin
};

