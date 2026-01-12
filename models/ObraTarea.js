const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

// Modelo de relación intermedia entre Obra y Tarea
// Permite que una tarea pueda estar en múltiples obras con estados independientes
const obraTareaSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    obraId: {
        type: Schema.Types.ObjectId,
        ref: 'Obra',
        required: true
    },
    tareaId: {
        type: Schema.Types.ObjectId,
        ref: 'Tarea',
        required: true
    },
    state: {
        type: String,
        enum: ['pendiente', 'en_proceso', 'finalizado', 'estancado'],
        default: 'pendiente'
    },
    evidences: {
        type: [String],
        default: []
    },
    observation: {
        type: String,
        default: ""
    },
    costo: {
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
    strict: true,
});

// Índice compuesto para evitar duplicados y mejorar búsquedas
obraTareaSchema.index({ obraId: 1, tareaId: 1 }, { unique: true });

// Hook pre-save: eliminar campo 'id' si existe
obraTareaSchema.pre('save', function(next) {
    if (this.id !== undefined) {
        this.set('id', undefined, { strict: false });
        delete this.id;
    }
    next();
});

// Transformar a snake_case para compatibilidad con Flutter
obraTareaSchema.set('toJSON', {
    transform: function(doc, ret) {
        return {
            id: ret._id.toString(),
            obra_id: ret.obraId ? ret.obraId.toString() : null,
            tarea_id: ret.tareaId ? ret.tareaId.toString() : null,
            state: ret.state,
            evidences: ret.evidences || [],
            observation: ret.observation || "",
            costo: ret.costo || null,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

obraTareaSchema.plugin(mongoosePaginate);

module.exports = model('ObraTarea', obraTareaSchema, 'ObraTareas');

