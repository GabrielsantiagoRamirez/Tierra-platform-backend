const Obra = require('../models/Obra.js');
const User = require('../models/User.js');
const Tarea = require('../models/Tarea.js').Model;


const getResponsable = async (userId) => {
   // Buscar el usuario
   const user = await User.findById(userId);
   
   if (!user) {
      return null;
   }
   
   // Buscar todas las obras donde este usuario es responsable y poblar tareas
   const obras = await Obra.find({ responsable: userId }).populate('tareas');
   
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

