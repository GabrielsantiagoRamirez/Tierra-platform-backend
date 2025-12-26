const Obra = require('../models/Obra.js');
const Tarea = require('../models/Tarea.js').Model;

const createTarea = async (obraId, tareaData) => {
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Asegurar que evidences sea array vacío si no viene
   const newTareaData = {
      ...tareaData,
      evidences: tareaData.evidences || []
   };
   
   // Crear tarea como documento independiente
   const newTarea = new Tarea(newTareaData);
   await newTarea.save();
   
   // Agregar la tarea al array de tareas de la obra (usando el _id)
   obra.tareas.push(newTarea._id);
   obra.updatedAt = new Date();
   
   await obra.save();
   
   // Retornar la tarea recién creada
   return newTarea;
};

const listTareas = async (obraId) => {
   const obra = await Obra.findById(obraId).populate('tareas');
   
   if (!obra) {
      return null;
   }
   
   return obra.tareas;
};

const getTareaById = async (obraId, tareaId) => {
   const obra = await Obra.findById(obraId).populate('tareas');
   
   if (!obra) {
      return null;
   }
   
   // Buscar la tarea en el array poblado
   return obra.tareas.find(t => t._id.toString() === tareaId);
};

const updateTarea = async (obraId, tareaId, updateData) => {
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Verificar que la tarea pertenece a esta obra
   if (!obra.tareas.includes(tareaId)) {
      return null;
   }
   
   // Actualizar la tarea como documento independiente
   const cleanData = { ...updateData };
   cleanData.updatedAt = new Date();
   
   const tarea = await Tarea.findByIdAndUpdate(tareaId, { $set: cleanData }, { new: true });
   
   if (!tarea) {
      return null;
   }
   
   obra.updatedAt = new Date();
   await obra.save();
   
   return tarea;
};

const deleteTarea = async (obraId, tareaId) => {
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Verificar que la tarea pertenece a esta obra
   if (!obra.tareas.includes(tareaId)) {
      return null;
   }
   
   // Obtener la tarea antes de eliminarla
   const tarea = await Tarea.findById(tareaId);
   
   if (!tarea) {
      return null;
   }
   
   // Eliminar la tarea de la base de datos
   await Tarea.findByIdAndDelete(tareaId);
   
   // Remover la referencia de la obra
   obra.tareas.pull(tareaId);
   obra.updatedAt = new Date();
   
   await obra.save();
   
   return tarea;
};

module.exports = {
   createTarea,
   listTareas,
   getTareaById,
   updateTarea,
   deleteTarea
};

