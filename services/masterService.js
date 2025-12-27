const Obra = require('../models/Obra.js');
const User = require('../models/User.js');
const Tarea = require('../models/Tarea.js').Model;


const getResponsable = async (userType, userId) => {
   // Buscar el usuario autenticado
   const user = await User.findById(userId);
   
   if (!user) {
      return null;
   }
   
   let obras;
   
   // Lógica condicional según tipo de usuario
   if (userType === 'admin') {
      // Si es admin: traer TODAS las obras
      obras = await Obra.find({}).populate('tareas').populate('responsable');
   } else if (userType === 'master') {
      // Si es master: traer solo las obras donde él es responsable
      obras = await Obra.find({ responsable: userId }).populate('tareas');
   } else {
      // Tipo de usuario no válido
      throw new Error('Invalid user type');
   }
   
   // Retornar usuario con sus obras (que ya incluyen las tareas)
   return {
      user: user,
      obras: obras
   };
};


const updateTareaEstado = async (obraId, tareaId, newState) => {
   // Validar que el estado sea válido
   const validStates = ['pendiente', 'en_proceso', 'finalizado'];
   if (!validStates.includes(newState)) {
      throw new Error(`Invalid state. Must be one of: ${validStates.join(', ')}`);
   }
   
   // Buscar la obra
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Verificar que la tarea pertenece a esta obra
   if (!obra.tareas.includes(tareaId)) {
      return null;
   }
   
   // Actualizar la tarea como documento independiente
   const tarea = await Tarea.findByIdAndUpdate(
      tareaId,
      { $set: { state: newState, updatedAt: new Date() } },
      { new: true }
   );
   
   if (!tarea) {
      return null;
   }
   
   // Actualizar updatedAt de la obra
   obra.updatedAt = new Date();
   await obra.save();
   
   return obra;
};

const addImagenTarea = async (obraId, tareaId, imageUrl) => {
   // Validar que sea una URL válida (básico)
   if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      throw new Error('Invalid image URL');
   }
   
   // Buscar la obra
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Verificar que la tarea pertenece a esta obra
   if (!obra.tareas.includes(tareaId)) {
      return null;
   }
   
   // Buscar la tarea
   const tarea = await Tarea.findById(tareaId);
   
   if (!tarea) {
      return null;
   }
   
   // Agregar la URL al array de evidencias (si no existe ya)
   if (!tarea.evidences) {
      tarea.evidences = [];
   }
   
   // Evitar duplicados
   if (!tarea.evidences.includes(imageUrl)) {
      tarea.evidences.push(imageUrl);
      tarea.updatedAt = new Date();
      await tarea.save();
   }
   
   // Actualizar updatedAt de la obra
   obra.updatedAt = new Date();
   await obra.save();
   
   return obra;
};

module.exports = {
   getResponsable,
   updateTareaEstado,
   addImagenTarea
};

