const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const reportePdfSchema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    obraId: {
        type: Schema.Types.ObjectId,
        ref: 'Obra',
        required: true,
        index: true
    },
    clave: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    url: {
        type: String,
        required: true
    },
    nombre: {
        type: String,
        required: true
    },
    fecha_generacion: {
        type: Date,
        required: true
    },
    tamaño: {
        type: Number,
        default: null
    },
    version: {
        type: Number,
        default: 1
    },
    generatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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

// Índices para búsquedas rápidas
reportePdfSchema.index({ obraId: 1, createdAt: -1 }); // Para listar reportes de una obra ordenados por fecha
reportePdfSchema.index({ clave: 1 }); // Ya está como unique, pero útil para búsquedas

// Hook pre-save: eliminar campo 'id' si existe
reportePdfSchema.pre('save', function(next) {
    if (this.id !== undefined) {
        this.set('id', undefined, { strict: false });
        delete this.id;
    }
    // Actualizar updatedAt si el documento existe
    if (!this.isNew) {
        this.updatedAt = new Date();
    }
    next();
});

// Transformar a snake_case para compatibilidad con Flutter
reportePdfSchema.set('toJSON', {
    transform: function(doc, ret) {
        return {
            id: ret._id.toString(),
            obra_id: ret.obraId ? ret.obraId.toString() : null,
            clave: ret.clave,
            url: ret.url,
            nombre: ret.nombre,
            fecha_generacion: ret.fecha_generacion ? ret.fecha_generacion.toISOString() : null,
            tamaño: ret.tamaño || null,
            version: ret.version || 1,
            generated_by: ret.generatedBy ? ret.generatedBy.toString() : null,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

reportePdfSchema.plugin(mongoosePaginate);

module.exports = model('ReportePdf', reportePdfSchema, 'ReportesPdf');
