const Obra = require('../models/Obra.js');
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
   // Estado inicial siempre será 'pendiente' (todas las tareas empiezan pendientes)
   const obraDataWithRefs = {
      ...cleanData,
      tareas: tareasIds,
      estado: 'pendiente'
   };
   
   const newObra = new Obra(obraDataWithRefs);
   await newObra.save();
   
   // Crear relaciones ObraTarea para cada tarea
   const obraTareasPromises = tareasIds.map(tareaId => {
      return ObraTarea.create({
         obraId: newObra._id,
         tareaId: tareaId,
         state: 'pendiente',
         evidences: [],
         observation: ""
      });
   });
   
   await Promise.all(obraTareasPromises);
   
   // Retornar la obra con las tareas pobladas y combinadas con ObraTarea
   const obra = await Obra.findById(newObra._id)
      .populate('responsable')
      .populate('tareas')
      .lean(false);
   
   // Obtener relaciones ObraTarea
   const obraTareas = await ObraTarea.find({ obraId: newObra._id }).populate('tareaId');
   const obraTareaMap = {};
   obraTareas.forEach(ot => {
      if (ot.tareaId) {
         obraTareaMap[ot.tareaId._id.toString()] = ot;
      }
   });
   
   // Combinar tareas con ObraTarea
   const tareasCombinadas = obra.tareas.map(tarea => {
      const obraTarea = obraTareaMap[tarea._id.toString()];
      return combineTareaWithObraTarea(tarea, obraTarea);
   });
   
   // Convertir a objeto plano para evitar que toJSON interfiera
   const obraObj = obra.toObject ? obra.toObject() : obra;
   
   // Formatear responsable si existe
   let responsableFormateado = null;
   if (obraObj.responsable) {
      if (typeof obraObj.responsable === 'object' && obraObj.responsable._id) {
         // Si está poblado, retornar objeto completo usando toJSON si existe
         if (obraObj.responsable.toJSON) {
            responsableFormateado = obraObj.responsable.toJSON();
         } else {
            responsableFormateado = {
               id: obraObj.responsable._id.toString(),
               type: obraObj.responsable.type || null,
               name: obraObj.responsable.name || null,
               lastname: obraObj.responsable.lastname || null,
               email: obraObj.responsable.email || null,
               phone: obraObj.responsable.phone || null,
               city: obraObj.responsable.city || null,
               dni: obraObj.responsable.dni || null,
               created_at: obraObj.responsable.createdAt ? obraObj.responsable.createdAt.toISOString() : null,
               updated_at: obraObj.responsable.updatedAt ? obraObj.responsable.updatedAt.toISOString() : null
            };
         }
      } else {
         // Si es solo ID, retornar el ID
         responsableFormateado = obraObj.responsable.toString();
      }
   }
   
   // Retornar objeto plano con formato correcto
   return {
      id: obraObj._id.toString(),
      title: obraObj.title,
      description: obraObj.description || null,
      location: obraObj.location || null,
      city: obraObj.city || null,
      tareas: tareasCombinadas, // Ya están combinadas y formateadas
      responsable: responsableFormateado,
      costo: obraObj.costo || null,
      estado: obraObj.estado || 'pendiente',
      fecha_inicio: obraObj.fechaInicio ? obraObj.fechaInicio.toISOString() : null,
      fecha_fin: obraObj.fechaFin ? obraObj.fechaFin.toISOString() : null,
      fecha_entrega: obraObj.fechaEntrega ? obraObj.fechaEntrega.toISOString() : null,
      created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
      updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
   };
};

