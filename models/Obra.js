const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const tareaSchema = require("./Tarea");

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
        type: [tareaSchema],
        default: []
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
            tareas: ret.tareas ? ret.tareas.map(tarea => ({
                id: tarea._id ? tarea._id.toString() : null,
                name: tarea.name,
                description: tarea.description,
                evidences: tarea.evidences || [],
                state: tarea.state,
                duration: tarea.duration
            })) : [],
            responsable: ret.responsable ? ret.responsable.toString() : null,
            costo: ret.costo,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

obraSchema.plugin(mongoosePaginate);

module.exports = model('Obra', obraSchema, 'Obras');

