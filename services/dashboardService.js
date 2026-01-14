const Obra = require('../models/Obra.js');
const ObraTarea = require('../models/ObraTarea.js');

// Función auxiliar para combinar Tarea con ObraTarea (duplicada de obraService)
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

const getDashboardData = async () => {
   // Obtener todas las obras
   const obras = await Obra.find({}).populate('tareas');
   
   // 1. Porcentaje de avance de las obras
   // Calcular para cada obra: (tareas finalizadas / total tareas) * 100
   const obrasConAvance = await Promise.all(obras.map(async (obra) => {
      const obraTareas = await ObraTarea.find({ obraId: obra._id });
      const totalTareas = obraTareas.length;
      const tareasFinalizadas = obraTareas.filter(ot => ot.state === 'finalizado').length;
      const porcentajeAvance = totalTareas > 0 ? (tareasFinalizadas / totalTareas) * 100 : 0;
      
      return {
         obraId: obra._id.toString(),
         porcentajeAvance: Math.round(porcentajeAvance * 100) / 100  // Redondear a 2 decimales
      };
   }));
   
   // Calcular porcentaje promedio general
   const porcentajePromedio = obrasConAvance.length > 0 
      ? obrasConAvance.reduce((sum, o) => sum + o.porcentajeAvance, 0) / obrasConAvance.length
      : 0;
   
   // 2. Número de obras por estado
   const obrasPorEstado = {
      pendiente: 0,
      en_proceso: 0,
      finalizado: 0,
      estancado: 0
   };
   
   obras.forEach(obra => {
      if (obra.estado && obrasPorEstado.hasOwnProperty(obra.estado)) {
         obrasPorEstado[obra.estado]++;
      }
   });
   
   // 3. Número de tareas por estado
   const tareasPorEstado = {
      pendiente: 0,
      en_proceso: 0,
      finalizado: 0,
      estancado: 0
   };
   
   // Obtener todas las relaciones ObraTarea
   const todasLasObraTareas = await ObraTarea.find({});
   
   todasLasObraTareas.forEach(obraTarea => {
      if (obraTarea.state && tareasPorEstado.hasOwnProperty(obraTarea.state)) {
         tareasPorEstado[obraTarea.state]++;
      }
   });
   
   // 4. Presupuesto Ejecutado (solo obras finalizadas)
   const obrasFinalizadas = obras.filter(obra => obra.estado === 'finalizado');
   const presupuestoEjecutado = obrasFinalizadas.reduce((sum, obra) => {
      const costo = obra.costoFinal || obra.costoEstimado || obra.costo || 0;
      return sum + costo;
   }, 0);
   
   // 5. Costo total de todas las obras (Presupuesto Proyectado)
   // Sumar costoFinal si existe, si no, sumar costoEstimado, si no, sumar costo
   const costoTotal = obras.reduce((sum, obra) => {
      const costo = obra.costoFinal || obra.costoEstimado || obra.costo || 0;
      return sum + costo;
   }, 0);
   
   // 6. Varianza Presupuestaria
   const varianzaPresupuestaria = costoTotal - presupuestoEjecutado;
   
   // 7. Clasificación por tiempo (A Tiempo, Retrasadas, Adelantadas)
   const ahora = new Date();
   let obrasATiempo = 0;
   let obrasRetrasadas = 0;
   let obrasAdelantadas = 0;
   
   obras.forEach(obra => {
      // Solo clasificar obras que tengan fechaFin (fecha planificada)
      if (!obra.fechaFin) return;
      
      const fechaFin = new Date(obra.fechaFin);
      const fechaEntrega = obra.fechaEntrega ? new Date(obra.fechaEntrega) : null;
      
      if (obra.estado === 'finalizado' && fechaEntrega) {
         // Obra finalizada: comparar fechaFin (planificada) con fechaEntrega (real)
         if (fechaEntrega < fechaFin) {
            obrasAdelantadas++; // Se entregó antes de lo planificado
         } else if (fechaEntrega > fechaFin) {
            obrasRetrasadas++; // Se entregó después de lo planificado
         } else {
            obrasATiempo++; // Se entregó exactamente en la fecha planificada
         }
      } else {
         // Obra no finalizada: comparar fechaFin (planificada) con hoy
         if (fechaFin >= ahora) {
            obrasATiempo++; // Aún está dentro del plazo
         } else {
            obrasRetrasadas++; // Ya pasó la fecha planificada y no está finalizada
         }
      }
   });
   
   // 8. Obras Recientes (últimas 5, formato completo como listObras)
   const obrasOrdenadas = obras
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
   
   // Obtener obras con formato completo (poblar tareas y responsable)
   const obrasRecientes = await Promise.all(obrasOrdenadas.map(async (obra) => {
      // Poblar responsable si existe
      if (obra.responsable) {
         await obra.populate('responsable');
      }
      
      // Poblar tareas
      await obra.populate('tareas');
      
      // Obtener relaciones ObraTarea
      const obraTareas = await ObraTarea.find({ obraId: obra._id }).populate('tareaId');
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
         costo_estimado: obraObj.costoEstimado || null,
         costo_final: obraObj.costoFinal || null,
         estado: obraObj.estado || 'pendiente',
         fecha_inicio: obraObj.fechaInicio ? obraObj.fechaInicio.toISOString() : null,
         fecha_fin: obraObj.fechaFin ? obraObj.fechaFin.toISOString() : null,
         fecha_entrega: obraObj.fechaEntrega ? obraObj.fechaEntrega.toISOString() : null,
         created_at: obraObj.createdAt ? obraObj.createdAt.toISOString() : null,
         updated_at: obraObj.updatedAt ? obraObj.updatedAt.toISOString() : null
      };
   }));
   
   return {
      porcentaje_avance_promedio: Math.round(porcentajePromedio * 100) / 100,
      obras_por_estado: obrasPorEstado,
      tareas_por_estado: tareasPorEstado,
      costo_total: costoTotal,
      presupuesto_ejecutado: presupuestoEjecutado,
      varianza_presupuestaria: varianzaPresupuestaria,
      obras_a_tiempo: obrasATiempo,
      obras_retrasadas: obrasRetrasadas,
      obras_adelantadas: obrasAdelantadas,
      obras_recientes: obrasRecientes,
      total_obras: obras.length,
      total_tareas: todasLasObraTareas.length
   };
};

module.exports = {
   getDashboardData
};