const listObras = async (page = 1, limit = 10, estadoFiltro = null, sortBy = 'createdAt', sortOrder = 'desc') => {
   // Construir query según filtro de estado
   let query = {};
   
   if (estadoFiltro === 'activas') {
      query.estado = { $in: ['pendiente', 'en_proceso'] };
   } else if (estadoFiltro === 'finalizadas') {
      query.estado = 'finalizado';
   }
   
   // Ordenamiento (por defecto: más recientes primero)
   const sort = {};
   const validSortFields = ['createdAt', 'updatedAt', 'title', 'costo', 'estado'];
   const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
   sort[field] = sortOrder === 'asc' ? 1 : -1;
   
   const result = await Obra.paginate(query, { page, limit, populate: ['responsable', 'tareas'], sort });
   
   // Para cada obra, combinar tareas con ObraTarea
   const obrasConTareasCompletas = await Promise.all(result.docs.map(async (obra) => {
      const obraTareas = await ObraTarea.find({ obraId: obra._id }).populate('tareaId');
      const obraTareaMap = {};
      obraTareas.forEach(ot => {
         if (ot.tareaId) {
            obraTareaMap[ot.tareaId._id.toString()] = ot;
         }
      });
      
      const tareasCombinadas = obra.tareas.map(tarea => {
         const obraTarea = obraTareaMap[tarea._id.toString()];
         return combineTareaWithObraTarea(tarea, obraTarea);
      });
      
      const obraObj = obra.toObject ? obra.toObject() : obra;
      
      // Formatear responsable
      let responsableFormateado = null;
      if (obraObj.responsable) {
         if (typeof obraObj.responsable === 'object' && obraObj.responsable._id) {
            if (obraObj.responsable.toJSON) {
               responsableFormateado = obraObj.responsable.toJSON();
            } else {
               responsableFormateado = {
                  id: obraObj.responsable._id.toString(),
                  type: obraObj.responsable.type || null,
                  name: obraObj.responsable.name || null,
                  lastname: obraObj.responsable.lastname || null,
                  email: obraObj.responsable.email || null,
                  phone: obraObj.responsable.phone || null,
                  city: obraObj.responsable.city || null,
                  dni: obraObj.responsable.dni || null,
                  created_at: obraObj.responsable.createdAt ? obraObj.responsable.createdAt.toISOString() : null,
                  updated_at: obraObj.responsable.updatedAt ? obraObj.responsable.updatedAt.toISOString() : null
               };
            }
         } else {
            responsableFormateado = obraObj.responsable.toString();
         }
      }
      
      return {
         id: obraObj._id.toString(),
         title: obraObj.title,
         description: obraObj.description || null,
         location: obraObj.location || null,
         city: obraObj.city || null,
         tareas: tareasCombinadas,
         responsable: responsableFormateado,
         costo: obraObj.costo || null,
         estado: obraObj.estado || 'pendiente',
         fecha_inicio: obraObj.fechaInicio ? obraObj.fechaInicio.toISOString() : null,
         fecha_fin: obraObj.fechaFin ? obraObj.fechaFin.toISOString() : null,
         fecha_entrega: obraObj.fechaEntrega ? obraObj.fechaEntrega.toISOString() : null,
         created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
         updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
      };
   }));
   
   return {
      ...result,
      docs: obrasConTareasCompletas
   };
};

const getObraById = async (id) => {
   const obra = await Obra.findById(id).populate(['responsable', 'tareas']);
   
   if (!obra) {
      return null;
   }
   
   // Obtener relaciones ObraTarea
   const obraTareas = await ObraTarea.find({ obraId: id }).populate('tareaId');
   const obraTareaMap = {};
   obraTareas.forEach(ot => {
      if (ot.tareaId) {
         obraTareaMap[ot.tareaId._id.toString()] = ot;
      }
   });
   
   // Combinar tareas con ObraTarea
   const tareasCombinadas = obra.tareas.map(tarea => {
      const obraTarea = obraTareaMap[tarea._id.toString()];
      return combineTareaWithObraTarea(tarea, obraTarea);
   });
   
   const obraObj = obra.toObject ? obra.toObject() : obra;
   
   // Formatear responsable
   let responsableFormateado = null;
   if (obraObj.responsable) {
      if (typeof obraObj.responsable === 'object' && obraObj.responsable._id) {
         if (obraObj.responsable.toJSON) {
            responsableFormateado = obraObj.responsable.toJSON();
         } else {
            responsableFormateado = {
               id: obraObj.responsable._id.toString(),
               type: obraObj.responsable.type || null,
               name: obraObj.responsable.name || null,
               lastname: obraObj.responsable.lastname || null,
               email: obraObj.responsable.email || null,
               phone: obraObj.responsable.phone || null,
               city: obraObj.responsable.city || null,
               dni: obraObj.responsable.dni || null,
               created_at: obraObj.responsable.createdAt ? obraObj.responsable.createdAt.toISOString() : null,
               updated_at: obraObj.responsable.updatedAt ? obraObj.responsable.updatedAt.toISOString() : null
            };
         }
      } else {
         responsableFormateado = obraObj.responsable.toString();
      }
   }
   
   return {
      id: obraObj._id.toString(),
      title: obraObj.title,
      description: obraObj.description || null,
      location: obraObj.location || null,
      city: obraObj.city || null,
      tareas: tareasCombinadas,
      responsable: responsableFormateado,
      costo: obraObj.costo || null,
      estado: obraObj.estado || 'pendiente',
      fecha_inicio: obraObj.fechaInicio ? obraObj.fechaInicio.toISOString() : null,
      fecha_fin: obraObj.fechaFin ? obraObj.fechaFin.toISOString() : null,
      fecha_entrega: obraObj.fechaEntrega ? obraObj.fechaEntrega.toISOString() : null,
      created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
      updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
   };
};

