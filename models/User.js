const { Schema, model } = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const bcrypt = require("bcrypt");


const userSchema = new Schema({
    type: {
        type: String,
        enum: ['admin', 'master'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    phone: {
        type: Number,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    dni: {
        type: Number,
        required: true
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

userSchema.pre('save', async function(next) {
    // Solo encriptar si la contraseña fue modificada o es nueva
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        // Encriptar contraseña con bcrypt (10 rounds)
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});


userSchema.pre('save', function(next) {
    if (this.id !== undefined) {
        this.set('id', undefined, { strict: false });
        delete this.id;
    }
    next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};


userSchema.set('toJSON', {
    transform: function(doc, ret) {
        return {
            id: ret._id.toString(),
            type: ret.type,
            name: ret.name,
            lastname: ret.lastname,
            email: ret.email,
            phone: ret.phone,
            city: ret.city,
            dni: ret.dni,
            created_at: ret.createdAt ? ret.createdAt.toISOString() : null,
            updated_at: ret.updatedAt ? ret.updatedAt.toISOString() : null
        };
    }
});

userSchema.plugin(mongoosePaginate);

module.exports = model('User', userSchema, 'Users');

