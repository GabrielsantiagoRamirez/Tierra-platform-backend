const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const tareaSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null
    },
    evidences: {
        type: [String],
        default: []
    },
    state: {
        type: String,
        enum: ['pendiente', 'en_proceso', 'finalizado'],
        default: 'pendiente'
    },
    duration: {
        type: Number,
        default: null
    },
    createdAt: {
        type: Date,
        default: () => Date.now()
    },
    updatedAt: {
        type: Date,
        default: null
    }
}, {
    strict: true, // Ignorar campos no definidos en el schema
});

// Hook pre-save: eliminar campo 'id' si existe
tareaSchema.pre('save', function(next) {
    if (this.id !== undefined) {
        this.set('id', undefined, { strict: false });
        delete this.id;
    }
    next();
});

// Transformar a snake_case para compatibilidad con Flutter
tareaSchema.set('toJSON', {
    transform: function(doc, ret) {
        return {
            id: ret._id.toString(), // Usar _id de MongoDB como id
            name: ret.name,
            description: ret.description,
            evidences: ret.evidences || [],
            state: ret.state,
            duration: ret.duration,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

tareaSchema.plugin(mongoosePaginate);

// Exportar el schema para uso en otros modelos
module.exports = tareaSchema;

// También exportar el modelo para uso directo
module.exports.Model = model('Tarea', tareaSchema, 'Tareas');

