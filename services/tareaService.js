const Obra = require('../models/Obra.js');
const Tarea = require('../models/Tarea.js').Model;
const ObraTarea = require('../models/ObraTarea.js');

// Función auxiliar para combinar Tarea con ObraTarea
const combineTareaWithObraTarea = (tarea, obraTarea) => {
   if (!tarea) return null;
   
   const tareaObj = tarea.toObject ? tarea.toObject() : tarea;
   const obraTareaObj = obraTarea ? (obraTarea.toObject ? obraTarea.toObject() : obraTarea) : null;
   
   return {
      id: tareaObj._id.toString(),
      obra_tarea_id: obraTareaObj ? obraTareaObj._id.toString() : null,
      name: tareaObj.name,
      description: tareaObj.description || null,
      evidences: obraTareaObj ? (obraTareaObj.evidences || []) : [],
      state: obraTareaObj ? obraTareaObj.state : 'pendiente',
      duration: tareaObj.duration !== undefined ? tareaObj.duration : null,
      observation: obraTareaObj ? (obraTareaObj.observation || "") : "",
      costo: obraTareaObj ? (obraTareaObj.costo || null) : null,
      created_at: tareaObj.createdAt ? tareaObj.createdAt.toISOString() : null,
      updated_at: obraTareaObj && obraTareaObj.updatedAt ? obraTareaObj.updatedAt.toISOString() : (tareaObj.updatedAt ? tareaObj.updatedAt.toISOString() : null)
   };
};

const createTarea = async (obraId, tareaData) => {
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Separar datos de Tarea de datos de ObraTarea
   const { state, evidences, observation, ...tareaFields } = tareaData;
   
   // Asegurar que evidences sea array vacío si no viene
   // La observación NO se guarda en la tarea base, solo en ObraTarea (específica por obra)
   const newTareaData = {
      ...tareaFields,
      evidences: [] // Las evidencias ahora van en ObraTarea
      // observation NO se incluye aquí, va solo en ObraTarea
   };
   
   // Crear tarea como documento independiente
   const newTarea = new Tarea(newTareaData);
   await newTarea.save();
   
   // Agregar la tarea al array de tareas de la obra (usando el _id)
   obra.tareas.push(newTarea._id);
   obra.updatedAt = new Date();
   await obra.save();
   
   // Crear relación ObraTarea con estado y evidencias específicos
   const obraTarea = new ObraTarea({
      obraId: obra._id,
      tareaId: newTarea._id,
      state: state || 'pendiente',
      evidences: evidences || [],
      observation: observation || ""
   });
   await obraTarea.save();
   
   // Retornar tarea combinada con información de ObraTarea
   return combineTareaWithObraTarea(newTarea, obraTarea);
};

const listTareas = async (obraId) => {
   const obra = await Obra.findById(obraId).populate('tareas');
   
   if (!obra) {
      return null;
   }
   
   // Obtener todas las relaciones ObraTarea para esta obra
   const obraTareas = await ObraTarea.find({ obraId: obra._id }).populate('tareaId');
   
   // Crear un mapa de tareaId -> ObraTarea para acceso rápido
   const obraTareaMap = {};
   obraTareas.forEach(ot => {
      obraTareaMap[ot.tareaId._id.toString()] = ot;
   });
   
   // Combinar tareas con sus relaciones ObraTarea
   return obra.tareas.map(tarea => {
      const obraTarea = obraTareaMap[tarea._id.toString()];
      return combineTareaWithObraTarea(tarea, obraTarea);
   });
};

const getTareaById = async (obraId, tareaId) => {
   const obra = await Obra.findById(obraId);
   
   if (!obra) {
      return null;
   }
   
   // Verificar que la tarea pertenece a esta obra
   if (!obra.tareas.includes(tareaId)) {
      return null;
   }
   
   // Obtener la tarea
   const tarea = await Tarea.findById(tareaId);
   if (!tarea) {
      return null;
   }
   
   // Obtener la relación ObraTarea
   const obraTarea = await ObraTarea.findOne({ obraId: obra._id, tareaId: tareaId });
   
   return combineTareaWithObraTarea(tarea, obraTarea);
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
   
   // Separar campos de Tarea de campos de ObraTarea
   const { state, evidences, observation, ...tareaFields } = updateData;
   
   // Actualizar la tarea base (solo campos de Tarea: name, description, duration, observation base)
   if (Object.keys(tareaFields).length > 0) {
      tareaFields.updatedAt = new Date();
      await Tarea.findByIdAndUpdate(tareaId, { $set: tareaFields }, { new: true });
   }
   
   // Actualizar ObraTarea si se enviaron campos específicos de la relación
   const obraTareaUpdate = {};
   if (state !== undefined) obraTareaUpdate.state = state;
   if (evidences !== undefined) obraTareaUpdate.evidences = evidences;
   if (observation !== undefined) obraTareaUpdate.observation = observation;
   
   if (Object.keys(obraTareaUpdate).length > 0) {
      obraTareaUpdate.updatedAt = new Date();
      await ObraTarea.findOneAndUpdate(
         { obraId: obra._id, tareaId: tareaId },
         { $set: obraTareaUpdate },
         { new: true, upsert: true }
      );
   }
   
   obra.updatedAt = new Date();
   await obra.save();
   
   // Obtener tarea y obraTarea actualizados
   const tarea = await Tarea.findById(tareaId);
   const obraTarea = await ObraTarea.findOne({ obraId: obra._id, tareaId: tareaId });
   
   return combineTareaWithObraTarea(tarea, obraTarea);
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
   
   // Obtener la tarea antes de eliminar la relación
   const tarea = await Tarea.findById(tareaId);
   if (!tarea) {
      return null;
   }
   
   // Eliminar la relación ObraTarea (no la tarea en sí, puede estar en otras obras)
   await ObraTarea.findOneAndDelete({ obraId: obra._id, tareaId: tareaId });
   
   // Remover la referencia de la obra
   obra.tareas.pull(tareaId);
   obra.updatedAt = new Date();
   await obra.save();
   
   // Verificar si la tarea está en otras obras
   const otrasObras = await Obra.find({ tareas: tareaId });
   
   // Si la tarea no está en ninguna otra obra, eliminarla
   if (otrasObras.length === 0) {
      await Tarea.findByIdAndDelete(tareaId);
   }
   
   // Retornar información de la tarea eliminada
   const obraTarea = await ObraTarea.findOne({ obraId: obra._id, tareaId: tareaId });
   return combineTareaWithObraTarea(tarea, obraTarea);
};

module.exports = {
   createTarea,
   listTareas,
   getTareaById,
   updateTarea,
   deleteTarea
};