const updateObra = async (id, updateData) => {
   const cleanData = { ...updateData };
   delete cleanData.id;
   delete cleanData._id;
   
   const obra = await Obra.findById(id);
   if (!obra) {
      return null;
   }
   
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
      
      // Obtener tareas actuales
      const tareasActuales = obra.tareas.map(t => t.toString());
      const tareasNuevas = tareasIds.map(t => t.toString());
      
      // Encontrar tareas a eliminar (están en actuales pero no en nuevas)
      const tareasAEliminar = tareasActuales.filter(t => !tareasNuevas.includes(t));
      
      // Encontrar tareas a agregar (están en nuevas pero no en actuales)
      const tareasAAgregar = tareasNuevas.filter(t => !tareasActuales.includes(t));
      
      // Eliminar relaciones ObraTarea para tareas removidas
      if (tareasAEliminar.length > 0) {
         await ObraTarea.deleteMany({ 
            obraId: id, 
            tareaId: { $in: tareasAEliminar } 
         });
      }
      
      // Crear relaciones ObraTarea para tareas nuevas
      if (tareasAAgregar.length > 0) {
         const nuevasObraTareas = tareasAAgregar.map(tareaId => ({
            obraId: id,
            tareaId: tareaId,
            state: 'pendiente',
            evidences: [],
            observation: ""
         }));
         await ObraTarea.insertMany(nuevasObraTareas);
      }
      
      // Recalcular el estado de la obra basado en todas las tareas
      const todasLasObraTareas = await ObraTarea.find({ obraId: id });
      const nuevoEstadoObra = calcularEstadoObra(todasLasObraTareas);
      cleanData.estado = nuevoEstadoObra;
   }
   
   cleanData.updatedAt = new Date();
   
   const obraActualizada = await Obra.findByIdAndUpdate(id, { $set: cleanData }, { new: true })
      .populate(['responsable', 'tareas']);
   
   // Obtener relaciones ObraTarea actualizadas
   const obraTareas = await ObraTarea.find({ obraId: id }).populate('tareaId');
   const obraTareaMap = {};
   obraTareas.forEach(ot => {
      if (ot.tareaId) {
         obraTareaMap[ot.tareaId._id.toString()] = ot;
      }
   });
   
   // Combinar tareas con ObraTarea
   const tareasCombinadas = obraActualizada.tareas.map(tarea => {
      const obraTarea = obraTareaMap[tarea._id.toString()];
      return combineTareaWithObraTarea(tarea, obraTarea);
   });
   
   const obraObj = obraActualizada.toObject ? obraActualizada.toObject() : obraActualizada;
   
   // Formatear responsable
   let responsableFormateado = null;
   if (obraObj.responsable) {
      if (typeof obraObj.responsable === 'object' && obraObj.responsable._id) {
         if (obraObj.responsable.toJSON) {
            responsableFormateado = obraObj.responsable.toJSON();
         } else {
            responsableFormateado = {
               id: obraObj.responsable._id.toString(),
               type: obraObj.responsable.type || null,
               name: obraObj.responsable.name || null,
               lastname: obraObj.responsable.lastname || null,
               email: obraObj.responsable.email || null,
               phone: obraObj.responsable.phone || null,
               city: obraObj.responsable.city || null,
               dni: obraObj.responsable.dni || null,
               created_at: obraObj.responsable.createdAt ? obraObj.responsable.createdAt.toISOString() : null,
               updated_at: obraObj.responsable.updatedAt ? obraObj.responsable.updatedAt.toISOString() : null
            };
         }
      } else {
         responsableFormateado = obraObj.responsable.toString();
      }
   }
   
   return {
      id: obraObj._id.toString(),
      title: obraObj.title,
      description: obraObj.description || null,
      location: obraObj.location || null,
      city: obraObj.city || null,
      tareas: tareasCombinadas,
      responsable: responsableFormateado,
      costo: obraObj.costo || null,
      estado: obraObj.estado || 'pendiente',
      fecha_inicio: obraObj.fechaInicio ? obraObj.fechaInicio.toISOString() : null,
      fecha_fin: obraObj.fechaFin ? obraObj.fechaFin.toISOString() : null,
      fecha_entrega: obraObj.fechaEntrega ? obraObj.fechaEntrega.toISOString() : null,
      created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
      updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
   };
};

const deleteObra = async (id) => {
   // Eliminar todas las relaciones ObraTarea asociadas
   await ObraTarea.deleteMany({ obraId: id });
   
   // Eliminar la obra
   return await Obra.findByIdAndDelete(id);
};

const actualizarEstadosObras = async () => {
   // Obtener todas las obras
   const obras = await Obra.find({});
   
   let actualizadas = 0;
   let noActualizadas = 0;
   
   // Para cada obra, calcular y actualizar su estado
   for (const obra of obras) {
      try {
         // Obtener todas las relaciones ObraTarea de esta obra
         const obraTareas = await ObraTarea.find({ obraId: obra._id });
         
         // Calcular el nuevo estado
         const nuevoEstado = calcularEstadoObra(obraTareas);
         
         // Actualizar el estado de la obra
         obra.estado = nuevoEstado;
         obra.updatedAt = new Date();
         await obra.save();
         
         actualizadas++;
      } catch (error) {
         console.error(`Error actualizando obra ${obra._id}:`, error);
         noActualizadas++;
      }
   }
   
   return {
      total: obras.length,
      actualizadas,
      noActualizadas
   };
};

module.exports = {
   createObra,
   listObras,
   getObraById,
   updateObra,
   deleteObra,
   actualizarEstadosObras
};
