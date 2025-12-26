const Obra = require('../models/Obra.js');
const Tarea = require('../models/Tarea.js').Model;

const createObra = async (obraData) => {
   const cleanData = { ...obraData };
   delete cleanData.id;
   delete cleanData._id;
   
   // Validar que tenga al menos una tarea
   if (!cleanData.tareas || !Array.isArray(cleanData.tareas) || cleanData.tareas.length === 0) {
      throw new Error('Obra must have at least one tarea');
   }
   
   // Las tareas deben ser solo IDs (strings)
   // Si vienen como objetos, extraer solo los IDs
   let tareasIds = cleanData.tareas.map(tarea => {
      // Si es un objeto, extraer el id o _id
      if (typeof tarea === 'object' && tarea !== null) {
         return tarea.id || tarea._id || tarea;
      }
      // Si ya es un string (ID), usarlo directamente
      return tarea;
   });
   
   // Validar que todas las tareas existan en la base de datos
   const tareasExistentes = await Tarea.find({ _id: { $in: tareasIds } });
   
   if (tareasExistentes.length !== tareasIds.length) {
      throw new Error('One or more tareas do not exist');
   }
   
   // Crear la obra con referencias a las tareas (solo IDs)
   const obraDataWithRefs = {
      ...cleanData,
      tareas: tareasIds
   };
   
   const newObra = new Obra(obraDataWithRefs);
   await newObra.save();
   
   // Retornar la obra con las tareas pobladas
   // Usar lean: false para mantener los métodos de Mongoose y que funcione el populate correctamente
   return await Obra.findById(newObra._id)
      .populate('responsable')
      .populate('tareas')
      .lean(false);
};

const listObras = async (page = 1, limit = 10) => {
   return await Obra.paginate({}, { page, limit, populate: ['responsable', 'tareas'] });
};

const getObraById = async (id) => {
   return await Obra.findById(id).populate(['responsable', 'tareas']);
};

const updateObra = async (id, updateData) => {
   const cleanData = { ...updateData };
   delete cleanData.id;
   delete cleanData._id;
   
   // Si se actualizan tareas, validar que sean IDs existentes
   if (cleanData.tareas && Array.isArray(cleanData.tareas)) {
      // Extraer IDs si vienen como objetos
      let tareasIds = cleanData.tareas.map(tarea => {
         if (typeof tarea === 'object' && tarea !== null) {
            return tarea.id || tarea._id || tarea;
         }
         return tarea;
      });
      
      // Validar que todas las tareas existan
      const tareasExistentes = await Tarea.find({ _id: { $in: tareasIds } });
      
      if (tareasExistentes.length !== tareasIds.length) {
         throw new Error('One or more tareas do not exist');
      }
      
      cleanData.tareas = tareasIds;
   }
   
   cleanData.updatedAt = new Date();
   
   return await Obra.findByIdAndUpdate(id, { $set: cleanData }, { new: true }).populate(['responsable', 'tareas']);
};

const deleteObra = async (id) => {
   return await Obra.findByIdAndDelete(id);
};

module.exports = {
   createObra,
   listObras,
   getObraById,
   updateObra,
   deleteObra
};

