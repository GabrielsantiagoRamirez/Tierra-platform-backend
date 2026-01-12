const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const Tarea = require("./Tarea").Model;

// No definir campo 'id' - siempre usar _id de MongoDB
const obraSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: null
    },
    location: {
        type: String,
        default: null
    },
    city: {
        type: String,
        default: null
    },
    tareas: {
        type: [Schema.Types.ObjectId],
        ref: 'Tarea',
        required: true,
        validate: {
            validator: function(v) {
                return Array.isArray(v) && v.length > 0;
            },
            message: 'Obra must have at least one tarea'
        }
    },
    responsable: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    costo: {
        type: Number,
        default: null
    },
    costoEstimado: {
        type: Number,
        default: null
    },
    costoFinal: {
        type: Number,
        default: null
    },
    estado: {
        type: String,
        enum: ['pendiente', 'en_proceso', 'finalizado', 'estancado'],
        default: 'pendiente'
    },
        fechaInicio: {
        type: Date,
        default: null
    },
    fechaFin: {
        type: Date,
        default: null
    },
    fechaEntrega: {
        type: Date,
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
obraSchema.pre('save', function(next) {
    if (this.id !== undefined) {
        this.set('id', undefined, { strict: false });
        delete this.id;
    }
    // También eliminar de tareas si existen
    if (this.tareas && Array.isArray(this.tareas)) {
        this.tareas.forEach((tarea) => {
            if (tarea && typeof tarea === 'object') {
                if (tarea.id !== undefined) {
                    delete tarea.id;
                }
            }
        });
    }
    next();
});

// Transformar a snake_case para compatibilidad con Flutter
obraSchema.set('toJSON', {
    transform: function(doc, ret) {
        return {
            id: ret._id.toString(), // Usar _id de MongoDB como id
            title: ret.title,
            description: ret.description,
            location: ret.location,
            city: ret.city,
            tareas: ret.tareas ? ret.tareas.map(tarea => {
                // Si está poblado, tarea es un documento de Mongoose
                if (tarea && typeof tarea === 'object') {
                    // Si es un documento de Mongoose, usar toJSON() para aplicar su transformador
                    if (tarea.toJSON && typeof tarea.toJSON === 'function') {
                        return tarea.toJSON();
                    }
                    
                    // Si tiene _id, es un documento poblado pero sin método toJSON
                    if (tarea._id) {
                        const tareaObj = tarea.toObject ? tarea.toObject() : tarea;
                        return {
                            id: tareaObj._id.toString(),
                            name: tareaObj.name || null,
                            description: tareaObj.description || null,
                            evidences: Array.isArray(tareaObj.evidences) ? tareaObj.evidences : [],
                            state: tareaObj.state || null,
                            duration: tareaObj.duration !== undefined ? tareaObj.duration : null,
                            created_at: tareaObj.createdAt ? (typeof tareaObj.createdAt.toISOString === 'function' ? tareaObj.createdAt.toISOString() : tareaObj.createdAt) : null,
                            updated_at: tareaObj.updatedAt ? (typeof tareaObj.updatedAt.toISOString === 'function' ? tareaObj.updatedAt.toISOString() : tareaObj.updatedAt) : null
                        };
                    }
                    
                    // Si ya está transformado (tiene id y name), usarlo directamente
                    if (tarea.id && tarea.name !== undefined) {
                        return tarea;
                    }
                }
                // Si no está poblado, es solo un ID (ObjectId)
                return {
                    id: tarea ? tarea.toString() : null,
                    name: null,
                    description: null,
                    evidences: [],
                    state: null,
                    duration: null,
                    created_at: null,
                    updated_at: null
                };
            }) : [],
            responsable: ret.responsable ? (typeof ret.responsable === 'object' && ret.responsable._id ? ret.responsable._id.toString() : ret.responsable.toString()) : null,
            costo: ret.costo,
            costo_estimado: ret.costoEstimado || null,
            costo_final: ret.costoFinal || null,
            estado: ret.estado || 'pendiente',
            fecha_inicio: ret.fechaInicio ? ret.fechaInicio.toISOString() : null,
            fecha_fin: ret.fechaFin ? ret.fechaFin.toISOString() : null,
            fecha_entrega: ret.fechaEntrega ? ret.fechaEntrega.toISOString() : null,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

obraSchema.plugin(mongoosePaginate);

module.exports = model('Obra', obraSchema, 'Obras');

