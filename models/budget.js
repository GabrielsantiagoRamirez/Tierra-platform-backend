const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const budgetItemSchema = require("./BudgetItem");

// No definir campo 'id' - siempre usar _id de MongoDB
// strict: true ignora campos no definidos en el schema (por defecto)
// Esto asegura que cualquier campo 'id' que llegue será ignorado
const budgetSchema = new Schema({
    clientName:{
        type:String,
        required:true
    },
    clientEmail:{
        type:String,
        required:true
    },
    clientPhone:{
        type:String,
        default:null
    },
    clientAddress:{
        type:String,
        default:null
    },
    projectName:{
        type:String,
        required:true
    },
    projectDescription:{
        type:String,
        default:null
    },
    workType:{
        type: String,
        enum:[
            "construction",
            "remodeling",
            'design',
            "other"
        ],
        default: "other"
    },
    items:{
        type:[budgetItemSchema],
        default:[]
    },
    taxRate:{
        type:Number,
        default:null
    },
    contingencyPercentage:{
        type: Number,
        default:null
    },
    administrationPercentage:{
        type: Number,
        default: null
    },
    profitPercentage:{
        type: Number,
        default: null
    },
    status:{
        type:String,
        enum:['draft','sent','approved','rejected'],
        default:'draft'
    },
    createdAt:{
        type:Date,
        default:() => Date.now()
    },
    updatedAt:{
        type:Date,
        default:null
    },
    validUntil:{
        type: Date,
        default:null
    },
    notes:{
        type:String,
        default:null
    }
}, {
    strict: true, // Ignorar campos no definidos en el schema (como 'id')
    // MongoDB genera _id automáticamente, no necesitamos definirlo
});

// Hook pre-save: asegurar que nunca se guarde un campo 'id'
budgetSchema.pre('save', function(next) {
   // Eliminar cualquier campo 'id' que pueda haber llegado (siempre, no solo en nuevos)
   if (this.id !== undefined) {
      this.set('id', undefined, { strict: false });
      delete this.id;
   }
   // También eliminar de items si existen
   if (this.items && Array.isArray(this.items)) {
      this.items.forEach((item, index) => {
         if (item && typeof item === 'object') {
            if (item.id !== undefined) {
               delete item.id;
            }
            // No eliminar _id si ya existe (es válido para subdocumentos)
         }
      });
   }
   next();
});

// Transformar a snake_case para compatibilidad con Flutter
budgetSchema.set('toJSON', {
   transform: function(doc, ret) {
      return {
         id: ret._id.toString(), // Usar _id de MongoDB como id
         client_name: ret.clientName,
         client_email: ret.clientEmail,
         client_phone: ret.clientPhone,
         client_address: ret.clientAddress,
         project_name: ret.projectName,
         project_description: ret.projectDescription,
         work_type: ret.workType,
         items: ret.items ? ret.items.map(item => ({
            id: item._id ? item._id.toString() : null, // Usar _id de MongoDB
            concept: item.concept,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unitPrice,
            notes: item.notes
         })) : [],
         tax_rate: ret.taxRate,
         contingency_percentage: ret.contingencyPercentage,
         administration_percentage: ret.administrationPercentage,
         profit_percentage: ret.profitPercentage,
         status: ret.status,
         created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
         updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null,
         valid_until: ret.validUntil ? ret.validUntil.toISOString() : null,
         notes: ret.notes
      };
   }
});

budgetSchema.plugin(mongoosePaginate);

module.exports = model('Budget', budgetSchema, 'Budgets');
