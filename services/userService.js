const User = require('../models/User.js');

/**
 * Registra un nuevo usuario
 * @param {Object} userData - Datos del usuario (ya normalizados)
 * @returns {Promise<Object>} Usuario creado
 */
const registerUser = async (userData) => {
    // Asegurar que no se intente guardar id o _id
    const cleanData = { ...userData };
    delete cleanData.id;
    delete cleanData._id;
    
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: cleanData.email });
    if (existingUser) {
        throw new Error('Email already exists');
    }
    
    // Crear nuevo usuario (la contraseña se encriptará en el pre-save hook)
    const newUser = new User(cleanData);
    return await newUser.save();
};

/**
 * Autentica un usuario con email y contraseña
 * @param {String} email - Email del usuario
 * @param {String} password - Contraseña del usuario
 * @returns {Promise<Object|null>} Usuario autenticado o null
 */
const loginUser = async (email, password) => {
    // Buscar usuario por email e incluir password (select: false por defecto)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
        return null;
    }
    
    // Comparar contraseña
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
        return null;
    }
    
    // Retornar usuario sin password
    return user;
};

/**
 * Obtiene un usuario por su ID
 * @param {String} id - ID del usuario (_id de MongoDB)
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const getUserById = async (id) => {
    return await User.findById(id);
};

/**
 * Obtiene un usuario por su email
 * @param {String} email - Email del usuario
 * @returns {Promise<Object|null>} Usuario encontrado o null
 */
const getUserByEmail = async (email) => {
    return await User.findOne({ email: email.toLowerCase() });
};

module.exports = {
    registerUser,
    loginUser,
    getUserById,
    getUserByEmail
};

