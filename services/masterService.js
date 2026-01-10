const Obra = require('../models/Obra.js');
const User = require('../models/User.js');
const Tarea = require('../models/Tarea.js').Model;
const ObraTarea = require('../models/ObraTarea.js');

// Función helper para calcular el estado de la obra basado en el estado de sus tareas
const calcularEstadoObra = (obraTareas) => {
   if (!obraTareas || obraTareas.length === 0) {
      return 'pendiente';
   }
   
   const estados = obraTareas.map(ot => ot.state || 'pendiente');
   const todosFinalizados = estados.every(s => s === 'finalizado');
   const algunoEnProceso = estados.some(s => s === 'en_proceso');
   
   if (todosFinalizados) return 'finalizado';
   if (algunoEnProceso) return 'en_proceso';
   return 'pendiente';
};

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
      created_at: tareaObj.createdAt ? tareaObj.createdAt.toISOString() : null,
      updated_at: obraTareaObj && obraTareaObj.updatedAt ? obraTareaObj.updatedAt.toISOString() : (tareaObj.updatedAt ? tareaObj.updatedAt.toISOString() : null)
   };
};

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
      obras = await Obra.find({ responsable: userId }).populate('tareas').populate('responsable');
   } else {
      // Tipo de usuario no válido
      throw new Error('Invalid user type');
   }
   
   // Para cada obra, combinar tareas con sus relaciones ObraTarea
   const obrasConTareasCompletas = await Promise.all(obras.map(async (obra) => {
      const obraObj = obra.toObject ? obra.toObject() : obra;
      
      // Obtener todas las relaciones ObraTarea para esta obra
      const obraTareas = await ObraTarea.find({ obraId: obra._id }).populate('tareaId');
      
      // Crear un mapa de tareaId -> ObraTarea
      const obraTareaMap = {};
      obraTareas.forEach(ot => {
         if (ot.tareaId) {
            obraTareaMap[ot.tareaId._id.toString()] = ot;
         }
      });
      
      // Combinar tareas con sus relaciones ObraTarea
      const tareasCompletas = obra.tareas.map(tarea => {
         const obraTarea = obraTareaMap[tarea._id.toString()];
         return combineTareaWithObraTarea(tarea, obraTarea);
      });
      
      return {
         ...obraObj,
         id: obraObj._id.toString(),
         tareas: tareasCompletas,
         responsable: obraObj.responsable ? (typeof obraObj.responsable === 'object' && obraObj.responsable._id ? obraObj.responsable._id.toString() : obraObj.responsable.toString()) : null,
         created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
         updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
      };
   }));
   
   // Retornar usuario con sus obras (que ya incluyen las tareas combinadas)
   return {
      user: user,
      obras: obrasConTareasCompletas
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
   
   // Actualizar o crear la relación ObraTarea con el nuevo estado
   const obraTarea = await ObraTarea.findOneAndUpdate(
      { obraId: obra._id, tareaId: tareaId },
      { 
         $set: { 
            state: newState, 
            updatedAt: new Date() 
         } 
      },
      { new: true, upsert: true }
   );
   
   if (!obraTarea) {
      return null;
   }
   
   // Obtener TODAS las tareas de esta obra para recalcular el estado
   const todasLasObraTareas = await ObraTarea.find({ obraId: obra._id });
   
   // Calcular el nuevo estado de la obra basado en todas las tareas
   const nuevoEstadoObra = calcularEstadoObra(todasLasObraTareas);
   
   // Actualizar el estado de la obra
   obra.estado = nuevoEstadoObra;
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
   
   // Buscar o crear la relación ObraTarea
   let obraTarea = await ObraTarea.findOne({ obraId: obra._id, tareaId: tareaId });
   
   if (!obraTarea) {
      // Si no existe, crearla
      obraTarea = new ObraTarea({
         obraId: obra._id,
         tareaId: tareaId,
         state: 'pendiente',
         evidences: [],
         observation: ""
      });
   }
   
   // Inicializar evidences si no existe
   if (!obraTarea.evidences) {
      obraTarea.evidences = [];
   }
   
   // Evitar duplicados
   if (!obraTarea.evidences.includes(imageUrl)) {
      obraTarea.evidences.push(imageUrl);
      obraTarea.updatedAt = new Date();
      await obraTarea.save();
   }
   
   // Actualizar updatedAt de la obra
   obra.updatedAt = new Date();
   await obra.save();
   
   return obra;
};

const listObraTareas = async (page = 1, limit = 10) => {
   const result = await ObraTarea.paginate(
      {}, 
      { 
         page, 
         limit, 
         populate: ['obraId', 'tareaId'],
         sort: { createdAt: -1 }
      }
   );
   
   // Formatear resultados
   const formattedDocs = result.docs.map(doc => {
      const docObj = doc.toObject ? doc.toObject() : doc;
      return {
         id: docObj._id.toString(),
         obra_id: docObj.obraId ? (typeof docObj.obraId === 'object' ? docObj.obraId._id.toString() : docObj.obraId.toString()) : null,
         tarea_id: docObj.tareaId ? (typeof docObj.tareaId === 'object' ? docObj.tareaId._id.toString() : docObj.tareaId.toString()) : null,
         state: docObj.state,
         evidences: docObj.evidences || [],
         observation: docObj.observation || "",
         created_at: docObj.createdAt ? docObj.createdAt.toISOString() : null,
         updated_at: docObj.updatedAt ? docObj.updatedAt.toISOString() : null
      };
   });
   
   return {
      ...result,
      docs: formattedDocs
   };
};

const getObraTareaById = async (id) => {
   const obraTarea = await ObraTarea.findById(id)
      .populate('obraId')
      .populate('tareaId');
   
   if (!obraTarea) {
      return null;
   }
   
   const docObj = obraTarea.toObject ? obraTarea.toObject() : obraTarea;
   
   return {
      id: docObj._id.toString(),
      obra_id: docObj.obraId ? (typeof docObj.obraId === 'object' ? docObj.obraId._id.toString() : docObj.obraId.toString()) : null,
      tarea_id: docObj.tareaId ? (typeof docObj.tareaId === 'object' ? docObj.tareaId._id.toString() : docObj.tareaId.toString()) : null,
      state: docObj.state,
      evidences: docObj.evidences || [],
      observation: docObj.observation || "",
      created_at: docObj.createdAt ? docObj.createdAt.toISOString() : null,
      updated_at: docObj.updatedAt ? docObj.updatedAt.toISOString() : null
   };
};

module.exports = {
   getResponsable,
   updateTareaEstado,
   addImagenTarea,
   listObraTareas,
   getObraTareaById
};
